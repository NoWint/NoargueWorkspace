const app = getApp();
const { communityApi, todosApi } = require('../../utils/api');

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
    postId: null, post: {}, isDeleted: false, isOwner: false,
    todoId: null, todoData: null,
    comments: [], commentCursor: null, hasMoreComments: true, loadingComments: false,
    commentText: '', replyTarget: null, replyParentId: null, replyToUserId: null,
    showVisitorsPopup: false,
    visitors: [],
    refreshing: false,
    todoExpanded: false, todoItems: [],
    reportReasons: ['垃圾广告', '色情低俗', '人身攻击', '违法信息', '其他'],
    commentFiles: [],
    commentImageUrls: [],
    showImageUpload: false,
    gridConfig: { column: 5, width: 120, height: 120 },
    uploadConfig: { count: 9, sizeType: ['compressed'], sourceType: ['album', 'camera'] }
  },

  onLoad(options) {
    const postId = options.postId;
    const todoId = options.todoId;
    if (postId) {
      this.setData({ postId });
      this.loadPost();
    } else if (todoId) {
      this.setData({ todoId });
      this.loadTodoPost(todoId);
    } else {
      wx.showToast({ title: '参数错误', icon: 'none' });
    }
  },

  // 从 todoId 加载：获取待办数据，预填标题并跳转发布页
  async loadTodoPost(todoId) {
    try {
      const res = await todosApi.getById(todoId);
      if (res.success && res.data) {
        const todo = res.data;
        // 存储到全局用于 post-edit 读取
        app.globalData.quickShareTodo = todo;
        wx.showModal({
          title: '基于待办发布',
          content: '是否以「' + todo.text + '」为标题发布到社区？',
          success: (r) => {
            if (r.confirm) {
              // 携带 todoId 跳转发布页，post-edit 自动填入标题
              wx.redirectTo({
                url: '/packageCommunity/post-edit/post-edit?todoId=' + todoId
              });
            } else {
              wx.navigateBack();
            }
          }
        });
      } else {
        wx.showToast({ title: '待办不存在', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 1500);
      }
    } catch (err) {
      wx.showToast({ title: '加载待办失败', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
    }
  },

  onShow() {
    if (this.data.postId) this.loadPost();
  },

  async loadPost() {
    try {
      const res = await communityApi.getPostById(this.data.postId);
      if (res.success && res.data) {
        const post = res.data;
        post._createdAtDisplay = this.formatTime(post.createdAt);
        post._updatedAtDisplay = this.formatTime(post.updatedAt);
        const userInfo = app.globalData.userInfo || wx.getStorageSync('user') || {};
        this.setData({ post, isDeleted: post.isDeleted, isOwner: post.userId === userInfo.id });
        this.loadComments(true);
      } else { this.setData({ isDeleted: true }); }
    } catch (err) { wx.showToast({ title: '加载失败', icon: 'none' }); }
  },

  onRefresh() {
    this.setData({ refreshing: true });
    this.loadPost().then(() => this.setData({ refreshing: false }));
  },

  async loadComments(reset = false) {
    if (this.data.loadingComments) return;
    if (!reset && !this.data.hasMoreComments) return;
    this.setData({ loadingComments: true });
    try {
      const params = { limit: 20 };
      if (!reset && this.data.commentCursor) params.cursor = this.data.commentCursor;
      const res = await communityApi.getComments(this.data.postId, params);
      if (res.success) {
        const mapItem = c => { c._createdDisplay = this.formatTime(c.createdAt); if (c.replies) c.replies.forEach(r => { r._createdDisplay = this.formatTime(r.createdAt); }); return c; };
        const list = (res.data.list || []).map(mapItem);
        this.setData({
          comments: reset ? list : [...this.data.comments, ...list],
          commentCursor: res.data.nextCursor, hasMoreComments: res.data.hasMore, loadingComments: false
        });
      }
    } catch (err) { this.setData({ loadingComments: false }); wx.showToast({ title: '评论加载失败', icon: 'none' }); }
  },

  onLoadMoreComments() { this.loadComments(false); },
  onCommentInput(e) { this.setData({ commentText: e.detail.value }); },

  replyComment(e) {
    const { id, user, userid } = e.currentTarget.dataset;
    this.setData({ replyTarget: user, replyParentId: id, replyToUserId: userid || null });
  },

  cancelReply() { this.setData({ replyTarget: null, replyParentId: null, replyToUserId: null }); },

  async submitComment() {
    const text = this.data.commentText.trim();
    if (!text && this.data.commentImageUrls.length === 0) return;
    try {
      await communityApi.createComment(this.data.postId, {
        content: text,
        images: this.data.commentImageUrls.length > 0 ? this.data.commentImageUrls : null,
        parentId: this.data.replyParentId || null,
        replyToUserId: this.data.replyToUserId || null
      });
      this.setData({
        commentText: '', replyTarget: null, replyParentId: null, replyToUserId: null,
        commentFiles: [], commentImageUrls: [], showImageUpload: false
      });
      wx.showToast({ title: '发送成功', icon: 'success' });
      this.loadComments(true);
    } catch (err) { wx.showToast({ title: err.message || '发送失败', icon: 'none' }); }
  },

  async deleteComment(e) {
    const commentId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除', content: '确定要删除这条评论吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await communityApi.deleteComment(commentId);
            wx.showToast({ title: '删除成功', icon: 'success' });
            this.loadComments(true);
          } catch (err) { wx.showToast({ title: err.message || '删除失败', icon: 'none' }); }
        }
      }
    });
  },

  async toggleCommentLike(e) {
    const commentId = e.currentTarget.dataset.id;
    try {
      const res = await communityApi.toggleCommentLike(commentId);
      if (res.success) {
        const updateItem = (items) => items.map(c => {
          if (c.id === commentId) {
            c.isLiked = res.data.liked;
            c.likesCount = res.data.likesCount;
          }
          if (c.replies) c.replies = updateItem(c.replies);
          return c;
        });
        this.setData({ comments: updateItem(this.data.comments) });
      }
    } catch (err) {
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },

  toggleImagePicker() {
    this.setData({ showImageUpload: !this.data.showImageUpload });
  },

  async handleCommentImageAdd(e) {
    const { files } = e.detail;
    const currentCount = this.data.commentFiles.length;
    if (currentCount >= 9) { wx.showToast({ title: '最多上传9张图片', icon: 'none' }); return; }
    const filesToAdd = files.slice(0, 9 - currentCount);
    if (filesToAdd.length === 0) return;
    for (let i = 0; i < filesToAdd.length; i++) {
      const file = filesToAdd[i];
      wx.showLoading({ title: `上传中 ${i + 1}/${filesToAdd.length}`, mask: true });
      try {
        const compressed = await compressImage(file.url);
        const url = await uploadImage(compressed);
        const newItem = { url, name: `comment_img_${Date.now()}_${i}`, type: 'image', status: 'done' };
        this.setData({
          commentFiles: [...this.data.commentFiles, newItem],
          commentImageUrls: [...this.data.commentImageUrls, url]
        });
      } catch (err) {
        wx.showToast({ title: '图片上传失败', icon: 'none' });
      }
    }
    wx.hideLoading();
  },

  handleCommentImageRemove(e) {
    const { index } = e.detail;
    const files = [...this.data.commentFiles];
    const urls = [...this.data.commentImageUrls];
    files.splice(index, 1);
    urls.splice(index, 1);
    this.setData({ commentFiles: files, commentImageUrls: urls });
  },

  handleCommentImageClick(e) {
    const { index } = e.detail;
    wx.previewImage({ current: this.data.commentImageUrls[index], urls: this.data.commentImageUrls });
  },

  async toggleTodoExpand() {
    const post = this.data.post;
    if (!post || !post.todoIds || post.todoIds.length === 0) return;
    if (this.data.todoExpanded) { this.setData({ todoExpanded: false }); return; }
    if (this.data.todoItems.length === 0) {
      try {
        const res = await todosApi.getTodosBatch(post.todoIds);
        if (res.success && res.data) {
          this.setData({ todoItems: res.data, todoExpanded: true });
          return;
        }
      } catch (err) {
        console.error('[toggleTodoExpand] batch error:', err);
        wx.showToast({ title: '加载待办失败', icon: 'none' });
        return;
      }
    }
    this.setData({ todoExpanded: true });
  },

  handleComboTap() {
    const code = this.data.post.shareCode;
    if (!code) return;
    wx.setStorageSync('pendingShareData', { type: 'combo_invite', code, auto: false, timestamp: Date.now() });
    wx.switchTab({ url: '/pages/todo/todo' });
  },

  onMore() {
    const itemList = this.data.isOwner ? ['编辑帖子', '删除帖子'] : ['举报'];
    wx.showActionSheet({
      itemList,
      success: (res) => {
        if (this.data.isOwner) {
          if (res.tapIndex === 0) this.editPost();
          else if (res.tapIndex === 1) this.deletePost();
        } else {
          if (res.tapIndex === 0) this.showReportSheet();
        }
      }
    });
  },

  editPost() {
    app.globalData.editPostData = this.data.post;
    wx.navigateTo({ url: '/packageCommunity/post-edit/post-edit?postId=' + this.data.postId });
  },

  deletePost() {
    wx.showModal({
      title: '确认删除', content: '确定要删除这篇帖子吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await communityApi.deletePost(this.data.postId);
            wx.showToast({ title: '删除成功', icon: 'success' });
            setTimeout(() => wx.navigateBack(), 1500);
          } catch (err) { wx.showToast({ title: err.message || '删除失败', icon: 'none' }); }
        }
      }
    });
  },

  showReportSheet() {
    wx.showActionSheet({
      itemList: [...this.data.reportReasons, '取消'],
      success: async (res) => {
        if (res.tapIndex >= this.data.reportReasons.length) return;
        const reason = this.data.reportReasons[res.tapIndex];
        try {
          await new Promise((resolve, reject) => {
            wx.requestSubscribeMessage({
              tmplIds: ['yXtj85psFqKHQsAbcjxFo5wYX8SdU4acoYiENIRpiAE'],
              success: resolve, fail: reject
            });
          });
        } catch (err) { /* user declined, continue anyway */ }
        try {
          await communityApi.createReport({ targetType: 'post', targetId: this.data.postId, reason, detail: '' });
          wx.showToast({ title: '举报已提交', icon: 'success' });
        } catch (err) { wx.showToast({ title: err.message || '提交失败', icon: 'none' }); }
      }
    });
  },

  async showVisitors() {
    this.setData({ showVisitorsPopup: true });
    try {
      const res = await communityApi.getVisitors(this.data.postId);
      if (res.success) {
        const visitors = (res.data.list || []).map(v => { v._viewedDisplay = this.formatTime(v.viewedAt); return v; });
        this.setData({ visitors });
      }
    } catch (err) { console.error('获取访客记录失败', err); wx.showToast({ title: '加载失败', icon: 'none' }); this.setData({ showVisitorsPopup: false, visitors: [] }); }
  },

  closeVisitors() { this.setData({ showVisitorsPopup: false, visitors: [] }); },
  onVisitorsClose(e) { if (!e.detail.visible) this.setData({ showVisitorsPopup: false, visitors: [] }); },

  previewImage(e) {
    const url = e.currentTarget.dataset.url;
    const allImages = [...(this.data.post.images || [])];
    wx.previewImage({ current: url, urls: allImages.length > 0 ? allImages : [url] });
  },

  onAvatarError(e) {
    const target = e.currentTarget;
    if (!target) return;
    target.src = '/images/avatar.png';
  },

  formatTime(dateStr) {
    if (!dateStr) return '';
    try {
      let date;
      if (typeof dateStr === 'string') {
        const s = dateStr.replace('T', ' ').replace(/\.\d+Z$/, '');
        const p = s.split(/[- :]/);
        date = new Date(+p[0], +p[1] - 1, +p[2], +(p[3]||0), +(p[4]||0), +(p[5]||0));
      } else {
        date = new Date(dateStr);
      }
      if (isNaN(date.getTime())) { console.warn('[post-detail formatTime] Invalid date:', dateStr); return ''; }
      const m = date.getMonth() + 1;
      const d = date.getDate();
      const h = String(date.getHours()).padStart(2, '0');
      const min = String(date.getMinutes()).padStart(2, '0');
      return m + '月' + d + '日 ' + h + ':' + min;
    } catch (e) { console.warn('[post-detail formatTime] error:', e, dateStr); return ''; }
  }
});
