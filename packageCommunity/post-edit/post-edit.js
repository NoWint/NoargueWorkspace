const app = getApp();
const { communityApi } = require('../../utils/api');

const compressImage = (filePath) => {
  return new Promise((resolve) => {
    wx.getFileInfo({
      filePath,
      success(info) {
        if (info.size > 2 * 1024 * 1024) {
          wx.compressImage({ src: filePath, quality: 80, success: (r) => resolve(r.tempFilePath) });
        } else { resolve(filePath); }
      },
      fail: () => resolve(filePath)
    });
  });
};

const uploadImage = (filePath, retryCount = 0) => {
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: 'https://img.scdn.io/api/v1.php',
      filePath, name: 'image',
      success(res) {
        try {
          const data = JSON.parse(res.data);
          const url = data && data.data && data.data.url ? data.data.url : (data && data.url ? data.url : null);
          if (url) resolve(url);
          else reject(new Error('上传返回URL异常'));
        } catch { reject(new Error('上传返回格式异常')); }
      },
      fail(err) {
        if (retryCount < 3) {
          setTimeout(() => uploadImage(filePath, retryCount + 1).then(resolve).catch(reject), 1000 * (retryCount + 1));
        } else { reject(err); }
      }
    });
  });
};

Page({
  data: {
    navBarHeight: app.globalData.navBarHeight || 44,
    menuRight: app.globalData.menuRight || 0,
    content: '', title: '', body: '',
    fileList: [], imageUrls: [],
    imageSource: 'media',
    gridConfig: { column: 3, width: 200, height: 200 },
    uploadConfig: { count: 9, sizeType: ['compressed'], sourceType: ['album', 'camera'] },
    submitting: false, editMode: false, editPostId: null,
    canPublish: false,
    selectedTodoIds: [], selectedComboCode: null, location: null,
    userInfo: app.globalData.userInfo || {}
  },

  onLoad(options) {
    const userInfo = app.globalData.userInfo || wx.getStorageSync('user') || {};
    this.setData({
      userInfo,
      navBarHeight: app.globalData.navBarHeight || 44,
      menuRight: app.globalData.menuRight || 0
    });
    if (options.postId) this.loadEditData(options.postId);
    const draft = wx.getStorageSync('communityDraft');
    if (draft && !options.postId) {
      const lines = (draft.content || '').split('\n');
      const draftTitle = lines[0] || '';
      const draftBody = lines.slice(1).join('\n').trim();
      this.setData({
        content: draft.content || '', title: draftTitle.trim(), body: draftBody,
        canPublish: draftTitle.trim().length > 0,
        fileList: draft.fileList || [], imageUrls: draft.imageUrls || [],
        selectedTodoIds: draft.selectedTodoIds || [], selectedComboCode: draft.selectedComboCode || null, location: draft.location || null
      });
    }
  },

  onUnload() {
    if (!this.data.editMode && this.data.content) {
      wx.setStorageSync('communityDraft', {
        content: this.data.content, fileList: this.data.fileList, imageUrls: this.data.imageUrls,
        selectedTodoIds: this.data.selectedTodoIds, selectedComboCode: this.data.selectedComboCode, location: this.data.location
      });
    } else if (!this.data.content) { wx.removeStorageSync('communityDraft'); }
  },

  async loadEditData(postId) {
    try {
      const res = await communityApi.getPostById(postId);
      if (res.success && res.data) {
        const post = res.data;
        const fileList = (post.images || []).map(url => ({ url }));
        this.setData({
          editMode: true, editPostId: postId,
          content: post.title + (post.body ? '\n' + post.body : ''),
          title: post.title, body: post.body || '',
          fileList, imageUrls: post.images || [],
          selectedTodoIds: post.todoIds || [], selectedComboCode: post.shareCode || null,
          location: post.location ? { text: post.location } : null
        });
      }
    } catch (err) { wx.showToast({ title: '加载失败', icon: 'none' }); }
  },

  onContentInput(e) {
    const content = e.detail.value ?? '';
    const lines = content.split('\n');
    const title = lines[0] || '';
    const body = lines.slice(1).join('\n').trim();
    this.setData({ content, title: title.trim(), body, canPublish: title.trim().length > 0 });
  },

  async handleImageAdd(e) {
    const files = e.detail.files || [];
    const newFiles = files.filter(f => !f.url);
    for (const file of newFiles) {
      try {
        const compressed = await compressImage(file.path || file.url);
        const url = await uploadImage(compressed);
        if (url) {
          this.setData({
            fileList: [...this.data.fileList, { url }],
            imageUrls: [...this.data.imageUrls, url]
          });
        }
      } catch (err) { wx.showToast({ title: '图片上传失败', icon: 'none' }); }
    }
  },

  handleImageRemove(e) {
    const { index } = e.detail;
    const list = [...this.data.fileList];
    const urls = [...this.data.imageUrls];
    list.splice(index, 1); urls.splice(index, 1);
    this.setData({ fileList: list, imageUrls: urls });
  },

  handleImageClick(e) {
    const { index } = e.detail || {};
    if (index !== undefined && this.data.imageUrls[index]) {
      wx.previewImage({ current: this.data.imageUrls[index], urls: this.data.imageUrls });
    }
  },

  toggleImageSource() {
    const src = this.data.imageSource === 'media' ? 'messageFile' : 'media';
    this.setData({
      imageSource: src,
      uploadConfig: { ...this.data.uploadConfig, sourceType: src === 'media' ? ['album', 'camera'] : ['album'] }
    });
  },

  pickImage() {
    wx.chooseMedia({
      count: 9 - this.data.imageUrls.length, mediaType: ['image'],
      sourceType: this.data.imageSource === 'media' ? ['album', 'camera'] : ['album'],
      success: (res) => {
        const files = res.tempFiles.map(f => ({ path: f.tempFilePath }));
        this.handleImageAdd({ detail: { files } });
      }
    });
  },

  pickTodos() { wx.showToast({ title: '待办选择功能开发中', icon: 'none' }); },
  pickCombo() { wx.showToast({ title: '组合功能开发中', icon: 'none' }); },
  pickLocation() {
    wx.chooseLocation({
      success: (res) => { this.setData({ location: { text: res.name || res.address } }); }
    });
  },

  async handleSubmit() {
    if (!this.data.title.trim()) { wx.showToast({ title: '请输入标题', icon: 'none' }); return; }
    this.setData({ submitting: true });
    try {
      const payload = {
        postId: `post_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        title: this.data.title, body: this.data.body || null,
        images: this.data.imageUrls.length > 0 ? this.data.imageUrls : null,
        todoIds: this.data.selectedTodoIds.length > 0 ? this.data.selectedTodoIds : null,
        shareCode: this.data.selectedComboCode || null, location: this.data.location || null
      };
      if (this.data.editMode) {
        await communityApi.updatePost(this.data.editPostId, payload);
        wx.showToast({ title: '保存成功', icon: 'success' });
      } else {
        await communityApi.createPost(payload);
        wx.showToast({ title: '发布成功', icon: 'success' });
        wx.removeStorageSync('communityDraft');
      }
      setTimeout(() => wx.navigateBack(), 1500);
    } catch (err) {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
      this.setData({ submitting: false });
    }
  },

  goBack() {
    if (this.data.content) {
      wx.showModal({
        title: '提示', content: '确定放弃当前编辑吗？',
        success: (res) => { if (res.confirm) wx.navigateBack(); }
      });
    } else { wx.navigateBack(); }
  }
});
