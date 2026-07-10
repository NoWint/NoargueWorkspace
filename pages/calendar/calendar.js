const { WxCalendar } = require('@lspriv/wx-calendar/lib');
const { LunarPlugin } = require('@lspriv/wc-plugin-lunar');
const { isLoggedIn, confirmRevokeIfShared, workReportApi } = require('../../utils/api.js');
const { getLocalTodos, saveTodo, getTodoById, deleteTodoById, syncWithCloud, addDeletedTodo } = require('../../utils/sync.js');
const { formatFriendlyDate } = require('../../utils/util.js');

WxCalendar.use(LunarPlugin);

const app = getApp();

Page({
  data: {
    // 导航栏相关
    navBarHeight: app.globalData.navBarHeight,
    menuRight: app.globalData.menuRight,
    menuTop: app.globalData.menuTop,
    menuHeight: app.globalData.menuHeight,
    menuWidth: app.globalData.menuWidth,
    menuLeft: app.globalData.menuLeft,

    minDate: new Date(2020, 0, 1).getTime(),
    maxDate: new Date(new Date().getFullYear() + 5, 11, 31).getTime(),
    today: new Date().getTime(),
    marks: [], // 初始化marks数组

    selectedTodos: [],
    selectedDate: '',
    friendlySelectedDate: '',

    currentTab: 'todo',
    calendarView: 'month',
    activeTabFlag: false,
    dailyReports: [],
    weeklyReports: [],
    reportDateStrings: [],
    lockIcon: '\u{1F512}',

    // 日报/周报工具栏文案
    dailyReportTitle: '',
    weeklyReportTitle: '',
  },

  // 日历日期格式化方法
  format(day) {
    const { date } = day;
    const key = `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2,'0')}-${date.getDate().toString().padStart(2,'0')}`;
    const cache = getApp().globalData.calendarCache[key];

    if (cache) {
        day.prefix = cache.count;
        const text = cache.sampleText || '';
        day.suffix = text.substring(0,3) + (text.length >3 ? '..' : '');
        day.className = 't-calendar__day--top';
    }
    return day;
  },

  onShareAppMessage() {
    return {
      title: '时光绿径待办-您的每日任务足迹管家',
      path: '/pages/todo/todo',
      imageUrl: 'https://api.yzjtiantian.cn/uploads/logo/logo.png'
    }
  },

  async autoSyncToCloud() {
    try {
      await syncWithCloud('local');
    } catch (err) {
      logger.error('SYNC', 'AUTO', '自动同步失败', err);
    }
  },

  onShareTimeline() {
    return {
      title: '时光绿径待办-您的每日任务足迹管家',
      path: '/pages/todo/todo',
      imageUrl: 'https://api.yzjtiantian.cn/uploads/logo/logo.png'
    }
  },

  onShow() {
    // 每次页面显示时刷新数据
    if (this.data.currentTab === 'todo') {
      this.setData({ reportDateStrings: [] });
    }
    this.convertMarks();
    if (this.data.selectedDate) {
      this.searchTodos(this.data.selectedDate);
      if (this.data.currentTab !== 'todo') {
        this.loadReports();
      }
    }
  },

  handleLoad(e) {
    this.calendar = this.selectComponent('#calendar');

    // 转换全局缓存为marks格式
    this.convertMarks();

    // 延迟300ms等待日历组件完全渲染后再初始化选中
    setTimeout(() => {
      const today = new Date();
      const todayDetail = {
        year: today.getFullYear(),
        month: today.getMonth() + 1,
        day: today.getDate()
      };
      this.handleConfirm({
        detail: {
          checked: todayDetail
        }
      });
    }, 300);
  },

  // 保持与全局缓存一致的格式化方法
  formatDate(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  convertMarks() {
    const cache = getApp().globalData.calendarCache;
    const marks = [];

    for (const key in cache) {
      const date = new Date(key);
      marks.push({
        date: date.getTime(),
        type: 'schedule',
        text: cache[key].sampleText?.split(',')[0]?.trim()
      });
    }

    // Add report dot marks if on report tabs and we have loaded report dates
    if ((this.data.currentTab === 'daily' || this.data.currentTab === 'weekly') && this.data.reportDateStrings.length > 0) {
      this.data.reportDateStrings.forEach(dateStr => {
        const d = new Date(dateStr);
        marks.push({
          date: d.getTime(),
          type: this.data.currentTab === 'daily' ? 'schedule' : 'annual',
          text: ''
        });
      });
    }

    this.setData({ marks });
  },

  updateReportMarks(reportDates) {
    this.setData({ reportDateStrings: reportDates }, () => {
      this.convertMarks();
    });
  },

  parseTime(timeStr) {
    const [hours, minutes] = (timeStr || '00:00').split(':').map(Number);
    return hours * 60 + minutes;
  },

  // 搜索指定日期的待办并按时间排序
  searchTodos(targetDate) {
    const dateObj = new Date(targetDate);
    const currentKey = this.formatDate(dateObj);

    const todos = getLocalTodos();
    const uniqueTodos = new Map();

    const filtered = todos.filter(todo => {
      if (todo.parent_id) return false;
      try {
        const todoDate = new Date(todo.setDate);
        const todoKey = this.formatDate(todoDate);
        const uniqueId = `${todo.text}|${todoKey}|${todo.remarks || ''}`;

        if (todoKey === currentKey && !uniqueTodos.has(uniqueId)) {
          uniqueTodos.set(uniqueId, true);
          return true;
        }
        return false;
      } catch (e) {
        logger.error('SYNC', 'DATE', '日期解析错误', { setDate: todo.setDate });
        return false;
      }
    });

    const sorted = filtered.sort((a, b) => {
      const aTime = this.parseTime(a.setTime || '23:59');
      const bTime = this.parseTime(b.setTime || '23:59');
      return aTime - bTime;
    }).map(todo => ({
      ...todo,
      friendlyDate: formatFriendlyDate(todo.setDate)
    }));

    this.setData({
      selectedTodos: sorted,
      selectedDate: currentKey,
      friendlySelectedDate: formatFriendlyDate(currentKey),
      dailyReportTitle: this.getReportDateTitle(currentKey),
      weeklyReportTitle: this.getWeekTitle(currentKey)
    });
  },

  // 修改原有的handleConfirm方法
  handleConfirm(e) {
    const { checked } = e.detail || {};
    if (!checked) return;
    const standardDate = new Date(
      checked.year,
      checked.month - 1,
      checked.day
    );
    this.searchTodos(standardDate);
    if (this.data.currentTab !== 'todo') {
      this.loadReports();
    }
  },


  // 复用todo页方法
  navigateToDetail(e) {
    if (e.target.dataset.component === 't-radio') {
      return;
    }

    const selectedIndex = e.currentTarget.dataset.index;
    const currentTodo = this.data.selectedTodos[selectedIndex];

    if (!currentTodo || !currentTodo.id) return;

    wx.navigateTo({
      url: `/packagePages/todo-detail/todo-detail?todoId=${encodeURIComponent(currentTodo.id)}`
    });
  },

  toggleTodo(e) {
    const index = e.currentTarget.dataset.index;
    const currentTodo = this.data.selectedTodos[index];
    const todo = getTodoById(currentTodo.id);

    if (todo) {
      const now = Date.now();
      todo.completed = !todo.completed ? now : false;
      todo.version = (todo.version || 1) + 1;
      todo.updatedAt = now;
      saveTodo(todo);

      this.searchTodos(this.data.selectedDate);
      getApp().updateCalendarCache(getLocalTodos());
      
      if (isLoggedIn()) {
        this.autoSyncToCloud();
      }
    }
  },

  deleteTodo(index) {
    const currentTodo = this.data.selectedTodos[index];

    // 分享撤回检测（同步读取）
    let shareId;
    try {
      const storedIds = wx.getStorageSync('_sharedSnapshotIds') || {};
      shareId = storedIds[currentTodo.id];
    } catch (e) {}

    const afterRevokeCheck = () => {
      const hasSubtasks = getLocalTodos().some(t => t.parent_id === currentTodo.id && !t.isDeleted);

      wx.showModal({
        title: '删除确认',
        content: hasSubtasks ? '该待办包含子待办，删除后子待办也将一同被删除，确定删除吗？' : '删除后保留 30 天，可在”更多-回收站”找回，确定删除吗？',
        confirmText: '删除',
        confirmColor: '#ff4d4f',
        success: (res) => {
          if (res.confirm) {
            const now = Date.now();
            const todo = getTodoById(currentTodo.id);
            if (todo) {
              todo.isDeleted = true;
              todo.deletedAt = now;
              todo.updatedAt = now;
              todo.version = (todo.version || 1) + 1;
              addDeletedTodo(todo);
              deleteTodoById(currentTodo.id, now);
            }
            this.searchTodos(this.data.selectedDate);
            getApp().updateCalendarCache(getLocalTodos());

            if (isLoggedIn()) {
              this.autoSyncToCloud();
            }
          }
        }
      });
    };

    if (shareId) {
      confirmRevokeIfShared(currentTodo.id, afterRevokeCheck);
    } else {
      afterRevokeCheck();
    }
  },

  editTodo(index) {
    const currentTodo = this.data.selectedTodos[index];
    const todos = getLocalTodos();
    const realIndex = todos.findIndex(t =>
      t.text === currentTodo.text &&
      t.setDate === currentTodo.setDate &&
      t.setTime === currentTodo.setTime
    );
    
    const locationStr = currentTodo.location ? encodeURIComponent(JSON.stringify(currentTodo.location)) : '';
    const tagsStr = currentTodo.tags ? encodeURIComponent(JSON.stringify(currentTodo.tags)) : '';

    app.globalData.editTodoImages = currentTodo.images || [];

    wx.navigateTo({
      url: `/packagePages/add-todo/add-todo?edit=1&index=${realIndex}&todoId=${encodeURIComponent(currentTodo.id)}&text=${encodeURIComponent(currentTodo.text)}&setDate=${currentTodo.setDate}&setTime=${currentTodo.setTime || '12:00'}&remarks=${encodeURIComponent(currentTodo.remarks || '')}&location=${locationStr}&time=${currentTodo.time || Date.now()}&isStar=${currentTodo.isStar || false}&priority=${currentTodo.priority || ''}&comboId=${currentTodo.comboId || ''}&tags=${tagsStr}&hasImages=${(currentTodo.images && currentTodo.images.length > 0) ? '1' : '0'}`
    });
  },

  handleSwipeAction(e) {
    const { type, index } = e.currentTarget.dataset;
    if (type === 'edit') {
      this.editTodo(index);
    } else if (type === 'delete') {
      this.deleteTodo(index);
    }
  },

  navigateToAdd() {
    const selectedDateStr = this.data.selectedDate || this.formatDate(new Date());
    wx.navigateTo({
      url: `/packagePages/add-todo/add-todo?setDate=${selectedDateStr}`
    });
  },

  onAdError(err) {
    logger.error('UI', 'AD', '原生模板广告加载失败', err);
  },

  // ---- 日报/周报 3-Tab 联动 ----

  onTabChange(e) {
    const tab = e.detail ? e.detail.value : e.value;
    this.setData({ currentTab: tab, activeTabFlag: true });

    // 切换日历视图: 日报对应月视图, 周报对应周视图
    if (tab === 'daily') {
      this.setData({ calendarView: 'month' });
      if (this.calendar && this.calendar.toggleView) this.calendar.toggleView('month');
    } else if (tab === 'weekly') {
      this.setData({ calendarView: 'week' });
      if (this.calendar && this.calendar.toggleView) this.calendar.toggleView('week');
    }

    // 加载对应报告
    if (tab !== 'todo' && this.data.selectedDate) {
      this.loadReports();
    } else if (tab === 'todo') {
      // Reset to todo marks
      this.setData({ reportDateStrings: [] });
      this.convertMarks();
    }
  },

  handleViewChange(e) {
    // 避免主动切换tab时触发循环
    if (this.data.activeTabFlag) {
      this.setData({ activeTabFlag: false });
      return;
    }

    // 用户手动滑动日历: month ↔ week 切换时自动切tab
    const view = e.detail ? e.detail.view : (e.view || 'month');
    const newTab = view === 'month' ? 'daily' : view === 'week' ? 'weekly' : this.data.currentTab;
    this.setData({ currentTab: newTab, calendarView: view });
    if (newTab !== 'todo' && this.data.selectedDate) {
      this.loadReports();
    }
  },

  async loadReports() {
    if (!this.data.selectedDate) return;

    try {
      // 加载日报
      const dailyRes = await workReportApi.getList({
        type: 'daily',
        period_date: this.data.selectedDate
      });
      const dailyList = (dailyRes.data && dailyRes.data.list) || dailyRes.list || dailyRes || [];
      const dailyReports = dailyList.map(item => this.formatReportItem(item));

      // 加载周报 (当前日期所在的周一)
      const monday = this.getMondayOfWeek(this.data.selectedDate);
      const weeklyRes = await workReportApi.getList({
        type: 'weekly',
        period_date: monday
      });
      const weeklyList = (weeklyRes.data && weeklyRes.data.list) || weeklyRes.list || weeklyRes || [];
      const weeklyReports = weeklyList.map(item => this.formatReportItem(item));

      // Collect report dates for dot marks
      const reportDates = this.data.currentTab === 'daily'
        ? dailyList.map(r => r.periodDate || r.period_date).filter(Boolean)
        : weeklyList.map(r => r.periodDate || r.period_date).filter(Boolean);

      this.setData({ dailyReports, weeklyReports });
      if (this.data.currentTab !== 'todo') {
        this.updateReportMarks(reportDates);
      }
    } catch (err) {
      logger.error('REPORT', 'LOAD', '加载报告失败', err);
    }
  },

  formatReportItem(item) {
    const content = item.content || {};
    const type = item.type || 'daily';
    const fallback = type === 'weekly' ? '周报' : '日报';

    // Extract first non-empty line from first section
    const firstKey = Object.keys(content)[0];
    const firstLines = firstKey ? content[firstKey] : [];
    const firstLine = Array.isArray(firstLines) ? firstLines.find(l => l && l.trim()) : '';

    // Count total non-empty lines
    const lineCount = Object.values(content).reduce((count, lines) => {
      if (Array.isArray(lines)) return count + lines.filter(l => l && l.trim()).length;
      return count;
    }, 0);

    const isPrivate = !item.comboId || item.comboId === 0;

    return {
      ...item,
      summary: firstLine || fallback,
      lineCount,
      scopeLabel: isPrivate ? '私人' : (item.comboName || '团队'),
    };
  },

  navigateToReportDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({
      url: `/packagePages/report-detail/report-detail?id=${encodeURIComponent(id)}`
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
        content: '确定删除该报告吗？',
        confirmText: '删除',
        confirmColor: '#ff4d4f',
        success: async (res) => {
          if (res.confirm) {
            try {
              await workReportApi.delete(id);
              wx.showToast({ title: '已删除', icon: 'success' });
              this.loadReports();
            } catch (err) {
              logger.error('REPORT', 'DELETE', '删除报告失败', err);
              wx.showToast({ title: '删除失败', icon: 'none' });
            }
          }
        }
      });
    }
  },

  getMondayOfWeek(dateStr) {
    const date = new Date(dateStr);
    const day = date.getDay(); // 0=周日, 1=周一 ...
    const diff = day === 0 ? -6 : 1 - day; // 周一偏移
    const monday = new Date(date);
    monday.setDate(date.getDate() + diff);
    const y = monday.getFullYear();
    const m = (monday.getMonth() + 1).toString().padStart(2, '0');
    const d = monday.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  getWeekNumber(dateStr) {
    const date = new Date(dateStr);
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const diff = date - startOfYear;
    const oneWeek = 604800000;
    return Math.ceil((((startOfYear.getDay() + 1) + diff) / oneWeek));
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

  getWeekTitle(dateStr) {
    if (!dateStr) return '';
    // Use Thursday as ISO week anchor for consistent week numbers
    const d = new Date(dateStr);
    d.setDate(d.getDate() + (4 - d.getDay()));
    const thursday = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
    const weekNum = this.getWeekNumber(thursday);
    return `${this.getReportDateTitle(dateStr)} · 第${weekNum}周`;
  },

  onFabTap() {
    const tab = this.data.currentTab;
    const selectedDateStr = this.data.selectedDate;

    if (tab === 'todo' || !tab) {
      wx.navigateTo({
        url: `/packagePages/add-todo/add-todo?setDate=${selectedDateStr}`
      });
    } else if (tab === 'daily') {
      wx.navigateTo({
        url: `/packagePages/report-edit/report-edit?type=daily&date=${selectedDateStr}`
      });
    } else if (tab === 'weekly') {
      const monday = this.getMondayOfWeek(selectedDateStr);
      wx.navigateTo({
        url: `/packagePages/report-edit/report-edit?type=weekly&date=${monday}`
      });
    }
  },

  navigateToPrivateTemplates() {
    wx.navigateTo({
      url: `/packageCombo/report-templates/report-templates?combo_id=0`
    });
  },
});