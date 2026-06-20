const { todosApi, isLoggedIn } = require('../../utils/api.js');

Page({
  data: {
    deletedTodos: [],
    loading: false,
    isLoggedIn: false
  },

  onLoad() {
    this.setData({ isLoggedIn: isLoggedIn() });
    this.loadDeletedTodos();
  },

  onShow() {
    this.setData({ isLoggedIn: isLoggedIn() });
    this.loadDeletedTodos();
  },

  async onPullDownRefresh() {
    await this.loadDeletedTodos();
    wx.stopPullDownRefresh();
  },

  goLogin() {
    wx.navigateTo({
      url: '/packagePages/login/login'
    });
  },

  formatDeletedTodos(todos) {
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    
    return todos.map(todo => {
      const deletedAt = todo.deletedAt;
      const daysLeft = Math.max(0, Math.ceil((thirtyDaysMs - (now - deletedAt)) / (24 * 60 * 60 * 1000)));
      
      const deletedAtDate = new Date(deletedAt);
      const deletedAtStr = `${deletedAtDate.getFullYear()}-${(deletedAtDate.getMonth() + 1).toString().padStart(2, '0')}-${deletedAtDate.getDate().toString().padStart(2, '0')} ${deletedAtDate.getHours().toString().padStart(2, '0')}:${deletedAtDate.getMinutes().toString().padStart(2, '0')}`;
      
      return {
        ...todo,
        deletedAtStr,
        daysLeft
      };
    }).filter(todo => todo.daysLeft > 0)
      .sort((a, b) => b.deletedAt - a.deletedAt);
  },

  async loadDeletedTodos() {
    if (!isLoggedIn()) {
      const localTodos = wx.getStorageSync('todos') || [];
      const localDeleted = localTodos.filter(t => t.isDeleted && t.deletedAt);
      const deletedTodos = this.formatDeletedTodos(localDeleted);
      this.setData({ deletedTodos });
      return;
    }
    
    this.setData({ loading: true });
    
    try {
      const result = await todosApi.getDeleted();
      if (result.success && result.todos) {
        const deletedTodos = this.formatDeletedTodos(result.todos);
        this.setData({ deletedTodos, loading: false });
        return;
      }
    } catch (err) {
      logger.error('SYNC', 'DELETED', '从云端加载已删除待办失败', err);
    }
    
    const localTodos = wx.getStorageSync('todos') || [];
    const localDeleted = localTodos.filter(t => t.isDeleted && t.deletedAt);
    const deletedTodos = this.formatDeletedTodos(localDeleted);
    this.setData({ deletedTodos, loading: false });
  },

  async restoreTodo(e) {
    const index = e.currentTarget.dataset.index;
    const todo = this.data.deletedTodos[index];
    
    if (isLoggedIn()) {
      try {
        const result = await todosApi.restore(todo.id);
        if (result.success) {
          this.updateLocalTodo(todo.id, {
            isDeleted: false,
            deletedAt: null,
            updatedAt: Date.now(),
            version: (todo.version || 1) + 1
          }, result.todo);
          
          wx.showToast({ title: '已恢复', icon: 'success' });
          this.loadDeletedTodos();
          return;
        }
      } catch (err) {
        logger.error('TODO', 'RESTORE', '恢复失败', err);
        wx.showToast({ title: '恢复失败', icon: 'error' });
        return;
      }
    }
    
    this.updateLocalTodo(todo.id, {
      isDeleted: false,
      deletedAt: null,
      updatedAt: Date.now(),
      version: (todo.version || 1) + 1
    });
    
    wx.showToast({ title: '已恢复', icon: 'success' });
    this.loadDeletedTodos();
  },

  updateLocalTodo(todoId, updates, newTodo = null) {
    const allTodos = wx.getStorageSync('todos') || [];
    let found = false;
    
    const updatedTodos = allTodos.map(t => {
      if (t.id === todoId) {
        found = true;
        return { ...t, ...updates };
      }
      return t;
    });
    
    if (!found && newTodo) {
      updatedTodos.push(newTodo);
    }
    
    wx.setStorageSync('todos', updatedTodos);
    
    const app = getApp();
    if (app && app.updateCalendarCache) {
      app.updateCalendarCache(updatedTodos.filter(t => !t.isDeleted));
    }
  },

  permanentDelete(e) {
    const index = e.currentTarget.dataset.index;
    const todo = this.data.deletedTodos[index];
    
    wx.showModal({
      title: '永久删除',
      content: `确定要永久删除「${todo.text}」吗？删除后无法恢复。`,
      confirmText: '确定删除',
      confirmColor: '#ef4444',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.doPermanentDelete(index);
        }
      }
    });
  },

  async doPermanentDelete(index) {
    const todo = this.data.deletedTodos[index];

    if (isLoggedIn()) {
      try {
        const result = await todosApi.permanentDelete(todo.id);
        if (result.success) {
          this.removeLocalTodo(todo.id);
          wx.showToast({ title: '已永久删除', icon: 'success' });
          this.loadDeletedTodos();
          return;
        }
      } catch (err) {
        logger.error('TODO', 'DELETE', '永久删除失败', err);
        wx.showToast({ title: '删除失败', icon: 'error' });
        return;
      }
    }

    this.removeLocalTodo(todo.id);
    wx.showToast({ title: '已永久删除', icon: 'success' });
    this.loadDeletedTodos();
  },

  removeLocalTodo(todoId) {
    const allTodos = wx.getStorageSync('todos') || [];
    const updatedTodos = allTodos.filter(t => t.id !== todoId);
    wx.setStorageSync('todos', updatedTodos);
  }
});
