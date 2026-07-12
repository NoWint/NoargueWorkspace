const { adminApi } = require('../../utils/api');

const API_BASE_URL = 'https://api.yzjtiantian.cn';

function getFullAvatarUrl(avatarUrl) {
  if (!avatarUrl) return '/images/avatar.png';
  if (avatarUrl.startsWith('http')) return avatarUrl;
  return API_BASE_URL + avatarUrl;
}

Page({
  data: {
    users: [],
    searchText: '',
    page: 1,
    pageSize: 20,
    hasMore: true,
    loading: false,
    total: 0
  },

  onLoad() {
    this.loadUsers();
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadUsers();
    }
  },

  onPullDownRefresh() {
    this.setData({ page: 1, users: [], hasMore: true });
    this.loadUsers().then(() => wx.stopPullDownRefresh());
  },

  onSearchInput(e) {
    this.setData({ searchText: e.detail.value });
  },

  onSearch() {
    this.setData({ page: 1, users: [], hasMore: true });
    this.loadUsers();
  },

  async loadUsers() {
    if (this.data.loading) return;
    
    this.setData({ loading: true });
    try {
      const { users, searchText, page, pageSize } = this.data;
      const result = await adminApi.getUsers({
        page,
        pageSize,
        search: searchText
      });
      
      if (result.success) {
        const userList = result.data.list.map(user => ({
          ...user,
          avatar_url: getFullAvatarUrl(user.avatar_url)
        }));
        this.setData({
          users: page === 1 ? userList : [...users, ...userList],
          hasMore: result.data.list.length === pageSize,
          page: page + 1,
          total: result.data.total || 0
        });
      }
    } catch (err) {
      logger.error('ADMIN', 'USERS', '加载用户列表失败', err);
      wx.showToast({ title: '加载用户列表失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  goToUserDetail(e) {
    const userId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/packageAdmin/user-detail/user-detail?id=${userId}`
    });
  }
});
