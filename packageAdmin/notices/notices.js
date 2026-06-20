const { adminApi } = require('../../utils/api');

Page({
  data: {
    notices: [],
    loading: false
  },

  onLoad() {
    this.loadNotices();
  },

  onShow() {
    this.loadNotices();
  },

  async loadNotices() {
    this.setData({ loading: true });
    try {
      const result = await adminApi.getNotices();
      logger.debug('ADMIN', 'NOTICES', '公告API返回', result);
      if (result.success) {
        this.setData({ notices: result.notices || [] });
      } else {
        logger.error('ADMIN', 'NOTICES', '加载公告失败', { msg: result.message });
        wx.showToast({ title: result.message || '加载失败', icon: 'none' });
      }
    } catch (err) {
      logger.error('ADMIN', 'NOTICES', '加载公告失败', err);
      wx.showToast({ title: err.message || '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  goToCreate() {
    wx.navigateTo({ url: '/packageAdmin/notice-edit/notice-edit' });
  },

  stopPropagation() {},

  editNotice(e) {
    const index = e.currentTarget.dataset.index;
    wx.navigateTo({ url: `/packageAdmin/notice-edit/notice-edit?index=${index}` });
  },

  async deleteNotice(e) {
    const index = e.currentTarget.dataset.index;
    const res = await wx.showModal({
      title: '确认删除',
      content: '确定要删除这条公告吗？'
    });
    if (res.confirm) {
      try {
        const result = await adminApi.deleteNotice(index);
        if (result.success) {
          wx.showToast({ title: '删除成功', icon: 'success' });
          this.loadNotices();
        }
      } catch (err) {
        wx.showToast({ title: '删除失败', icon: 'none' });
      }
    }
  }
});
