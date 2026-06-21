const { getLocalTodos, saveTodo, getTodoById, deleteTodoById, addDeletedTodo } = require('../../utils/sync.js');
const app = getApp();
const { formatFriendlyDate } = require('../../utils/util.js');

Page({
  data: {
    keywords: [],
    keywordsStr: '',
    searchResults: [],
    scrollTop: 0,
    showBackTop: false,
  },

  // 修改后的搜索提交方法
  onSearchConfirm(e) {
    const value = e.detail.value;
    const keywords = value.split(/\s+/).filter(k => k);
    
    if (keywords.length === 0) return;
    
    this.setData({
      keywords,
      keywordsStr: value
    }, () => {
      this.searchTodos();
      // 更新页面URL参数
      wx.redirectTo({
        url: `/packagePages/todo-search/todo-search?keywords=${encodeURIComponent(keywords.join(','))}`
      });
    });
  },

  onSearchInput(e) {
    const value = e.detail.value;
    const keywords = value.split(/\s+/).filter(k => k);
    
    this.setData({
      keywords,
      keywordsStr: value
    }, () => {
      this.searchTodos();
    });
  },

  searchTodos() {
    const todos = getLocalTodos();

    // 构建父链映射用于回溯层级
    const parentMap = {};
    const textMap = {};
    todos.forEach(t => {
      if (t.parent_id) parentMap[t.id] = t.parent_id;
      textMap[t.id] = t.text;
    });

    const getHierarchy = (todoId) => {
      const path = [];
      let currentId = parentMap[todoId];
      let rootParentId = null;
      while (currentId) {
        path.unshift(textMap[currentId] || '');
        rootParentId = currentId;
        currentId = parentMap[currentId];
      }
      return { hierarchyPath: path, rootParentId };
    };

    const results = todos.filter(todo =>
      !todo.isDeleted &&
      this.data.keywords.some(kw =>
        todo.text.toLowerCase().includes(kw.toLowerCase()) ||
        (todo.remarks && todo.remarks.toLowerCase().includes(kw.toLowerCase()))
      )
    ).map(todo => {
      let description = todo.remarks || '';
      let rootParentId = null;
      let hierarchyPath = [];

      if (todo.parent_id) {
        const result = getHierarchy(todo.id);
        hierarchyPath = result.hierarchyPath;
        rootParentId = result.rootParentId;
      }

      // 子待办：description 显示层级路径
      if (todo.parent_id && hierarchyPath.length > 0) {
        description = '🗂️ ' + hierarchyPath.join(' → ') + ' 的子待办';
      }

      return {
        ...todo,
        friendlyDate: formatFriendlyDate(todo.setDate),
        description,
        rootParentId
      };
    });

    this.setData({ searchResults: results });
  },

  toggleTodo(e) {
    const todoId = this.data.searchResults[e.currentTarget.dataset.index].id;
    const todo = getTodoById(todoId);

    if (todo) {
      const now = Date.now();
      todo.completed = !todo.completed ? now : false;
      todo.version = (todo.version || 1) + 1;
      todo.updatedAt = now;
      saveTodo(todo);
      app.updateCalendarCache(getLocalTodos());
      this.searchTodos();
    }
  },


  handleSwipeAction(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    const actionType = e.currentTarget.dataset.type;
    const todoId = this.data.searchResults[index].id;
    
    switch(actionType) {
      case 'delete':
        this.deleteTodo(todoId);
        break;
      case 'edit':
        this.editTodo(todoId);
        break;
    }
  },

  deleteTodo(todoId) {
    const that = this;
    const todo = getTodoById(todoId);
    if (!todo) return;
    const hasSubtasks = getLocalTodos().some(t => t.parent_id === todoId && !t.isDeleted);

    wx.showModal({
      title: '删除确认',
      content: hasSubtasks ? '该待办包含子待办，删除后子待办也将一同被删除，确定删除吗？' : '删除后保留 30 天，可在"更多-回收站"找回，确定删除吗？',
      confirmText: '删除',
      confirmColor: '#ff4d4f',
      success(res) {
        if (res.confirm) {
          const now = Date.now();
          addDeletedTodo({ ...todo, isDeleted: true, deletedAt: now, updatedAt: now, version: (todo.version || 1) + 1 });
          deleteTodoById(todoId, now);
          app.updateCalendarCache(getLocalTodos());
          that.searchTodos();
          wx.showToast({ title: '删除成功' });
        }
      }
    });
  },

  editTodo(todoId) {
    const todos = getLocalTodos();
    const todoIndex = todos.findIndex(t => t.id === todoId);
    
    if (todoIndex === -1) return;
    
    const todo = todos[todoIndex];
    const locationStr = todo.location ? encodeURIComponent(JSON.stringify(todo.location)) : '';
    const tagsStr = todo.tags ? encodeURIComponent(JSON.stringify(todo.tags)) : '';
    
    const app = getApp();
    app.globalData.editTodoImages = todo.images || [];
    
    wx.navigateTo({
      url: `/packagePages/add-todo/add-todo?edit=1&index=${todoIndex}&text=${encodeURIComponent(todo.text)}&setDate=${todo.setDate}&setTime=${todo.setTime || '12:00'}&remarks=${encodeURIComponent(todo.remarks || '')}&location=${locationStr}&time=${todo.time}&isStar=${todo.isStar || false}&priority=${todo.priority || ''}&tags=${tagsStr}&comboId=${todo.comboId || ''}&hasImages=${(todo.images && todo.images.length > 0) ? '1' : '0'}`
    });
  },

  navigateToDetail(e) {
    if (e.target.dataset.component === 't-radio') {
      return;
    }

    const todo = this.data.searchResults[e.currentTarget.dataset.index];
    const targetId = todo.rootParentId || todo.id;
    wx.navigateTo({
      url: `/packagePages/todo-detail/todo-detail?todoId=${encodeURIComponent(targetId)}`
    });
  },

  // 监听页面滚动
  onPageScroll(e) {
    const show = e.scrollTop > 500; // 200rpx阈值
    if (this.data.showBackTop !== show) {
      this.setData({ showBackTop: show });
    }
  },

  // 返回顶部方法
  onToTop() {
    wx.pageScrollTo({
      scrollTop: 0,
      duration: 300
    });
  },
});