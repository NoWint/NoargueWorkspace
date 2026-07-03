const { WxCalendar } = require('@lspriv/wx-calendar/lib');
const { LunarPlugin } = require('@lspriv/wc-plugin-lunar');
const { isLoggedIn, confirmRevokeIfShared } = require('../../utils/api.js');
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
    this.convertMarks();
    if (this.data.selectedDate) {
      this.searchTodos(this.data.selectedDate);
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

    this.setData({ marks });
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
      friendlySelectedDate: formatFriendlyDate(currentKey)
    });
  },

  // 修改原有的handleConfirm方法
  handleConfirm(e) {
    const { checked } = e.detail;
    const standardDate = new Date(
      checked.year,
      checked.month - 1,
      checked.day
    );
    this.searchTodos(standardDate);
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
});