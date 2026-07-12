const { communityApi } = require('../../utils/api');

Page({
  data: {
    reportId: null,
    report: {},
    resultNote: '',
    processing: false
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ reportId: parseInt(options.id) });
      this.loadDetail();
    }
  },

  async loadDetail() {
    try {
      const res = await communityApi.getReportDetail(this.data.reportId);
      if (res.success) {
        this.setData({
          report: {
            ...res.data,
            _createdAtDisplay: this.formatTime(res.data.createdAt),
            _processedAtDisplay: this.formatTime(res.data.processedAt)
          }
        });
      }
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  onNoteInput(e) {
    this.setData({ resultNote: e.detail.value });
  },

  async processReport(e) {
    const action = e.currentTarget.dataset.action;
    const actionText = action === 'delete' ? '删除内容并标记为已处理' : '驳回举报';

    wx.showModal({
      title: '确认操作',
      content: `确定要${actionText}吗？`,
      success: async (res) => {
        if (res.confirm) {
          this.setData({ processing: true });
          try {
            await communityApi.processReport(this.data.reportId, {
              action,
              resultNote: this.data.resultNote || null
            });
            wx.showToast({ title: '处理成功', icon: 'success' });
            this.loadDetail();
          } catch (err) {
            wx.showToast({ title: err.message || '处理失败', icon: 'none' });
          }
          this.setData({ processing: false });
        }
      }
    });
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
