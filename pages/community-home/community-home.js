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
    postTodoMap: {},
    isLoggedIn: false,
    checkinData: {
      checkedIn: false,
      streakDays: 0,
      totalPoints: 0,
    },
    badgeList: [],
    yearWeek: '',
    weekDays: [],
    checkinError: false,
  },

  onShow() {
    this._checkLogin();
    this.loadPosts(true);
    this.loadCheckinData();
  },

  onPullDownRefresh() {
    Promise.all([
      this.loadPosts(true),
      this.loadCheckinData(),
    ]).then(() => wx.stopPullDownRefresh());
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
    const postId = e.detail.postId;
    wx.navigateTo({ url: `/packageCommunity/post-detail/post-detail?postId=${postId}` });
  },

  goToEdit() {
    const token = wx.getStorageSync('authToken');
    if (!token) { wx.navigateTo({ url: '/packagePages/login/login' }); return; }
    wx.navigateTo({ url: '/packageCommunity/post-edit/post-edit' });
  },

  async toggleTodoExpand(e) {
    const postId = e.detail.postId;
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

  async toggleLike(e) {
    const postId = e.detail.postId;
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
    const { url, images } = e.detail;
    wx.previewImage({ current: url, urls: images && images.length ? images : [url] });
  },

  goToTodoDetail(e) {
    const { todoId, creatorName, creatorAvatar, creatorId, postId } = e.detail;
    if (!todoId) return;
    wx.navigateTo({
      url: `/packagePages/todo-detail/todo-detail?communityTodoId=${todoId}&creatorName=${encodeURIComponent(creatorName || '')}&creatorAvatar=${encodeURIComponent(creatorAvatar || '')}&creatorId=${creatorId || ''}&postId=${postId || ''}`
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

  onPostTapAuthor(e) {
    const { userId } = e.detail;
    if (!userId) return;
    wx.navigateTo({ url: `/packageProfile/user-home/user-home?userId=${userId}` });
  },

  onAvatarError(e) {
    e.target.src = '/images/avatar.png';
  },

  _checkLogin() {
    const token = wx.getStorageSync('authToken');
    this.setData({ isLoggedIn: !!token });
  },

  async loadCheckinData() {
    if (!this.data.isLoggedIn) return;
    try {
      const { checkinApi } = require('../../utils/api');
      const now = new Date();
      const [statusRes, monthRes] = await Promise.all([
        checkinApi.getStatus(),
        checkinApi.getMonth(now.getFullYear(), now.getMonth() + 1),
      ]);
      if (statusRes.success) {
        const d = statusRes.data;
        const checkedDates = monthRes.success ? monthRes.data.dates : [];
        this.setData({
          checkinData: d,
          badgeList: this._buildBadgeList(d.streakDays, d.registeredDays),
          yearWeek: this._computeYearWeek(),
          weekDays: this._buildWeekDays(d.checkedIn, checkedDates),
          checkinError: false,
        });
      }
    } catch (err) {
      this.setData({ checkinError: true });
    }
  },

  _computeYearWeek() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = (now - start) / 86400000;
    const week = Math.ceil((diff + start.getDay() + 1) / 7);
    return `${now.getFullYear()} · 第${week}周`;
  },

  _buildBadgeList(streakDays, registeredDays) {
    const list = [];
    if (streakDays >= 1) {
      const title = this._getTitle(streakDays);
      const color = this._getTitleColor(streakDays);
      list.push({ text: title, color });
      list.push({ text: `连签${streakDays}天`, color: '#00b26a' });
    }
    list.push({ text: `已注册${Math.max(1, registeredDays)}天`, color: '#999999' });
    return list;
  },

  _getTitle(days) {
    const t = { 1:'初来乍到', 3:'渐入佳境', 7:'坚持不懈', 15:'热情如火', 30:'持之以恒', 60:'绿径守护者', 100:'时光旅人', 365:'传奇永恒' };
    const keys = Object.keys(t).map(Number).sort((a,b) => b-a);
    for (const k of keys) { if (days >= k) return t[k]; }
    return '';
  },

  _getTitleColor(days) {
    const c = { 1:'#00b26a', 3:'#00b26a', 7:'#f59e0b', 15:'#f59e0b', 30:'#f97316', 60:'#f97316', 100:'#ec4899', 365:'#8b5cf6' };
    const keys = Object.keys(c).map(Number).sort((a,b) => b-a);
    for (const k of keys) { if (days >= k) return c[k]; }
    return '#00b26a';
  },

  _buildWeekDays(isCheckedIn, checkedDates = []) {
    const days = ['一', '二', '三', '四', '五', '六', '日'];
    const today = new Date();
    const todayBeijing = today.toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
    const todayDate = new Date(todayBeijing);

    return days.map((label, i) => {
      const dayOfWeek = todayDate.getDay() || 7;
      const diff = i + 1 - dayOfWeek;
      const date = new Date(todayDate);
      date.setDate(date.getDate() + diff);
      const dateStr = date.toISOString().slice(0, 10);
      const isToday = dateStr === todayBeijing;

      if (isToday && isCheckedIn) return { label, status: 'checked', display: '✓' };
      if (isToday) return { label, status: 'today', display: '今' };
      if (checkedDates.includes(dateStr)) return { label, status: 'checked', display: '✓' };
      return { label, status: 'future', display: '-' };
    });
  },

  async onCardCheckin(e) {
    if (this.data.checkinData.checkedIn) return;
    try {
      const { checkinApi } = require('../../utils/api');
      const res = await checkinApi.checkin();
      if (res.success) {
        const d = res.data;
        // Re-fetch month data to update week display
        const now = new Date();
        const monthRes = await checkinApi.getMonth(now.getFullYear(), now.getMonth() + 1);
        const checkedDates = monthRes.success ? monthRes.data.dates : [];
        this.setData({
          checkinData: d,
          badgeList: this._buildBadgeList(d.streakDays, d.registeredDays),
          weekDays: this._buildWeekDays(true, checkedDates),
        });
        wx.showToast({ title: `签到成功 +${d.todayPoints}分`, icon: 'success' });
      }
    } catch (err) {
      wx.showToast({ title: '签到失败', icon: 'none' });
    }
  },

  goToCheckin() {
    wx.navigateTo({ url: '/packagePages/checkin/checkin' });
  },

  goToLeaderboard() {
    wx.navigateTo({ url: '/packagePages/checkinLeaderboard/checkinLeaderboard' });
  },

  formatTime(dateStr) {
    if (!dateStr) return '';
    try {
      let date;
      if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(dateStr)) {
        date = new Date(dateStr);
      } else if (typeof dateStr === 'string') {
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
