const app = getApp();
const { communityApi } = require('../../utils/api');

Page({
  data: {
    postId: null, post: {}, isDeleted: false, isOwner: false,
    comments: [], commentCursor: null, hasMoreComments: true, loadingComments: false,
    commentText: '', replyTarget: null, replyParentId: null, replyToUserId: null,
    showVisitorsPopup: false,
    visitors: [],
    reportReasons: ['垃圾广告', '色情低俗', '人身攻击', '违法信息', '其他']
  },

  onLoad(options) {
    const postId = options.postId;
    if (!postId) { wx.showToast({ title: '参数错误', icon: 'none' }); return; }
    this.setData({ postId });
    this.loadPost();
  },

  onShow() {
    if (this.data.postId) this.loadPost();
  },

  async loadPost() {
    try {
      const res = await communityApi.getPostById(this.data.postId);
      if (res.success && res.data) {
        const post = res.data;
        const userInfo = app.globalData.userInfo || wx.getStorageSync('user') || {};
        this.setData({ post, isDeleted: post.isDeleted, isOwner: post.userId === userInfo.id });
        this.loadComments(true);
      } else { this.setData({ isDeleted: true }); }
    } catch (err) { wx.showToast({ title: '加载失败', icon: 'none' }); }
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
        this.setData({
          comments: reset ? res.data.list : [...this.data.comments, ...res.data.list],
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
    if (!text) return;
    try {
      await communityApi.createComment(this.data.postId, {
        content: text, parentId: this.data.replyParentId || null, replyToUserId: this.data.replyToUserId || null
      });
      this.setData({ commentText: '', replyTarget: null, replyParentId: null, replyToUserId: null });
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

  onMore() {
    const itemList = this.data.isOwner ? ['编辑帖子', '删除帖子', '取消'] : ['举报', '取消'];
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
      if (res.success) this.setData({ visitors: res.data.list || [] });
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
    const date = new Date(dateStr.replace(' ', 'T'));
    const m = date.getMonth() + 1;
    const d = date.getDate();
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return m + '月' + d + '日 ' + h + ':' + min;
  }
});
