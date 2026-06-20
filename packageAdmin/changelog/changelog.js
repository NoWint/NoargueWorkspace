const { adminApi } = require('../../utils/api');

Page({
  data: {
    changelog: [],
    loading: false
  },

  onLoad() {
    this.loadChangelog();
  },

  onShow() {
    this.loadChangelog();
  },

  async loadChangelog() {
    this.setData({ loading: true });
    try {
      const result = await adminApi.getChangelog();
      logger.debug('ADMIN', 'CHANGELOG', '更新日志API返回', result);
      if (result.success) {
        this.setData({ changelog: result.changelog || [] });
      } else {
        logger.error('ADMIN', 'CHANGELOG', '加载更新日志失败', { msg: result.message });
        wx.showToast({ title: result.message || '加载失败', icon: 'none' });
      }
    } catch (err) {
      logger.error('ADMIN', 'CHANGELOG', '加载更新日志失败', err);
      wx.showModal({
        title: '加载失败',
        content: err.message || '网络请求失败',
        showCancel: false
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  goToCreate() {
    wx.navigateTo({ url: '/packageAdmin/changelog-edit/changelog-edit' });
  },

  stopPropagation() {},

  editItem(e) {
    const index = e.currentTarget.dataset.index;
    wx.navigateTo({ url: `/packageAdmin/changelog-edit/changelog-edit?index=${index}` });
  },

  async deleteItem(e) {
    const index = e.currentTarget.dataset.index;
    const res = await wx.showModal({
      title: '确认删除',
      content: '确定要删除这个版本日志吗？'
    });
    if (res.confirm) {
      try {
        const result = await adminApi.deleteChangelog(index);
        if (result.success) {
          wx.showToast({ title: '删除成功', icon: 'success' });
          this.loadChangelog();
        }
      } catch (err) {
        wx.showToast({ title: '删除失败', icon: 'none' });
      }
    }
  }
});
