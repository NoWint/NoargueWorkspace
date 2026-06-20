const { adminApi } = require('../../utils/api');

const API_BASE_URL = 'https://api.yzjtiantian.cn';

function getFullAvatarUrl(avatarUrl) {
  if (!avatarUrl) return '/images/avatar.png';
  if (avatarUrl.startsWith('http')) return avatarUrl;
  return API_BASE_URL + avatarUrl;
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
    editNicknameValue: ''
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
          stats: result.stats || { totalTodos: 0, completedTodos: 0, assignedTodosCount: 0, commentsCount: 0 }
        });
      }
    } catch (err) {
      logger.error('ADMIN', 'USER', '加载用户详情失败', err);
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
    
    let parsedImages = [];
    if (todo.images) {
      if (typeof todo.images === 'string') {
        try {
          parsedImages = JSON.parse(todo.images);
        } catch (e) {}
      } else if (Array.isArray(todo.images)) {
        parsedImages = todo.images;
      }
    }
    
    let parsedLocation = null;
    if (todo.location) {
      if (typeof todo.location === 'string') {
        try {
          parsedLocation = JSON.parse(todo.location);
        } catch (e) {}
      } else if (typeof todo.location === 'object') {
        parsedLocation = todo.location;
      }
    }
    
    const todoData = {
      ...todo,
      images: parsedImages,
      location: parsedLocation
    };
    const creatorInfo = {
      nickname: this.data.user.nickname || '未知用户',
      avatar: this.data.user.avatar_url || '/images/avatar.png'
    };
    
    const todoStr = encodeURIComponent(JSON.stringify(todoData));
    const creatorStr = encodeURIComponent(JSON.stringify(creatorInfo));
    
    wx.navigateTo({
      url: `/packagePages/todo-detail/todo-detail?adminView=1&todoData=${todoStr}&creator=${creatorStr}`
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
  }
});
