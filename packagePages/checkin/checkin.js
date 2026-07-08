const { checkinApi } = require('../../utils/api');

Page({
  data: {
    checkedIn: false,
    streakDays: 0,
    totalPoints: 0,
    monthCount: 0,
    totalCheckins: 0,
    yearWeek: '',
    badgeList: [],
    calendarTitle: '',
    calendarDays: [],
    milestones: [
      { day: 7, title: '坚持不懈', points: 20, achieved: false },
      { day: 15, title: '热情如火', points: 50, achieved: false },
      { day: 30, title: '持之以恒', points: 100, achieved: false },
      { day: 60, title: '绿径守护者', points: 200, achieved: false },
    ],
    currentYear: 0,
    currentMonth: 0,
  },

  onLoad() {
    const now = new Date();
    this.setData({
      currentYear: now.getFullYear(),
      currentMonth: now.getMonth() + 1,
    });
    this._computeYearWeek();
    this.loadAllData();
  },

  onPullDownRefresh() {
    this.loadAllData().then(() => wx.stopPullDownRefresh());
  },

  async loadAllData() {
    try {
      const [statusRes, monthRes] = await Promise.all([
        checkinApi.getStatus(),
        checkinApi.getMonth(this.data.currentYear, this.data.currentMonth),
      ]);

      if (statusRes.success) {
        const d = statusRes.data;
        this.setData({
          checkedIn: d.checkedIn,
          streakDays: d.streakDays,
          totalPoints: d.totalPoints,
          totalCheckins: d.totalCheckins || 0,
          badgeList: this._buildBadgeList(d.streakDays, d.registeredDays),
        });
      }

      if (monthRes.success) {
        const d = monthRes.data;
        this.setData({ monthCount: d.count });
        this._buildCalendar(d.dates);
      }

      // 加载里程碑完成状态
      await this._loadMilestones();
    } catch (err) {
      console.error('加载签到数据失败', err);
    }
  },

  _computeYearWeek() {
    const now = new Date();
    const year = now.getFullYear();
    const start = new Date(year, 0, 1);
    const diff = (now - start) / 86400000;
    const week = Math.ceil((diff + start.getDay() + 1) / 7);
    this.setData({ yearWeek: `${year} · 第${week}周` });
  },

  _buildBadgeList(streakDays, registeredDays) {
    const list = [];
    if (streakDays >= 1) {
      const title = this._getTitle(streakDays);
      const color = this._getTitleColor(streakDays);
      list.push({ text: title, color });
      list.push({ text: `连签${streakDays}天`, color: '#00b26a' });
    }
    list.push({ text: `注册${registeredDays}天`, color: '#999999' });
    return list;
  },

  _getTitle(days) {
    const table = { 1: '初来乍到', 3: '渐入佳境', 7: '坚持不懈', 15: '热情如火', 30: '持之以恒', 60: '绿径守护者', 100: '时光旅人', 365: '传奇永恒' };
    const keys = Object.keys(table).map(Number).sort((a, b) => b - a);
    for (const k of keys) { if (days >= k) return table[k]; }
    return '';
  },

  _getTitleColor(days) {
    const table = { 1: '#00b26a', 3: '#00b26a', 7: '#f59e0b', 15: '#f59e0b', 30: '#f97316', 60: '#f97316', 100: '#ec4899', 365: '#8b5cf6' };
    const keys = Object.keys(table).map(Number).sort((a, b) => b - a);
    for (const k of keys) { if (days >= k) return table[k]; }
    return '#00b26a';
  },

  _buildCalendar(checkedDates) {
    const { currentYear: year, currentMonth: month } = this.data;
    this.setData({ calendarTitle: `${year}年${month}月` });

    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const calendarDays = [];
    // 上月补齐
    for (let i = 0; i < firstDay; i++) {
      calendarDays.push({ day: '', isCurrentMonth: false, isChecked: false, isToday: false });
    }
    // 本月
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      calendarDays.push({
        day: d,
        isCurrentMonth: true,
        isChecked: checkedDates.includes(dateStr),
        isToday: dateStr === todayStr,
      });
    }

    this.setData({ calendarDays });
  },

  async _loadMilestones() {
    const { streakDays } = this.data;
    const milestones = this.data.milestones.map(m => ({
      ...m,
      achieved: streakDays >= m.day,
    }));
    this.setData({ milestones });
  },

  async onCheckin() {
    if (this.data.checkedIn) return;
    try {
      const res = await checkinApi.checkin();
      if (res.success) {
        const d = res.data;
        this.setData({
          checkedIn: true,
          streakDays: d.streakDays,
          totalPoints: d.totalPoints,
          totalCheckins: d.totalCheckins || 0,
          badgeList: this._buildBadgeList(d.streakDays, d.registeredDays),
        });
        this._loadMilestones();
        // 刷新当月月历数据
        this._loadMonthData();
        wx.showToast({ title: `签到成功 +${d.todayPoints}分`, icon: 'success' });
      }
    } catch (err) {
      wx.showToast({ title: '签到失败', icon: 'none' });
    }
  },

  prevMonth() {
    let { currentYear, currentMonth } = this.data;
    currentMonth--;
    if (currentMonth < 1) { currentMonth = 12; currentYear--; }
    this.setData({ currentYear, currentMonth });
    this._loadMonthData();
  },

  nextMonth() {
    let { currentYear, currentMonth } = this.data;
    currentMonth++;
    if (currentMonth > 12) { currentMonth = 1; currentYear++; }
    this.setData({ currentYear, currentMonth });
    this._loadMonthData();
  },

  async _loadMonthData() {
    try {
      const res = await checkinApi.getMonth(this.data.currentYear, this.data.currentMonth);
      if (res.success) {
        this._buildCalendar(res.data.dates);
      }
    } catch (err) {
      console.error('加载月历数据失败', err);
    }
  },

  goToLeaderboard() {
    wx.navigateTo({ url: '/packagePages/checkinLeaderboard/checkinLeaderboard' });
  },
});
