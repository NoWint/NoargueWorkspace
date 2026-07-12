const { communityApi, adminApi } = require('../../utils/api');

Page({
  data: {
    currentTab: 0,
    list: [],
    page: 1,
    hasMore: true,
    loading: false,
    refreshing: false
  },

  onLoad() {
    this.loadList(true);
  },

  switchTab(e) {
    const tab = parseInt(e.currentTarget.dataset.tab);
    this.setData({ currentTab: tab, list: [], page: 1, hasMore: true });
    this.loadList(true);
  },

  async loadList(reset = false) {
    if (this.data.loading) return;
    if (!reset && !this.data.hasMore) return;

    this.setData({ loading: true });

    try {
      const res = await communityApi.getReportList({ status: this.data.currentTab, page: this.data.page });
      if (res.success) {
        const raw = res.data.list || [];
        const list = raw.map(item => ({
          ...item,
          _createdAtDisplay: this.formatTime(item.createdAt)
        }));
        if (reset) {
          this.setData({ list });
        } else {
          this.setData({ list: [...this.data.list, ...list] });
        }
        this.setData({ hasMore: res.data.hasMore, page: this.data.page + 1 });
      }
    } catch (err) {
      logger.error('ADMIN', 'REPORTS', '加载举报列表失败', err);
        wx.showToast({ title: '加载失败', icon: 'none' });
    }

    this.setData({ loading: false });
  },

  async onRefresh() {
    this.setData({ refreshing: true, page: 1, hasMore: true });
    await this.loadList(true);
    this.setData({ refreshing: false });
  },

  loadMore() {
    if (this.data.hasMore) this.loadList(false);
  },

  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/packageAdmin/report-detail/report-detail?id=${id}` });
  },

  formatTime(dateStr) {
    if (!dateStr) return '';
    try {
      let date;
      if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(dateStr)) {
        date = new Date(dateStr);
      } else if (typeof dateStr === 'string') {
        const s = dateStr.replace('T', ' ').replace(/\.\d+Z$/, '');
        const p = s.split(/[- :]/);
        date = new Date(+p[0], +p[1] - 1, +p[2], +(p[3]||0), +(p[4]||0), +(p[5]||0));
      } else {
        date = new Date(dateStr);
      }
      if (isNaN(date.getTime())) return dateStr;
      const m = date.getMonth() + 1;
      const d = date.getDate();
      const h = String(date.getHours()).padStart(2, '0');
      const min = String(date.getMinutes()).padStart(2, '0');
      return date.getFullYear() + '年' + m + '月' + d + '日 ' + h + ':' + min;
    } catch (e) { return dateStr; }
  },

  goBack() {
    wx.navigateBack();
  }
});
