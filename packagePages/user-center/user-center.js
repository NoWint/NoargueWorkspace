const { getLocalTodos } = require('../../utils/sync.js');
const app = getApp();
const { authApi, isLoggedIn, setToken, getToken } = require('../../utils/api.js');

Page({
  data: {
    isLoggedIn: false,
    userInfo: null,
    
    nickname: '',
    avatarUrl: '',
    userId: '',
    openid: '',
    todoCount: 0,
    todoLimit: 100,
    comboCount: 0,
    comboLimit: 50,
    collabLimit: 5,
    collabCount: 0,
    
    isEditing: false,
    tempNickname: '',
    
    navBarHeight: app.globalData.navBarHeight,
    menuRight: app.globalData.menuRight
  },

  onLoad() {
    this.checkLoginStatus();
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

  checkLoginStatus() {
    const loggedIn = isLoggedIn();
    this.setData({ isLoggedIn: loggedIn });
    
    if (loggedIn) {
      this.loadUserInfo();
    }
  },

  loadLocalData() {
    const todos = getLocalTodos();
    const activeTodos = todos.filter(t => !t.isDeleted);
    const combos = app.globalData.combos || [];
    const sharedCombos = app.globalData.sharedCombos || [];
    const ownerSharedCombos = sharedCombos.filter(c => c.role === 'owner' || c.userRole === 'owner');
    
    this.setData({
      todoCount: activeTodos.length,
      comboCount: combos.length,
      collabCount: ownerSharedCombos.length
    });
  },

  async loadUserInfo() {
    try {
      const result = await authApi.getUserInfo();
      if (result.success && result.user) {
        this.setData({
          userInfo: result.user,
          nickname: result.user.nickname || '',
          avatarUrl: result.user.avatarUrl || '',
          userId: result.user.id || '',
          openid: result.user.openid || '',
          todoLimit: result.user.todoLimit || 100,
          comboLimit: result.user.comboLimit || 50,
          collabLimit: result.user.collabLimit || 5
        });
        app.setUserInfo(result.user);
      }
    } catch (err) {
      logger.error('AUTH', 'USERINFO', '加载用户信息失败', err);
    }
  },

  async handleLogin() {
    wx.showLoading({ title: '登录中...' });
    
    try {
      const loginRes = await new Promise((resolve, reject) => {
        wx.login({
          success: resolve,
          fail: reject
        });
      });
      
      const result = await authApi.login(loginRes.code);
      
      if (result.success) {
        setToken(result.token);
        this.setData({
          isLoggedIn: true,
          userInfo: result.user,
          nickname: result.user.nickname || '',
          avatarUrl: result.user.avatarUrl || '',
          todoLimit: result.user.todoLimit || 500,
          collabLimit: result.user.collabLimit || 5
        });
        
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

  handleLogout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          const { clearToken } = require('../../utils/api.js');
          clearToken();
          app.globalData.userInfo = null;
          app.globalData.isLoggedIn = false;
          
          wx.showToast({ title: '已退出登录', icon: 'success' });
          
          setTimeout(() => {
            wx.navigateBack();
          }, 500);
        }
      }
    });
  },

  chooseAvatar(e) {
    if (!this.data.isLoggedIn) {
      this.handleLogin();
      return;
    }
    
    const { avatarUrl } = e.detail;
    this.uploadAvatar(avatarUrl);
  },

  async uploadAvatar(tempFilePath) {
    wx.showLoading({ title: '上传中...' });
    
    try {
      const result = await authApi.uploadAvatar(tempFilePath);
      
      if (result.success && result.avatarUrl) {
        this.setData({ avatarUrl: result.avatarUrl });
        const updatedUserInfo = { ...this.data.userInfo, avatarUrl: result.avatarUrl };
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

  startEditNickname() {
    if (!this.data.isLoggedIn) return;
    
    this.setData({
      isEditing: true,
      tempNickname: this.data.nickname
    });
  },

  onNicknameInput(e) {
    this.setData({ tempNickname: e.detail.value });
  },

  onNicknameBlur(e) {
    const value = e.detail.value;
    if (value && value !== this.data.nickname) {
      this.setData({ tempNickname: value });
    }
  },

  cancelEdit() {
    this.setData({
      isEditing: false,
      tempNickname: ''
    });
  },

  confirmEdit() {
    const nickname = this.data.tempNickname.trim();
    if (!nickname) {
      wx.showToast({ title: '昵称不能为空', icon: 'none' });
      return;
    }
    
    if (nickname.length > 20) {
      const exceed = nickname.length - 20;
      wx.showToast({
        title: `用户名已超过20字上限，当前${nickname.length}字，需删除${exceed}字`,
        icon: 'none',
        duration: 3000
      });
      return;
    }
    
    this.setData({
      nickname,
      isEditing: false
    });
    this.saveUserInfo();
  },

  async saveUserInfo() {
    const { nickname, avatarUrl } = this.data;
    
    try {
      await authApi.updateUserInfo({
        nickname,
        avatarUrl
      });
      
      wx.showToast({ title: '保存成功', icon: 'success' });
    } catch (err) {
      logger.error('AUTH', 'SAVE', '保存用户信息失败', err);
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  },

  navigateTo(e) {
    const url = e.currentTarget.dataset.url;
    if (url) {
      wx.navigateTo({ url });
    }
  },

  copyUserId(e) {
    const value = e.currentTarget.dataset.value;
    if (value) {
      wx.setClipboardData({
        data: value,
        success: () => {
          wx.showToast({ title: '已复制用户ID', icon: 'success' });
        }
      });
    }
  },

  copyOpenid(e) {
    const value = e.currentTarget.dataset.value;
    if (value) {
      wx.setClipboardData({
        data: value,
        success: () => {
          wx.showToast({ title: '已复制OPENID', icon: 'success' });
        }
      });
    }
  },

  onShareAppMessage() {
    return {
      title: '时光绿径待办-您的每日任务足迹管家',
      path: '/pages/todo/todo',
      imageUrl: 'https://api.yzjtiantian.cn/uploads/logo/logo.png'
    };
  }
});
