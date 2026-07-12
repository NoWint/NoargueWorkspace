const app = getApp();
const { getLocalTodos } = require('../../utils/sync.js');
const { isLoggedIn, authApi, todosApi } = require('../../utils/api.js');

Page({
  data: {
    serviceFab: {
      openType: 'contact'
    },

    navBarHeight: app.globalData.navBarHeight,
    menuRight: app.globalData.menuRight,
    menuTop: app.globalData.menuTop,
    menuHeight: app.globalData.menuHeight,
    menuWidth: app.globalData.menuWidth,
    menuLeft: app.globalData.menuLeft,
    
    isLoggedIn: false,
    userInfo: null,
    nickname: '',
    avatarUrl: '',
    userId: '',
    openid: '',
    deletedCount: 0,
    latestVersion: '',
    isAdmin: false,
    totalPoints: -1
  },

  onShareAppMessage() {
    return {
      title: '时光绿径待办-您的每日任务足迹管家',
      path: '/pages/todo/todo',
      imageUrl: 'https://api.yzjtiantian.cn/uploads/logo/logo.png'
    }
  },

  onShareTimeline() {
    return {
      title: '时光绿径待办-您的每日任务足迹管家',
      path: '/pages/todo/todo',
      imageUrl: 'https://api.yzjtiantian.cn/uploads/logo/logo.png'
    }
  },

  onLoad() {
  },

  onShow() {
    this.checkLoginStatus();
    this.loadDeletedCount();
    this.loadLatestVersion();
    this.loadCheckinPoints();
  },

  async loadCheckinPoints() {
    if (!isLoggedIn()) return;
    try {
      const { checkinApi } = require('../../utils/api');
      const res = await checkinApi.getStatus();
      if (res.success && res.data) {
        this.setData({ totalPoints: res.data.totalPoints });
      }
    } catch (err) {
      // 静默失败，不阻塞页面
    }
  },

  loadLatestVersion() {
    const changelogList = app.globalData.changelogList || [];
    if (changelogList.length > 0) {
      const latestVersionInfo = changelogList[0];
      if (latestVersionInfo && latestVersionInfo.version) {
        this.setData({ latestVersion: latestVersionInfo.version });
      }
    }
  },

  async loadDeletedCount() {
    if (isLoggedIn()) {
      try {
        const result = await todosApi.getDeleted();
        if (result.success && result.todos) {
          this.setData({ deletedCount: result.todos.length });
          return;
        }
      } catch (err) {
        logger.error('SYNC', 'DELETED', '获取已删除待办数量失败', err);
      }
    }
    
    const allTodos = getLocalTodos();
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    
    const deletedCount = allTodos.filter(todo => 
      todo.isDeleted && todo.deletedAt && (now - todo.deletedAt < thirtyDaysMs)
    ).length;
    
    this.setData({ deletedCount });
  },

  async onPullDownRefresh() {
    if (this.data.isLoggedIn) {
      await this.loadUserInfo();
    }
    wx.stopPullDownRefresh();
  },

  checkLoginStatus() {
    const loggedIn = isLoggedIn();
    this.setData({ isLoggedIn: loggedIn });
    
    if (loggedIn && app.globalData.userInfo) {
      this.setData({
        userInfo: app.globalData.userInfo,
        nickname: app.globalData.userInfo.nickname || '',
        avatarUrl: app.globalData.userInfo.avatarUrl || '',
        userId: app.globalData.userInfo.id || '',
        openid: app.globalData.userInfo.openid || '',
        isAdmin: app.globalData.userInfo.isAdmin || false
      });
    } else if (loggedIn) {
      this.loadUserInfo();
    } else {
      this.setData({
        userInfo: null,
        nickname: '',
        avatarUrl: '',
        userId: '',
        openid: '',
        isAdmin: false
      });
    }
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
          isAdmin: result.user.isAdmin || false
        });
        app.setUserInfo(result.user);
      }
    } catch (err) {
      logger.error('AUTH', 'USERINFO', '加载用户信息失败', err);
    }
  },

  handleUserTap() {
    if (this.data.isLoggedIn) {
      wx.navigateTo({
        url: '/packagePages/user-center/user-center',
      });
    } else {
      wx.navigateTo({
        url: '/packagePages/login/login',
      });
    }
  },

  navigateToJoinCollab() {
    if (!isLoggedIn()) {
      wx.showModal({
        title: '需要登录',
        content: '加入协作需要登录后才能使用，是否前往登录？',
        confirmText: '去登录',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/packagePages/login/login' });
          }
        }
      });
      return;
    }
    wx.navigateTo({
      url: '/packageTools/join-collab/join-collab'
    });
  },

  goToMyReports() {
    wx.navigateTo({ url: '/packageAdmin/reports/reports' });
  },
});
