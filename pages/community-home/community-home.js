const app = getApp();
const { communityApi } = require('../../utils/api');

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
    refreshing: false
  },

  onLoad() {
    this.setData({
      navBarHeight: app.globalData.navBarHeight || 44,
      menuRight: app.globalData.menuRight || 0,
      menuWidth: app.globalData.menuWidth || 0
    });
  },

  onShow() {
    if (this.data.postList.length === 0) {
      this.loadPosts(true);
    }
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
        this.setData({
          postList: reset ? res.data.list : [...this.data.postList, ...res.data.list],
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
    const now = Date.now();
    const date = new Date(dateStr.replace(' ', 'T'));
    const diff = Math.floor((now - date.getTime()) / 1000);
    if (diff < 60) return '刚刚';
    if (diff < 3600) return Math.floor(diff / 60) + '分钟前';
    if (diff < 86400) return Math.floor(diff / 3600) + '小时前';
    if (diff < 2592000) return Math.floor(diff / 86400) + '天前';
    const m = date.getMonth() + 1;
    const d = date.getDate();
    return m + '月' + d + '日';
  },

  onShareAppMessage() {
    return { title: '时光绿径待办 · 社区', path: '/pages/community-home/community-home' };
  }
});
