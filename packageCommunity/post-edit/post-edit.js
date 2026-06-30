const app = getApp();
const { communityApi, combosApi, isLoggedIn } = require('../../utils/api');
const { getLocalTodos } = require('../../utils/sync');

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
    menuWidth: app.globalData.menuWidth || 0,
    title: '', body: '',
    fileList: [], imageUrls: [],
    imageSource: 'media',
    gridConfig: { column: 3, width: 200, height: 200 },
    uploadConfig: { count: 9, sizeType: ['compressed'], sourceType: ['album', 'camera'] },
    submitting: false, editMode: false, editPostId: null,
    canPublish: false,
    selectedTodoIds: [], selectedComboCode: null, selectedComboName: '',
    location: null,
    // picker state
    showPicker: false, pickerType: '',
    temporarySelectedIds: [], temporarySelectedComboId: null,
    filteredTodos: [], allTodos: [],
    todoSearchKeyword: '', comboSearchKeyword: '',
    pickerCombos: [], pickerSharedCombos: [],
    filteredPickerCombos: [], filteredPickerSharedCombos: [],
    selectedMap: {},
    userInfo: app.globalData.userInfo || {}
  },

  onLoad(options) {
    const userInfo = app.globalData.userInfo || wx.getStorageSync('user') || {};
    this.setData({
      userInfo,
      navBarHeight: app.globalData.navBarHeight || 44,
      menuRight: app.globalData.menuRight || 0,
      menuWidth: app.globalData.menuWidth || 0
    });
    this.loadTodos();
    this.loadPickerCombos();
    if (options.postId) this.loadEditData(options.postId);
    const draft = wx.getStorageSync('communityDraft');
    if (draft && !options.postId) {
      this.setData({
        title: draft.title || '', body: draft.body || '',
        canPublish: (draft.title || '').trim().length > 0,
        fileList: draft.fileList || [], imageUrls: draft.imageUrls || [],
        selectedTodoIds: draft.selectedTodoIds || [], selectedComboCode: draft.selectedComboCode || null,
        selectedComboName: draft.selectedComboName || '',
        location: draft.location || null
      });
    }
  },

  loadTodos() {
    const todos = getLocalTodos().filter(t => !t.isDeleted);
    this.setData({ allTodos: todos, filteredTodos: todos });
  },

  loadPickerCombos() {
    const combos = app.globalData.combos || [];
    const sharedCombos = app.globalData.sharedCombos || [];
    // 私有组合：仅显示有 share_code 且 is_shared=1 的
    const shareableCombos = combos.filter(c => c.share_code && (c.is_shared === 1 || c.isShared === 1));
    // 共享组合：仅显示有邀请权限的
    const inviteableShared = sharedCombos.filter(c =>
      c.role === 'owner' || c.role === 'admin' || c.userRole === 'owner' || c.userRole === 'admin'
    );
    this.setData({ pickerCombos: shareableCombos, pickerSharedCombos: inviteableShared });
  },

  onUnload() {
    if (!this.data.editMode && (this.data.title || this.data.body)) {
      wx.setStorageSync('communityDraft', {
        title: this.data.title, body: this.data.body, fileList: this.data.fileList, imageUrls: this.data.imageUrls,
        selectedTodoIds: this.data.selectedTodoIds, selectedComboCode: this.data.selectedComboCode,
        selectedComboName: this.data.selectedComboName, location: this.data.location
      });
    } else if (!this.data.title && !this.data.body) { wx.removeStorageSync('communityDraft'); }
  },

  async loadEditData(postId) {
    // 优先使用 post-detail 传递的完整数据
    const cached = app.globalData.editPostData;
    if (cached && cached.postId === postId) {
      app.globalData.editPostData = null;
      const fileList = (cached.images || []).map(url => ({ url }));
      let comboName = '';
      if (cached.shareCode) {
        const allCombos = [...(app.globalData.combos || []), ...(app.globalData.sharedCombos || [])];
        const found = allCombos.find(c => c.share_code === cached.shareCode);
        if (found) comboName = found.name;
      }
      this.setData({
        editMode: true, editPostId: postId,
        title: cached.title || '', body: cached.body || '',
        fileList, imageUrls: cached.images || [],
        selectedTodoIds: cached.todoIds || [], selectedComboCode: cached.shareCode || null,
        selectedComboName: comboName,
        location: cached.location ? { text: cached.location } : null
      });
      return;
    }
    try {
      const res = await communityApi.getPostById(postId);
      if (res.success && res.data) {
        const post = res.data;
        const fileList = (post.images || []).map(url => ({ url }));
        let comboName = '';
        if (post.shareCode) {
          const allCombos = [...(app.globalData.combos || []), ...(app.globalData.sharedCombos || [])];
          const found = allCombos.find(c => c.share_code === post.shareCode);
          if (found) comboName = found.name;
        }
        this.setData({
          editMode: true, editPostId: postId,
          title: post.title || '', body: post.body || '',
          fileList, imageUrls: post.images || [],
          selectedTodoIds: post.todoIds || [], selectedComboCode: post.shareCode || null,
          selectedComboName: comboName,
          location: post.location ? { text: post.location } : null
        });
      }
    } catch (err) { wx.showToast({ title: '加载失败', icon: 'none' }); }
  },

  onTitleInput(e) {
    const title = e.detail.value ?? '';
    this.setData({ title, canPublish: title.trim().length > 0 });
  },

  onBodyInput(e) {
    const body = e.detail.value ?? '';
    this.setData({ body });
  },

  async handleImageAdd(e) {
    const { files } = e.detail;
    const currentCount = this.data.fileList.length;
    if (currentCount >= 9) { wx.showToast({ title: '最多上传9张图片', icon: 'none' }); return; }
    const filesToAdd = files.slice(0, 9 - currentCount);
    if (filesToAdd.length === 0) return;
    for (let i = 0; i < filesToAdd.length; i++) {
      const file = filesToAdd[i];
      wx.showLoading({ title: `上传中 ${i + 1}/${filesToAdd.length}`, mask: true });
      try {
        const compressed = await compressImage(file.url);
        const url = await uploadImage(compressed);
        const newItem = { url, name: `image_${Date.now()}_${i}`, type: 'image', status: 'done' };
        this.setData({ fileList: [...this.data.fileList, newItem], imageUrls: [...this.data.imageUrls, url] });
      } catch (err) {
        wx.showToast({ title: '图片上传失败', icon: 'none' });
      }
    }
    wx.hideLoading();
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

  toggleImageSource(e) {
    const isMessageFile = e.detail.value;
    const src = isMessageFile ? 'messageFile' : 'media';
    this.setData({
      imageSource: src,
      uploadConfig: { ...this.data.uploadConfig, sourceType: src === 'media' ? ['album', 'camera'] : ['album'] }
    });
  },

  pickLocation() {
    wx.chooseLocation({
      success: (res) => { this.setData({ location: { text: res.name || res.address } }); }
    });
  },

  clearLocation() {
    this.setData({ location: null });
  },

  // ===== 统一选择弹窗（待办/组合共用） =====
  showPicker(e) {
    const type = e.currentTarget?.dataset?.type || e;
    if (type === 'todo') {
      const selectedMap = {};
      this.data.selectedTodoIds.forEach(id => { selectedMap[id] = true; });
      this.setData({
        showPicker: true, pickerType: 'todo',
        temporarySelectedIds: [...this.data.selectedTodoIds],
        selectedMap,
        todoSearchKeyword: '',
        filteredTodos: this.data.allTodos
      });
    } else if (type === 'combo') {
      const combos = app.globalData.combos || [];
      const sharedCombos = app.globalData.sharedCombos || [];
      const shareableCombos = combos.filter(c => c.share_code && (c.is_shared === 1 || c.isShared === 1));
      const inviteableShared = sharedCombos.filter(c =>
        c.role === 'owner' || c.role === 'admin' || c.userRole === 'owner' || c.userRole === 'admin'
      );
      this.setData({
        showPicker: true, pickerType: 'combo',
        temporarySelectedComboId: this.data.selectedComboCode
          ? this.findComboIdByCode(this.data.selectedComboCode) : null,
        pickerCombos: shareableCombos,
        pickerSharedCombos: inviteableShared,
        filteredPickerCombos: shareableCombos,
        filteredPickerSharedCombos: inviteableShared,
        comboSearchKeyword: ''
      });
    }
  },

  hidePicker() {
    this.setData({ showPicker: false });
  },

  onPickerVisibleChange(e) {
    if (!e.detail.visible) this.setData({ showPicker: false });
  },

  onTodoSearch(e) {
    const keyword = (e.detail.value || '').trim();
    const filtered = keyword
      ? this.data.allTodos.filter(t => t.text.indexOf(keyword) > -1)
      : this.data.allTodos;
    this.setData({ todoSearchKeyword: keyword, filteredTodos: filtered });
  },

  toggleTodoSelect(e) {
    const todoId = e.currentTarget.dataset.id;
    const tempIds = [...this.data.temporarySelectedIds];
    const idx = tempIds.indexOf(todoId);
    const selectedMap = { ...this.data.selectedMap };
    if (idx > -1) {
      tempIds.splice(idx, 1);
      delete selectedMap[todoId];
    } else {
      tempIds.push(todoId);
      selectedMap[todoId] = true;
    }
    this.setData({ temporarySelectedIds: tempIds, selectedMap });
  },

  confirmTodoSelection() {
    this.setData({
      selectedTodoIds: [...this.data.temporarySelectedIds],
      showPicker: false
    });
  },

  clearSelectedTodos() {
    this.setData({ selectedTodoIds: [], selectedMap: {} });
  },

  findComboIdByCode(code) {
    if (!code) return null;
    const all = [...(app.globalData.combos || []), ...(app.globalData.sharedCombos || [])];
    const found = all.find(c => c.share_code === code);
    return found ? String(found.id) : null;
  },

  findComboById(id) {
    const all = [...(app.globalData.combos || []), ...(app.globalData.sharedCombos || [])];
    return all.find(c => String(c.id) === String(id)) || null;
  },

  onComboSearch(e) {
    const keyword = (e.detail.value || '').trim();
    if (!keyword) {
      this.setData({
        comboSearchKeyword: '',
        filteredPickerCombos: this.data.pickerCombos,
        filteredPickerSharedCombos: this.data.pickerSharedCombos
      });
      return;
    }
    this.setData({
      comboSearchKeyword: keyword,
      filteredPickerCombos: this.data.pickerCombos.filter(c => c.name.indexOf(keyword) > -1),
      filteredPickerSharedCombos: this.data.pickerSharedCombos.filter(c => c.name.indexOf(keyword) > -1)
    });
  },

  selectTemporaryCombo(e) {
    const comboId = e.currentTarget.dataset.id;
    this.setData({
      temporarySelectedComboId: this.data.temporarySelectedComboId === comboId ? null : comboId
    });
  },

  confirmComboSelection() {
    const id = this.data.temporarySelectedComboId;
    if (id) {
      const combo = this.findComboById(id);
      if (combo) {
        this.setData({
          selectedComboCode: combo.share_code,
          selectedComboName: combo.name
        });
      }
    } else {
      this.setData({ selectedComboCode: null, selectedComboName: '' });
    }
    this.setData({ showPicker: false });
  },

  clearSelectedCombo() {
    this.setData({ selectedComboCode: null, selectedComboName: '' });
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
    if (this.data.title || this.data.body) {
      wx.showModal({
        title: '提示', content: '确定放弃当前编辑吗？',
        success: (res) => { if (res.confirm) wx.navigateBack(); }
      });
    } else { wx.navigateBack(); }
  },

  onAvatarError() {
    this.setData({ userAvatarFailed: true });
  }
});
