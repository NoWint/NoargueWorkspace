const app = getApp();
const { communityApi, userApi } = require('../../utils/api');

Page({
  data: {
    userId: null,
    isSelf: false,
    user: null,
    posts: [],
    nextCursor: null,
    hasMore: true,
    loading: false,
    loadingMore: false,
    refreshing: false,
    pageLoading: true,
    expandedPostId: null,
    postTodoMap: {},
    regDays: 0
  },

  onLoad(options) {
    const userId = options.userId;
    if (!userId) {
      wx.showToast({ title: '参数错误', icon: 'none' });
      wx.navigateBack();
      return;
    }

    // 判断是否自己的主页
    const currentUser = app.globalData.userInfo || wx.getStorageSync('user') || {};
    const isSelf = String(currentUser.id) === String(userId);

    this.setData({ userId, isSelf });
    this.loadAll();
  },

  async loadAll() {
    this.setData({ loading: true, refreshing: true });
    try {
      // 并行拉取用户资料和帖子列表
      const [profileRes, postsRes] = await Promise.all([
        userApi.getProfile(this.data.userId),
        communityApi.getUserPosts(this.data.userId, { limit: 20 })
      ]);

      let user = null;
      let regDays = 0;

      if (profileRes.success) {
        user = profileRes.data;
        if (user.createdAt) {
          const created = new Date(user.createdAt);
          regDays = Math.floor((Date.now() - created.getTime()) / 86400000) + 1;
        }
      }

      let posts = [];
      let nextCursor = null;
      let hasMore = true;

      if (postsRes.success) {
        const list = (postsRes.data.list || []).map(item => {
          const ts = item.createdAt || item.created_at || null;
          return { ...item, createdAt: ts, createdAtDisplay: this.formatTime(ts) };
        });
        posts = list;
        nextCursor = postsRes.data.nextCursor;
        hasMore = postsRes.data.hasMore;
      }

      this.setData({
        user,
        regDays,
        posts,
        nextCursor,
        hasMore,
        loading: false,
        loadingMore: false,
        refreshing: false,
        pageLoading: false
      });
    } catch (err) {
      console.error('加载用户主页失败', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
      this.setData({ loading: false, loadingMore: false, refreshing: false, pageLoading: false });
    }
  },

  onRefresh() {
    this.loadAll();
  },

  onLoadMore() {
    if (this.data.loadingMore || !this.data.hasMore) return;
    this.setData({ loadingMore: true });
    communityApi.getUserPosts(this.data.userId, { cursor: this.data.nextCursor, limit: 20 })
      .then(res => {
        if (res.success) {
          const list = (res.data.list || []).map(item => {
            const ts = item.createdAt || item.created_at || null;
            return { ...item, createdAt: ts, createdAtDisplay: this.formatTime(ts) };
          });
          this.setData({
            posts: [...this.data.posts, ...list],
            nextCursor: res.data.nextCursor,
            hasMore: res.data.hasMore,
            loadingMore: false
          });
        }
      })
      .catch(() => {
        this.setData({ loadingMore: false });
        wx.showToast({ title: '加载失败', icon: 'none' });
      });
  },

  goToPostDetail(e) {
    const postId = e.detail.postId;
    if (!postId) return;
    wx.navigateTo({ url: `/packageCommunity/post-detail/post-detail?postId=${postId}` });
  },

  goToEditProfile() {
    wx.navigateTo({ url: '/packagePages/user-center/user-center' });
  },

  onPlaceholderAction() {
    wx.showToast({ title: '即将开放', icon: 'none' });
  },

  async toggleTodoExpand(e) {
    const postId = e.detail.postId;
    const post = this.data.posts.find(p => p.postId === postId);
    if (!post || !post.todoIds || post.todoIds.length === 0) return;

    if (this.data.expandedPostId === postId) {
      this.setData({ expandedPostId: null });
      return;
    }

    if (!this.data.postTodoMap[postId]) {
      try {
        const { todosApi } = require('../../utils/api');
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

  async toggleLike(e) {
    const postId = e.detail.postId;
    try {
      const res = await communityApi.toggleLike({ postId });
      if (res.success) {
        const posts = [...this.data.posts];
        const idx = posts.findIndex(p => p.postId === postId);
        if (idx !== -1) {
          posts[idx].isLiked = res.data.liked;
          posts[idx].likesCount += res.data.liked ? 1 : -1;
          this.setData({ posts });
        }
      }
    } catch (err) { console.error('点赞失败', err); }
  },

  previewImage(e) {
    const { url, images } = e.detail;
    wx.previewImage({ current: url, urls: images || [url] });
  },

  goToTodoDetail(e) {
    const { todoId, creatorName, creatorAvatar, postId } = e.detail;
    if (!todoId) return;
    wx.navigateTo({
      url: `/packagePages/todo-detail/todo-detail?communityTodoId=${todoId}&creatorName=${encodeURIComponent(creatorName || '')}&creatorAvatar=${encodeURIComponent(creatorAvatar || '')}&postId=${postId || ''}`
    });
  },

  openLocation(e) {
    const { lat, lng, name } = e.detail;
    if (!lat || !lng) return;
    wx.openLocation({
      latitude: parseFloat(lat),
      longitude: parseFloat(lng),
      name: name || '目标位置',
      scale: 18
    });
  },

  handleComboTap(e) {
    const shareCode = e.detail.shareCode;
    if (!shareCode) return;
    wx.setStorageSync('pendingShareData', {
      type: 'combo_invite',
      code: shareCode,
      auto: false,
      timestamp: Date.now()
    });
    wx.switchTab({ url: '/pages/todo/todo' });
  },

  previewAvatar() {
    const url = this.data.user?.avatarUrl;
    if (url) wx.previewImage({ current: url, urls: [url] });
  },

  onAvatarError() {
    // fallback handled in wxml
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
      if (isNaN(date.getTime())) { console.warn('[user-home formatTime] Invalid date:', dateStr); return ''; }
      const now = Date.now();
      const diff = Math.floor((now - date.getTime()) / 1000);
      if (diff < 60) return '刚刚';
      if (diff < 3600) return Math.floor(diff / 60) + '分钟前';
      if (diff < 86400) return Math.floor(diff / 3600) + '小时前';
      if (diff < 2592000) return Math.floor(diff / 86400) + '天前';
      const m = date.getMonth() + 1;
      const d = date.getDate();
      return m + '月' + d + '日';
    } catch (e) { console.warn('[user-home formatTime] error:', e, dateStr); return ''; }
  }
});
