const { authApi, isLoggedIn } = require('../../utils/api.js');

Page({
  data: {
    todoLimit: 500,
    loading: false,
    adLoaded: false
  },

  rewardedVideoAd: null,

  onLoad() {
    this.loadTodoLimit();
    this.initRewardedVideoAd();
  },

  initRewardedVideoAd() {
    if (!wx.createRewardedVideoAd) {
      this.setData({ adLoaded: false });
      return;
    }
    
    this.rewardedVideoAd = wx.createRewardedVideoAd({
      adUnitId: 'adunit-4464c9887c331e0e'
    });
    
    this.rewardedVideoAd.onLoad(() => {
      this.setData({ adLoaded: true });
    });
    
    this.rewardedVideoAd.onError((err) => {
      logger.error('UI', 'AD', '激励视频广告错误', err);
      this.setData({ adLoaded: false });
    });
    
    this.rewardedVideoAd.onClose((res) => {
      if (res && res.isEnded) {
        this.increaseLimit();
      } else {
        wx.showToast({ title: '需观看完整广告', icon: 'none' });
      }
    });
  },

  async loadTodoLimit() {
    if (!isLoggedIn()) return;
    
    try {
      const result = await authApi.getUserInfo();
      if (result.success && result.user) {
        this.setData({ todoLimit: result.user.todoLimit || 500 });
      }
    } catch (err) {
      logger.error('AUTH', 'LIMIT', '获取待办上限失败', err);
    }
  },

  async increaseLimit() {
    if (this.data.loading) return;
    this.setData({ loading: true });

    try {
      const result = await authApi.increaseTodoLimit(10);
      if (result.success) {
        this.setData({ todoLimit: result.todoLimit });
        wx.showToast({ title: '待办上限 +10', icon: 'success' });
      } else {
        throw new Error(result.message || '操作失败');
      }
    } catch (err) {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  watchAd() {
    if (!this.rewardedVideoAd) {
      wx.showToast({ title: '广告暂不可用', icon: 'none' });
      return;
    }
    
    this.rewardedVideoAd.show().catch(() => {
      this.setData({ adLoaded: false });
      this.rewardedVideoAd.load().then(() => {
        this.rewardedVideoAd.show().catch(() => {
          this.setData({ adLoaded: true });
          wx.showToast({ title: '广告展示失败', icon: 'none' });
        });
      }).catch(() => {
        wx.showToast({ title: '广告加载失败，请稍后重试', icon: 'none' });
      });
    });
  }
});
