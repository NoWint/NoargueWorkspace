const { workReportApi, combosApi } = require('../../utils/api.js');
const logger = require('../../utils/logger.js');

Page({
  data: {
    comboId: 0,
    comboName: '',
    isAdmin: false,
    members: [],
    minDate: new Date(2020, 0, 1).getTime(),
    maxDate: new Date(new Date().getFullYear() + 5, 11, 31).getTime(),
    today: new Date().getTime(),
    marks: [],
    calendarView: 'month',
    currentTab: 'daily',
    activeTabFlag: false,
    selectedDate: '',
    reports: [],
    showFilterPopup: false,
    selectedMemberId: '0',
    boardTitle: '',
  },

  onLoad(options) {
    const { combo_id } = options;
    this.setData({ comboId: parseInt(combo_id || 0) });
    this.loadComboInfo();
  },

  async loadComboInfo() {
    wx.showLoading({ title: '加载中...' });
    try {
      const result = await combosApi.getById(this.data.comboId);
      if (result.success) {
        this.setData({
          comboName: result.combo.name,
          members: result.combo.members || [],
        });
      }
      wx.hideLoading();
    } catch (err) {
      wx.hideLoading();
      logger.error('REPORT', 'BOARD_LOAD', '加载组合信息失败', err);
    }
  },

  handleLoad(e) {
    this.calendar = this.selectComponent('#boardCalendar');
    setTimeout(() => {
      const today = new Date();
      const dateStr = this.formatDate(today);
      this.setData({ selectedDate: dateStr });
      this.loadReports();
      this.updateBoardTitle();
    }, 300);
  },

  formatDate(date) {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  getMondayOfWeek(dateStr) {
    const d = new Date(dateStr.replace(/-/g, '/'));
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return this.formatDate(d);
  },

  getReportDateTitle(dateStr) {
    if (!dateStr) return '';
    const month = dateStr.substring(5, 7);
    const day = dateStr.substring(8, 10);
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const date = new Date(dateStr.replace(/-/g, '/'));
    const weekday = weekdays[date.getDay()] || '';
    return `${parseInt(month)}月${parseInt(day)}日 ${weekday}`;
  },

  getWeekNumber(dateStr) {
    const date = new Date(dateStr.replace(/-/g, '/'));
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const diff = date - startOfYear;
    const oneWeek = 604800000;
    return Math.ceil((((startOfYear.getDay() + 1) + diff) / oneWeek));
  },

  getWeekTitle(dateStr) {
    if (!dateStr) return '';
    // Use Thursday as ISO week anchor for consistent week numbers
    const d = new Date(dateStr.replace(/-/g, '/'));
    d.setDate(d.getDate() + (4 - d.getDay()));
    const weekNum = this.getWeekNumber(this.formatDate(d));
    return `${this.getReportDateTitle(dateStr)} · 第${weekNum}周`;
  },

  updateBoardTitle() {
    const { selectedDate, currentTab, comboName } = this.data;
    if (!selectedDate) return;
    const dateTitle = currentTab === 'weekly'
      ? this.getWeekTitle(selectedDate)
      : this.getReportDateTitle(selectedDate);
    this.setData({ boardTitle: dateTitle });
  },

  handleDateChange(e) {
    const { checked } = e.detail || {};
    if (!checked) return;
    const d = new Date(checked.year, checked.month - 1, checked.day);
    this.setData({ selectedDate: this.formatDate(d) });
    this.loadReports();
    this.updateBoardTitle();
  },

  handleViewChange(e) {
    if (this.data.activeTabFlag) { this.setData({ activeTabFlag: false }); return; }
    const detail = e.detail;
    // Month/year navigation: reload marks
    if (detail && typeof detail.year === 'number' && typeof detail.month === 'number') {
      const d = new Date(detail.year, detail.month - 1, 1);
      const firstDay = this.formatDate(d);
      const lastDay = this.formatDate(new Date(detail.year, detail.month, 0));
      this.loadMarksForRange(firstDay, lastDay);
      return;
    }
    const view = detail ? (detail.value || detail) : e;
    if (view === 'month' && this.data.currentTab === 'weekly') this.setData({ currentTab: 'daily' });
    else if (view === 'week' && this.data.currentTab === 'daily') this.setData({ currentTab: 'weekly' });
  },

  onTabChange(e) {
    const tab = e.detail.value;
    this.setData({ currentTab: tab, activeTabFlag: true });
    if (tab === 'daily') {
      this.setData({ calendarView: 'month' });
      if (this.calendar && this.calendar.toggleView) this.calendar.toggleView('month');
    } else {
      this.setData({ calendarView: 'week' });
      if (this.calendar && this.calendar.toggleView) this.calendar.toggleView('week');
    }
    this.loadReports();
    this.updateBoardTitle();
  },

  async loadReports() {
    const { comboId, currentTab, selectedDate, selectedMemberId } = this.data;
    if (!selectedDate) return;
    const params = { combo_id: comboId, type: currentTab };
    params.period_date = currentTab === 'daily' ? selectedDate : this.getMondayOfWeek(selectedDate);
    if (selectedMemberId !== '0') params.user_id = parseInt(selectedMemberId);
    try {
      wx.showLoading({ title: '加载中...' });
      const result = await workReportApi.getBoard(params);
      wx.hideLoading();
      if (result.success) {
        const boardData = result.data || {};
        const members = boardData.members || [];
        const reports = [];
        members.forEach(m => {
          (m.reports || []).forEach(r => {
            const content = r.content || {};
            const firstKey = Object.keys(content)[0];
            const firstLines = firstKey ? content[firstKey] : [];
            const firstLine = Array.isArray(firstLines) ? firstLines.find(l => l && l.trim()) : '';
            const lineCount = Object.values(content).reduce((c, lines) =>
              c + (Array.isArray(lines) ? lines.filter(l => l && l.trim()).length : 0), 0);
            reports.push({ ...r, nickname: m.nickname, avatarUrl: m.avatarUrl, summary: firstLine || '暂无记录', lineCount });
          });
        });
        this.setData({ reports });
      }
    } catch (err) { logger.error('REPORT', 'BOARD', '加载看板数据失败', err); wx.hideLoading(); }
    this.loadCalendarMarks();
  },

  async loadCalendarMarks() {
    const { selectedDate } = this.data;
    if (!selectedDate) return;
    const d = new Date(selectedDate.replace(/-/g, '/'));
    const firstDay = this.formatDate(new Date(d.getFullYear(), d.getMonth(), 1));
    const lastDay = this.formatDate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
    this.loadMarksForRange(firstDay, lastDay);
  },

  async loadMarksForRange(firstDay, lastDay) {
    const { comboId } = this.data;
    if (!comboId) return;
    try {
      const result = await workReportApi.getBoard({
        combo_id: comboId,
        date_from: firstDay,
        date_to: lastDay,
      });
      if (result.success) {
        const marks = [];
        (result.data?.members || []).forEach(m => {
          (m.reports || []).forEach(r => {
            if (r.periodDate) {
              marks.push({ date: r.periodDate, type: 'dot', color: '#ff8800' });
            }
          });
        });
        // Deduplicate dates
        const seen = new Set();
        const uniqueMarks = marks.filter(m => {
          if (seen.has(m.value)) return false;
          seen.add(m.value);
          return true;
        });
        this.setData({ marks: uniqueMarks });
      }
    } catch (err) { logger.error('REPORT', 'BOARD', '加载日历标记失败', err); }
  },

  navigateToDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/packagePages/report-detail/report-detail?id=${id}` });
  },

  showMemberFilter() { this.setData({ showFilterPopup: true }); },
  hideMemberFilter() { this.setData({ showFilterPopup: false }); },
  onFilterPopupVisibleChange(e) { if (!e.detail.visible) this.setData({ showFilterPopup: false }); },
  onMemberFilterChange(e) { this.setData({ selectedMemberId: e.detail.value, showFilterPopup: false }); this.loadReports(); },

  onFabTap() {
    const { comboId, currentTab, selectedDate } = this.data;
    const date = selectedDate || this.formatDate(new Date());
    const target = currentTab === 'daily' ? date : this.getMondayOfWeek(date);
    wx.navigateTo({ url: `/packagePages/report-edit/report-edit?type=${currentTab}&date=${target}&combo_id=${comboId}` });
  },

  navigateToReportTemplates() {
    wx.navigateTo({
      url: `/packageCombo/report-templates/report-templates?combo_id=${this.data.comboId}`
    });
  },

  handleReportSwipe(e) {
    const { type, id } = e.currentTarget.dataset;
    if (type === 'edit') {
      wx.navigateTo({
        url: `/packagePages/report-edit/report-edit?id=${encodeURIComponent(id)}`
      });
    } else if (type === 'delete') {
      wx.showModal({
        title: '删除确认',
        content: '确定删除该报告吗？删除后不可恢复。',
        confirmText: '删除',
        confirmColor: '#ff4d4f',
        success: async (res) => {
          if (res.confirm) {
            try {
              await workReportApi.delete(id);
              wx.showToast({ title: '已删除', icon: 'success' });
              this.loadReports();
            } catch (err) {
              wx.showToast({ title: '删除失败', icon: 'none' });
            }
          }
        }
      });
    }
  },

  goBack() { wx.navigateBack(); },
});
