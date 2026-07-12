const { getLocalTodos } = require('../../utils/sync.js');
const app = getApp();
const { authApi, isLoggedIn, setToken } = require('../../utils/api.js');

// 每日一言列表
const MOTTOS = [
  '每一步都算数，每一刻都珍贵',
  '日积跬步，终至千里',
  '今天的努力是明天的序章',
  '种一棵树最好的时间是十年前，其次是现在',
  '把待办变成已办，把目标变成现实',
  '持之以恒，滴水穿石',
  '不要让明天的自己，讨厌今天的拖延',
  '行动是治愈焦虑的良药',
  '做三四月的事，在八九月自有答案',
  '不积小流，无以成江海',
  '专注当下，静待花开',
  '慢慢来，比较快',
];

Page({
  data: {
    isLoggedIn: false,
    userInfo: null,
    nickname: '',
    avatarUrl: '',
    userId: '',
    openid: '',
    timeGreeting: '',
    greetingIcon: 'sunny',
    dailyMotto: '',
    isEditing: false,
    tempNickname: '',
    showInfo: false,

    todoCount: 0,
    todoLimit: 100,
    comboCount: 0,
    comboLimit: 0,
    collabCount: 0,
    collabLimit: 0,
    streakDays: 0,
    regDays: 0,
  },

  onLoad() {
    this.checkLoginStatus();
    this.initGreeting();
    this.initMotto();
  },

  onShow() {
    this.checkLoginStatus();
    this.loadLocalData();
  },

  async onPullDownRefresh() {
    if (this.data.isLoggedIn) {
      await this.loadUserInfo();
    }
    this.loadLocalData();
    wx.stopPullDownRefresh();
  },

  // ========== 时间问候 ==========
  initGreeting() {
    const hour = new Date().getHours();
    let greeting, icon;

    if (hour >= 5 && hour < 9) { greeting = '早上好'; icon = 'sunny'; }
    else if (hour >= 9 && hour < 12) { greeting = '上午好'; icon = 'sunny'; }
    else if (hour >= 12 && hour < 14) { greeting = '中午好'; icon = 'sunny'; }
    else if (hour >= 14 && hour < 18) { greeting = '下午好'; icon = 'sunny'; }
    else if (hour >= 18 && hour < 22) { greeting = '晚上好'; icon = 'moon'; }
    else { greeting = '夜深了'; icon = 'moon'; }

    this.setData({ timeGreeting: greeting, greetingIcon: icon });
  },

  // ========== 每日一言 ==========
  initMotto() {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    this.setData({ dailyMotto: MOTTOS[dayOfYear % MOTTOS.length] });
  },

  // ========== 登录状态 ==========
  checkLoginStatus() {
    const loggedIn = isLoggedIn();
    this.setData({ isLoggedIn: loggedIn });
    if (loggedIn) this.loadUserInfo();
  },

  // ========== 加载用户信息 ==========
  async loadUserInfo() {
    try {
      const result = await authApi.getUserInfo();
      if (result.success && result.user) {
        const user = result.user;
        let regDays = this.data.regDays;
        if (user.createdAt) {
          regDays = Math.floor((Date.now() - new Date(user.createdAt).getTime()) / 86400000) + 1;
        }
        this.setData({
          userInfo: user,
          nickname: user.nickname || '',
          avatarUrl: user.avatarUrl || '',
          userId: user.id || '',
          openid: user.openid || '',
          todoLimit: user.todoLimit || 100,
          comboLimit: user.comboLimit || 0,
          collabLimit: user.collabLimit || 0,
          regDays,
        });
        app.setUserInfo(user);
        this.loadLocalData();
      }
    } catch (err) {
      logger.error('AUTH', 'USERINFO', '加载用户信息失败', err);
    }
  },

  // ========== 加载本地统计数据 ==========
  loadLocalData() {
    if (!this.data.isLoggedIn) return;

    const todos = getLocalTodos();
    const activeTodos = todos.filter(t => !t.isDeleted);
    const combos = app.globalData.combos || [];
    const sharedCombos = app.globalData.sharedCombos || [];

    // 连续使用天数
    const activeDays = new Set();
    activeTodos.forEach(t => {
      if (t.time) {
        const d = new Date(t.time);
        activeDays.add(`${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`);
      }
    });
    const sortedDays = Array.from(activeDays).sort().reverse();
    let streak = 0;
    if (sortedDays.length > 0) {
      const today = new Date();
      const todayKey = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
      const yesterday = new Date(Date.now() - 86400000);
      const yesterdayKey = `${yesterday.getFullYear()}-${yesterday.getMonth() + 1}-${yesterday.getDate()}`;
      if (sortedDays[0] === todayKey || sortedDays[0] === yesterdayKey) {
        streak = 1;
        for (let i = 1; i < sortedDays.length; i++) {
          const prev = new Date(sortedDays[i - 1]);
          const curr = new Date(sortedDays[i]);
          if (Math.round((prev.getTime() - curr.getTime()) / 86400000) === 1) {
            streak++;
          } else { break; }
        }
      }
    }

    this.setData({
      todoCount: activeTodos.length,
      comboCount: combos.length,
      collabCount: sharedCombos.filter(c => c.role === 'owner' || c.userRole === 'owner').length,
      streakDays: streak,
    });
  },

  // ========== 登录 ==========
  async handleLogin() {
    wx.showLoading({ title: '登录中...' });

    try {
      const loginRes = await wx.login();
      const result = await authApi.login(loginRes.code);

      if (result.success) {
        setToken(result.token);
        const user = result.user;
        this.setData({
          isLoggedIn: true,
          userInfo: user,
          nickname: user.nickname || '',
          avatarUrl: user.avatarUrl || '',
          todoLimit: user.todoLimit || 100,
          comboLimit: user.comboLimit || 0,
          collabLimit: user.collabLimit || 0,
        });
        app.setUserInfo(user);
        this.loadLocalData();
        wx.showToast({ title: '登录成功', icon: 'success' });
      } else {
        throw new Error(result.message || '登录失败');
      }
    } catch (err) {
      logger.error('AUTH', 'LOGIN', '登录失败', err);
      wx.showToast({ title: err.message || '登录失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // ========== 退出登录 ==========
  handleLogout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      confirmColor: '#e34d59',
      success: (res) => {
        if (res.confirm) {
          const { clearToken } = require('../../utils/api.js');
          clearToken();
          app.globalData.userInfo = null;
          app.globalData.isLoggedIn = false;

          wx.showToast({ title: '已退出登录', icon: 'success' });
          setTimeout(() => wx.navigateBack(), 500);
        }
      },
    });
  },

  // ========== 头像 ==========
  chooseAvatar(e) {
    if (!this.data.isLoggedIn) { this.handleLogin(); return; }
    const { avatarUrl } = e.detail;
    this.uploadAvatar(avatarUrl);
  },

  async uploadAvatar(tempFilePath) {
    wx.showLoading({ title: '上传中...' });
    try {
      const result = await authApi.uploadAvatar(tempFilePath);
      if (result.success && result.avatarUrl) {
        this.setData({ avatarUrl: result.avatarUrl });
        const updatedUserInfo = { ...(this.data.userInfo || {}), avatarUrl: result.avatarUrl };
        this.setData({ userInfo: updatedUserInfo });
        app.setUserInfo(updatedUserInfo);
        wx.showToast({ title: '头像已更新', icon: 'success' });
      } else {
        throw new Error(result.message || '上传失败');
      }
    } catch (err) {
      logger.error('UPLOAD', 'AVATAR', '上传头像失败', err);
      wx.showToast({ title: err.message || '上传失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // ========== 昵称编辑 ==========
  startEditNickname() {
    if (!this.data.isLoggedIn) return;
    this.setData({ isEditing: true, tempNickname: this.data.nickname });
  },

  onNicknameInput(e) { this.setData({ tempNickname: e.detail.value }); },

  onNicknameBlur(e) {
    const value = e.detail.value;
    if (value && value !== this.data.nickname) {
      this.setData({ tempNickname: value });
    }
  },

  cancelEdit() { this.setData({ isEditing: false, tempNickname: '' }); },

  confirmEdit() {
    const nickname = this.data.tempNickname.trim();
    if (!nickname) {
      wx.showToast({ title: '昵称不能为空', icon: 'none' });
      return;
    }
    if (nickname.length > 20) {
      wx.showToast({ title: `昵称不能超过20个字`, icon: 'none' });
      return;
    }
    this.setData({ nickname, isEditing: false });
    this.saveUserInfo();
  },

  async saveUserInfo() {
    const { nickname, avatarUrl } = this.data;
    try {
      await authApi.updateUserInfo({ nickname, avatarUrl });
      wx.showToast({ title: '保存成功', icon: 'success' });
    } catch (err) {
      logger.error('AUTH', 'SAVE', '保存用户信息失败', err);
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  },

  // ========== 折叠账号信息 ==========
  toggleInfo() { this.setData({ showInfo: !this.data.showInfo }); },

  // ========== 复制 ==========
  copyUserId(e) {
    const value = e.currentTarget.dataset.value;
    if (value) {
      wx.setClipboardData({ data: value, success: () => wx.showToast({ title: '已复制用户ID', icon: 'success' }) });
    }
  },

  copyOpenid(e) {
    const value = e.currentTarget.dataset.value;
    if (value) {
      wx.setClipboardData({ data: value, success: () => wx.showToast({ title: '已复制OPENID', icon: 'success' }) });
    }
  },

  // ========== 日报/周报模板设置 ==========
  navigateToPrivateTemplates() {
    wx.navigateTo({
      url: `/packageCombo/report-templates/report-templates?combo_id=0&type=daily`
    });
  },

  // ========== 分享 ==========
  onShareAppMessage() {
    return {
      title: '时光绿径待办-您的每日任务足迹管家',
      path: '/pages/todo/todo',
      imageUrl: 'https://api.yzjtiantian.cn/uploads/logo/logo.png',
    };
  },
});
