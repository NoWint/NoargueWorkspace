const app = getApp();
const { configApi } = require('../../utils/api.js');

Page({
  data: {
    changelogList: [],
    loading: false
  },

  onShareAppMessage() {
    return {
      title: '时光绿径待办-更新日志',
      path: '/packagePages/changelog/changelog',
      imageUrl: 'https://api.yzjtiantian.cn/uploads/logo/logo.png'
    }
  },

  onShareTimeline() {
    return {
      title: '时光绿径待办-更新日志',
      path: '/packagePages/changelog/changelog',
      imageUrl: 'https://api.yzjtiantian.cn/uploads/logo/logo.png'
    }
  },

  onLoad() {
    this.loadChangelog();
  },

  async loadChangelog() {
    this.setData({ loading: true });
    
    try {
      const result = await configApi.getChangelog();
      if (result.success && result.changelogList) {
        this.setData({ changelogList: result.changelogList });
        app.globalData.changelogList = result.changelogList;
      }
    } catch (err) {
      logger.error('APP', 'CHANGELOG', '获取更新日志失败', err);
      if (app.globalData.changelogList) {
        this.setData({ changelogList: app.globalData.changelogList });
      }
    } finally {
      this.setData({ loading: false });
    }
  },

  async onPullDownRefresh() {
    await this.loadChangelog();
    wx.stopPullDownRefresh();
  }
});
