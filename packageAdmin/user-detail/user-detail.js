const { adminApi } = require('../../utils/api');

const API_BASE_URL = 'https://api.yzjtiantian.cn';

function getFullAvatarUrl(avatarUrl) {
  if (!avatarUrl) return '/images/avatar.png';
  if (avatarUrl.startsWith('http')) return avatarUrl;
  return API_BASE_URL + avatarUrl;
}

function parseBadgeArray(val) {
  if (!val) return [];
  try { return JSON.parse(val); } catch { return []; }
}

Page({
  data: {
    userId: null,
    user: {},
    limits: {
      todo_limit: 100,
      combo_limit: 10,
      collab_limit: 5
    },
    todos: [],
    combos: [],
    sharedCombos: [],
    assignedTodos: [],
    assignedTodosFlat: [],
    comments: [],
    stats: {
      totalTodos: 0,
      completedTodos: 0,
      assignedTodosCount: 0,
      commentsCount: 0
    },
    showAssignedMode: 'group',
    editNicknameVisible: false,
    editNicknameValue: '',
    badgeTitles: [],
    badgeColors: []
  },

  onLoad(options) {
    logger.debug('ADMIN', 'USER', '用户详情页面参数', options);
    this.setData({ userId: options.id });
    logger.debug('ADMIN', 'USER', '用户详情ID', { userId: this.data.userId });
    this.loadUserDetail();
  },

  async onPullDownRefresh() {
    await this.loadUserDetail();
    wx.stopPullDownRefresh();
  },

  async loadUserDetail() {
    try {
      const result = await adminApi.getUserDetail(this.data.userId);
      logger.debug('ADMIN', 'DATA', '加载用户详情结果', { keys: Object.keys(result) });
      if (result.success) {
        const user = {
          ...result.user,
          avatar_url: getFullAvatarUrl(result.user.avatar_url)
        };
        this.setData({
          user,
          limits: {
            todo_limit: result.user.todo_limit || 100,
            combo_limit: result.user.combo_limit || 10,
            collab_limit: result.user.collab_limit || 5
          },
          todos: result.todos || [],
          combos: result.combos || [],
          sharedCombos: result.sharedCombos || [],
          assignedTodos: result.assignedTodos || [],
          assignedTodosFlat: result.assignedTodosFlat || [],
          comments: result.comments || [],
          stats: result.stats || { totalTodos: 0, completedTodos: 0, assignedTodosCount: 0, commentsCount: 0 },
          badgeTitles: parseBadgeArray(result.user.badge_titles),
          badgeColors: parseBadgeArray(result.user.badge_colors)
        });
      }
    } catch (err) {
      logger.error('ADMIN', 'USER', '加载用户详情失败', err);
      wx.showToast({ title: '加载用户详情失败', icon: 'none' });
    }
  },

  decreaseLimit(e) {
    const field = e.currentTarget.dataset.field;
    const value = this.data.limits[field];
    if (value > 0) {
      this.setData({ [`limits.${field}`]: value - 1 });
    }
  },

  increaseLimit(e) {
    const field = e.currentTarget.dataset.field;
    const value = this.data.limits[field];
    this.setData({ [`limits.${field}`]: value + 1 });
  },

  async saveLimits() {
    try {
      const result = await adminApi.updateUserLimits(this.data.userId, this.data.limits);
      if (result.success) {
        wx.showToast({ title: '保存成功', icon: 'success' });
      }
    } catch (err) {
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  },

  viewTodo(e) {
    const todo = e.currentTarget.dataset.todo;

    wx.navigateTo({
      url: `/packagePages/todo-detail/todo-detail?adminView=1&todoId=${encodeURIComponent(todo.todo_id || todo.id)}&userId=${this.data.userId}`
    });
  },

  viewCombo(e) {
    const combo = e.currentTarget.dataset.combo;
    const userId = this.data.userId;
    logger.debug('ADMIN', 'DATA', '查看组合数据', this.data);
    wx.navigateTo({
      url: `/packageCombo/combo-detail/combo-detail?adminView=1&id=${combo.id}&userId=${userId}`
    });
  },

  copyOpenid(e) {
    const value = e.currentTarget.dataset.value;
    if (value) {
      wx.setClipboardData({
        data: value,
        success: () => {
          wx.showToast({ title: '已复制OpenID', icon: 'success' });
        }
      });
    }
  },

  toggleAssignedMode() {
    const newMode = this.data.showAssignedMode === 'group' ? 'flat' : 'group';
    this.setData({ showAssignedMode: newMode });
  },

  showEditNickname() {
    this.setData({
      editNicknameVisible: true,
      editNicknameValue: this.data.user.nickname || ''
    });
  },

  onNicknameInput(e) {
    this.setData({ editNicknameValue: e.detail.value });
  },

  hideEditNickname() {
    this.setData({ editNicknameVisible: false });
  },

  async saveNickname() {
    const nickname = this.data.editNicknameValue.trim();
    if (!nickname) {
      wx.showToast({ title: '昵称不能为空', icon: 'none' });
      return;
    }
    if (nickname.length > 20) {
      wx.showToast({ title: '昵称不能超过20个字符', icon: 'none' });
      return;
    }
    
    try {
      const result = await adminApi.updateUserNickname(this.data.userId, nickname);
      if (result.success) {
        this.setData({
          'user.nickname': nickname,
          editNicknameVisible: false
        });
        wx.showToast({ title: '修改成功', icon: 'success' });
      }
    } catch (err) {
      wx.showToast({ title: '修改失败', icon: 'none' });
    }
  },

  copyShareCode(e) {
    const code = e.currentTarget.dataset.code;
    if (code) {
      wx.setClipboardData({
        data: code,
        success: () => {
          wx.showToast({ title: '邀请码已复制', icon: 'success' });
        }
      });
    }
  },

  addBadge() {
    const titles = [...this.data.badgeTitles, '新称号'];
    const colors = [...this.data.badgeColors, '#00b26a'];
    this.setData({ badgeTitles: titles, badgeColors: colors });
  },

  removeBadge(e) {
    const idx = e.currentTarget.dataset.index;
    const titles = [...this.data.badgeTitles];
    const colors = [...this.data.badgeColors];
    titles.splice(idx, 1);
    colors.splice(idx, 1);
    this.setData({ badgeTitles: titles, badgeColors: colors });
  },

  onBadgeTitleInput(e) {
    const idx = e.currentTarget.dataset.index;
    const titles = [...this.data.badgeTitles];
    titles[idx] = e.detail.value;
    this.setData({ badgeTitles: titles });
  },

  onBadgeColorInput(e) {
    const idx = e.currentTarget.dataset.index;
    const colors = [...this.data.badgeColors];
    colors[idx] = e.detail.value;
    this.setData({ badgeColors: colors });
  },

  async saveBadges() {
    try {
      const result = await adminApi.updateUserBadges(this.data.userId, {
        badgeTitles: this.data.badgeTitles,
        badgeColors: this.data.badgeColors
      });
      if (result.success) {
        wx.showToast({ title: '保存成功', icon: 'success' });
      }
    } catch (err) {
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  }
});
