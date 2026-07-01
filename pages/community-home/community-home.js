const app = getApp();
const { communityApi, todosApi } = require('../../utils/api');

Page({
  data: {
    navBarHeight: app.globalData.navBarHeight || 44,
    menuRight: app.globalData.menuRight || 0,
    menuWidth: app.globalData.menuWidth || 0,
    scrollTop: 0,
    showBackTop: false,
    postList: [],
    nextCursor: null,
    hasMore: true,
    loading: false,
    loadingMore: false,
    refreshing: false,
    expandedPostId: null,
    postTodoMap: {}
  },

  onLoad() {
    this.setData({
      navBarHeight: app.globalData.navBarHeight || 44,
      menuRight: app.globalData.menuRight || 0,
      menuWidth: app.globalData.menuWidth || 0
    });
  },

  onShow() {
    this.loadPosts(true);
  },

  onPullDownRefresh() {
    this.loadPosts(true).then(() => wx.stopPullDownRefresh());
  },

  onRefresh() {
    this.loadPosts(true);
  },

  async loadPosts(reset = false) {
    if (this.data.loading) return;
    if (!reset && !this.data.hasMore) return;

    this.setData({ loading: reset, loadingMore: !reset, refreshing: !!reset });

    try {
      const params = { limit: 20 };
      if (!reset && this.data.nextCursor) params.cursor = this.data.nextCursor;

      const res = await communityApi.getPostList(params);
      if (res.success) {
        const list = (res.data.list || []).map(item => {
          const ts = item.createdAt || item.created_at || null;
          return { ...item, createdAt: ts, createdAtDisplay: this.formatTime(ts) };
        });
        this.setData({
          postList: reset ? list : [...this.data.postList, ...list],
          nextCursor: res.data.nextCursor,
          hasMore: res.data.hasMore,
          loading: false, loadingMore: false, refreshing: false
        });
      }
    } catch (err) {
      console.error('获取帖子列表失败', err);
      this.setData({ loading: false, loadingMore: false, refreshing: false });
    }
  },

  onLoadMore() { this.loadPosts(false); },

  goToDetail(e) {
    const postId = e.currentTarget.dataset.postId;
    wx.navigateTo({ url: `/packageCommunity/post-detail/post-detail?postId=${postId}` });
  },

  goToEdit() {
    const token = wx.getStorageSync('authToken');
    if (!token) { wx.navigateTo({ url: '/packagePages/login/login' }); return; }
    wx.navigateTo({ url: '/packageCommunity/post-edit/post-edit' });
  },

  async toggleTodoExpand(e) {
    const postId = e.currentTarget.dataset.postId;
    const post = this.data.postList.find(p => p.postId === postId);
    if (!post || !post.todoIds || post.todoIds.length === 0) return;

    if (this.data.expandedPostId === postId) {
      this.setData({ expandedPostId: null });
      return;
    }

    // fetch todo titles if not cached
    if (!this.data.postTodoMap[postId]) {
      try {
        const res = await todosApi.getTodosBatch(post.todoIds);
        if (res.success && res.data) {
          this.data.postTodoMap[postId] = res.data;
          this.setData({ postTodoMap: this.data.postTodoMap, expandedPostId: postId });
        }
      } catch (err) {
        wx.showToast({ title: '加载待办失败', icon: 'none' });
      }
    } else {
      this.setData({ expandedPostId: postId });
    }
  },

  handleComboTap(e) {
    const shareCode = e.currentTarget.dataset.code;
    if (!shareCode) return;
    wx.setStorageSync('pendingShareData', {
      type: 'combo_invite',
      code: shareCode,
      auto: false,
      timestamp: Date.now()
    });
    wx.switchTab({ url: '/pages/todo/todo' });
  },

  async toggleLike(e) {
    const postId = e.currentTarget.dataset.postId;
    try {
      const res = await communityApi.toggleLike({ postId });
      if (res.success) {
        const list = [...this.data.postList];
        const idx = list.findIndex(p => p.postId === postId);
        if (idx !== -1) {
          list[idx].isLiked = res.data.liked;
          list[idx].likesCount += res.data.liked ? 1 : -1;
          this.setData({ postList: list });
        }
      }
    } catch (err) { console.error('点赞失败', err); }
  },

  previewImage(e) {
    const url = e.currentTarget.dataset.url;
    const postId = e.currentTarget.dataset.postId;
    const post = this.data.postList.find(p => p.postId === postId);
    wx.previewImage({ current: url, urls: post && post.images ? post.images : [url] });
  },

  goToTodoDetail(e) {
    const { todoId, creatorName, creatorAvatar, postId } = e.currentTarget.dataset;
    if (!todoId) return;
    wx.navigateTo({
      url: `/packagePages/todo-detail/todo-detail?communityTodoId=${todoId}&creatorName=${encodeURIComponent(creatorName || '')}&creatorAvatar=${encodeURIComponent(creatorAvatar || '')}&postId=${postId || ''}`
    });
  },

  onSearch() { wx.showToast({ title: '搜索功能开发中', icon: 'none' }); },

  onScroll(e) {
    const show = e.detail.scrollTop > 500;
    if (this.data.showBackTop !== show) {
      this.setData({ showBackTop: show });
    }
  },

  onToTop() {
    this.setData({ scrollTop: this.data.scrollTop === 0 ? 1 : 0, showBackTop: false });
  },

  onAvatarError(e) {
    e.target.src = '/images/avatar.png';
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
      if (isNaN(date.getTime())) { console.warn('[formatTime] Invalid date:', dateStr); return ''; }
      const now = Date.now();
      const diff = Math.floor((now - date.getTime()) / 1000);
      if (diff < 60) return '刚刚';
      if (diff < 3600) return Math.floor(diff / 60) + '分钟前';
      if (diff < 86400) return Math.floor(diff / 3600) + '小时前';
      if (diff < 2592000) return Math.floor(diff / 86400) + '天前';
      const m = date.getMonth() + 1;
      const d = date.getDate();
      return m + '月' + d + '日';
    } catch (e) { console.warn('[formatTime] error:', e, dateStr); return ''; }
  },

  onShareAppMessage() {
    return { title: '时光绿径待办 · 社区', path: '/pages/community-home/community-home' };
  }
});
