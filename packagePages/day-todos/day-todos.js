const { isLoggedIn, confirmRevokeIfShared } = require('../../utils/api.js');
const { getLocalTodos, saveTodo, getTodoById, deleteTodoById, addDeletedTodo, syncWithCloud } = require('../../utils/sync.js');
const { formatFriendlyDate } = require('../../utils/util.js');

const app = getApp();

Page({
  data: {
    navBarHeight: app.globalData.navBarHeight,
    menuRight: app.globalData.menuRight,
    menuTop: app.globalData.menuTop,
    menuHeight: app.globalData.menuHeight,
    menuWidth: app.globalData.menuWidth,
    menuLeft: app.globalData.menuLeft,

    selectedDate: '',
    friendlyDate: '',
    todos: [],
  },

  onLoad(options) {
    const { date } = options;
    if (date) {
      this.setData({
        selectedDate: date,
        friendlyDate: formatFriendlyDate(date),
      });
      this.loadTodos(date);
    }
  },

  onShow() {
    if (this.data.selectedDate) {
      this.loadTodos(this.data.selectedDate);
    }
  },

  async autoSyncToCloud() {
    try {
      await syncWithCloud('local');
    } catch (err) {
      logger.error('SYNC', 'AUTO', '自动同步失败', err);
    }
  },

  onShareAppMessage() {
    return {
      title: '时光绿径待办-我的待办清单',
      path: '/pages/todo/todo',
      imageUrl: 'https://api.yzjtiantian.cn/uploads/logo/logo.png',
    };
  },

  onShareTimeline() {
    return {
      title: '时光绿径待办-我的待办清单',
      path: '/pages/todo/todo',
      imageUrl: 'https://api.yzjtiantian.cn/uploads/logo/logo.png',
    };
  },

  parseTime(timeStr) {
    const [hours, minutes] = (timeStr || '00:00').split(':').map(Number);
    return hours * 60 + minutes;
  },

  loadTodos(targetDate) {
    const todos = getLocalTodos();
    const filtered = todos.filter(todo => {
      if (todo.parent_id) return false;
      if (todo.isDeleted) return false;
      try {
        const todoDate = new Date(todo.setDate);
        const year = todoDate.getFullYear();
        const month = (todoDate.getMonth() + 1).toString().padStart(2, '0');
        const day = todoDate.getDate().toString().padStart(2, '0');
        const key = `${year}-${month}-${day}`;
        return key === targetDate;
      } catch (e) {
        return false;
      }
    });

    const sorted = filtered.sort((a, b) => {
      const aTime = this.parseTime(a.setTime || '23:59');
      const bTime = this.parseTime(b.setTime || '23:59');
      return aTime - bTime;
    });

    this.setData({ todos: sorted });
  },

  navigateToDetail(e) {
    if (e.target.dataset.component === 't-radio') return;
    const index = e.currentTarget.dataset.index;
    const todo = this.data.todos[index];
    if (!todo || !todo.id) return;
    wx.navigateTo({
      url: `/packagePages/todo-detail/todo-detail?todoId=${encodeURIComponent(todo.id)}`,
    });
  },

  toggleTodo(e) {
    const index = e.currentTarget.dataset.index;
    const currentTodo = this.data.todos[index];
    const todo = getTodoById(currentTodo.id);
    if (todo) {
      const now = Date.now();
      todo.completed = !todo.completed ? now : false;
      todo.version = (todo.version || 1) + 1;
      todo.updatedAt = now;
      saveTodo(todo);
      this.loadTodos(this.data.selectedDate);
      app.updateCalendarCache(getLocalTodos());
      if (isLoggedIn()) this.autoSyncToCloud();
    }
  },

  deleteTodo(index) {
    const currentTodo = this.data.todos[index];
    let shareId;
    try {
      const storedIds = wx.getStorageSync('_sharedSnapshotIds') || {};
      shareId = storedIds[currentTodo.id];
    } catch (e) {}

    const afterRevokeCheck = () => {
      const hasSubtasks = getLocalTodos().some(t => t.parent_id === currentTodo.id && !t.isDeleted);
      wx.showModal({
        title: '删除确认',
        content: hasSubtasks
          ? '该待办包含子待办，删除后子待办也将一同被删除，确定删除吗？'
          : '删除后保留 30 天，可在"更多-回收站"找回，确定删除吗？',
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
            this.loadTodos(this.data.selectedDate);
            app.updateCalendarCache(getLocalTodos());
            if (isLoggedIn()) this.autoSyncToCloud();
          }
        },
      });
    };

    if (shareId) {
      confirmRevokeIfShared(currentTodo.id, afterRevokeCheck);
    } else {
      afterRevokeCheck();
    }
  },

  editTodo(index) {
    const currentTodo = this.data.todos[index];
    const locationStr = currentTodo.location ? encodeURIComponent(JSON.stringify(currentTodo.location)) : '';
    const tagsStr = currentTodo.tags ? encodeURIComponent(JSON.stringify(currentTodo.tags)) : '';
    const todos = getLocalTodos();
    const realIndex = todos.findIndex(t =>
      t.text === currentTodo.text &&
      t.setDate === currentTodo.setDate &&
      t.setTime === currentTodo.setTime
    );

    app.globalData.editTodoImages = currentTodo.images || [];

    wx.navigateTo({
      url: `/packagePages/add-todo/add-todo?edit=1&index=${realIndex}&todoId=${encodeURIComponent(currentTodo.id)}&text=${encodeURIComponent(currentTodo.text)}&setDate=${currentTodo.setDate}&setTime=${currentTodo.setTime || '12:00'}&remarks=${encodeURIComponent(currentTodo.remarks || '')}&location=${locationStr}&time=${currentTodo.time || Date.now()}&isStar=${currentTodo.isStar || false}&priority=${currentTodo.priority || ''}&comboId=${currentTodo.comboId || ''}&tags=${tagsStr}&hasImages=${(currentTodo.images && currentTodo.images.length > 0) ? '1' : '0'}`,
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

  onGoBack() {
    wx.navigateBack();
  },

  navigateToAdd() {
    const date = this.data.selectedDate;
    wx.navigateTo({
      url: `/packagePages/add-todo/add-todo?setDate=${date}`,
    });
  },
});
