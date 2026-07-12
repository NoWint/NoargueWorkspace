const app = getApp();
const { checkinApi } = require('../../utils/api');

Page({
  data: {
    tabType: 'streak',
    leaderList: [],
    myRank: {},
    totalUsers: 0,
  },

  onLoad() {
    this.loadData();
  },

  onPullDownRefresh() {
    this.loadData().then(() => wx.stopPullDownRefresh());
  },

  async loadData() {
    try {
      const res = await checkinApi.getLeaderboard(this.data.tabType);
      if (res.success) {
        const list = (res.data.list || []).map(item => ({
          ...item,
          isMe: item.userId === (app.globalData.userInfo?.id || 0),
        }));
        this.setData({
          leaderList: list,
          myRank: res.data.myRank || {},
          totalUsers: res.data.totalUsers || 0,
        });
      }
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  onTabChange(e) {
    const tabType = e.detail.value;
    this.setData({ tabType, leaderList: [] }, () => this.loadData());
  },
});
