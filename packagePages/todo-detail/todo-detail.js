import ActionSheet, { ActionSheetTheme } from 'tdesign-miniprogram/action-sheet';

const app = getApp();
const { combosApi, collabApi, notifyApi, commentsApi, shareApi, adminApi, isLoggedIn } = require('../../utils/api.js');
const { syncWithCloud, getLocalTodos, saveTodo, getTodoById, deleteTodoById } = require('../../utils/sync.js');

const NOTIFY_TEMPLATE_ID = '1jvRWbLBNSasPzKtUnrQEiVrU6hj2lWwhKNq2u8jjWg';
const SHARED_TODO_TEMPLATE_ID = '1jvRWbLBNSasPzKtUnrQEviO7vwbWCChJJr0z24an-Y';

Page({
  data: {
    todo: {},
    showMarkdown: false,
    todoTags: [],
    comboInfo: null,
    isSharedTodo: false,
    sharedTodoId: null,
    comboId: null,
    currentIndex: -1,
    shareButton: {
      openType: 'share'
    },
    
    notification: null,
    showNotifyConfig: false,
    pendingShareId: null,
    shareSnapshotSubtasks: null,
    notifyDateOffset: '0',
    notifyTime: '09:00',
    customDays: 3,
    notifyPreviewText: '',
    todoId: null,
    
    userRole: 'member',
    assignments: [],
    assignType: 'all',
    excludeType: '',
    completedCount: 0,
    uncompletedCount: 0,
    totalCount: 0,
    completedPercent: 0,
    uncompletedPercent: 0,
    isFromShare: false,
    creator: null,
    imagesLayout: 'grid-3',
    adminView: false,
    detailUserId: '',
    
    showCommentPopup: false,
    comments: [],
    commentTotal: 0,
    commentInput: '',
    commentLoading: false,
    commentRefreshing: false,
    commentPage: 1,
    commentHasMore: true,
    replyTarget: null,

    hasActiveShare: false,

    subtaskList: [],
    subtaskCollapsed: false,
    showSubtaskInput: false,
    subtaskInputValue: '',
    subtaskHasInput: false,
    editingSubtaskId: null,
    editingSubtaskText: '',
    addingChildForId: null,
    childInputValue: '',
    childInputPadding: 64
  },

  onShareAppMessage() {
    const currentTodo = this.data.todo;

    if (this.data.isSharedTodo) {
      return {
        title: '分享待办：' + currentTodo.text,
        path: `/packagePages/todo-detail/todo-detail?sharedTodoId=${this.data.sharedTodoId}&comboId=${this.data.comboId}`,
      };
    }

    if (this.data.pendingShareId) {
      return {
        title: '分享待办：' + currentTodo.text,
        path: `/packagePages/todo-detail/todo-detail?isShare=1&shareId=${this.data.pendingShareId}`,
      };
    }

    const locationStr = currentTodo.location ? encodeURIComponent(JSON.stringify(currentTodo.location)) : '';
    const tagsStr = currentTodo.tags ? encodeURIComponent(JSON.stringify(currentTodo.tags)) : '';
    const imagesStr = currentTodo.images && currentTodo.images.length > 0 ? encodeURIComponent(JSON.stringify(currentTodo.images)) : '';
    const sharePath = `/packagePages/todo-detail/todo-detail?isShare=1&text=${encodeURIComponent(currentTodo.text)}&setDate=${currentTodo.setDate}&setTime=${currentTodo.setTime || '12:00'}&remarks=${encodeURIComponent(currentTodo.remarks || '')}&location=${locationStr}&time=${currentTodo.time || Date.now()}&isStar=${currentTodo.isStar || false}&priority=${currentTodo.priority || 'p2'}&tags=${tagsStr}&images=${imagesStr}`;
    return {
      title: '分享待办：' + currentTodo.text,
      path: sharePath,
    }
  },

  // 分享前静默上传子任务树到服务端
  async prepareShareSnapshotIfNeeded() {
    const todo = this.data.todo;
    if (!todo || !todo.id || this.data.isSharedTodo || this.data.adminView) return;

    const allTodos = getLocalTodos();
    const hasSubtasks = allTodos.some(t => t.parent_id === todo.id && !t.isDeleted);
    if (!hasSubtasks) return;

    const subtasks = {};
    this.collectSubtaskTree(allTodos, todo.id, subtasks);

    try {
      const result = await shareApi.createSnapshot(todo, subtasks);
      if (result.success) {
        this.setData({ pendingShareId: result.shareId });
        // 持久化存储 shareId，用于撤回
        const storedIds = wx.getStorageSync('_sharedSnapshotIds') || {};
        storedIds[todo.id] = result.shareId;
        wx.setStorageSync('_sharedSnapshotIds', storedIds);
      }
    } catch (err) {
      logger.debug('PAGE', 'SNAPSHOT', '预加载分享快照失败', err);
    }
  },

  // 递归构建 { [parentId]: [child, ...] } 映射
  collectSubtaskTree(allTodos, rootParentId, result = {}) {
    const children = allTodos.filter(t => t.parent_id === rootParentId && !t.isDeleted);
    if (children.length === 0) return;
    result[rootParentId] = children.map(t => ({
      id: t.id,
      text: t.text,
      parent_id: t.parent_id,
      completed: t.completed,
      time: t.time,
      setDate: t.setDate,
      setTime: t.setTime,
      priority: t.priority || 'p2',
      remarks: t.remarks || '',
      tags: t.tags || [],
      images: t.images || [],
      location: t.location || null,
      isStar: t.isStar || false
    }));
    for (const child of children) {
      this.collectSubtaskTree(allTodos, child.id, result);
    }
  },

  // 添加到我的待办 — 根据来源路由
  addToMyTodos() {
    if (this.data.isSharedTodo && this.data.sharedTodoId && this.data.comboId) {
      this.addToMyTodosShared(this.data.sharedTodoId, this.data.comboId);
      return;
    }

    const { todo, shareSnapshotSubtasks } = this.data;
    const now = Date.now();
    const newParentId = `todo_${now}_${Math.random().toString(36).substring(2, 8)}`;

    const newTodo = {
      ...todo,
      id: newParentId,
      completed: false,
      time: now,
      version: 1,
      isDeleted: false,
      deletedAt: null,
      updatedAt: now,
      parent_id: null
    };
    saveTodo(newTodo);

    if (shareSnapshotSubtasks && Object.keys(shareSnapshotSubtasks).length > 0) {
      this.restoreSubtasksFromSnapshot(newParentId, shareSnapshotSubtasks);
    }

    const todos = getLocalTodos();
    app.updateCalendarCache(todos);
    wx.showToast({ title: '已添加', icon: 'success' })
    wx.navigateBack();
  },

  // 从共享组合添加到我的待办（递归拉取整棵子树）
  async addToMyTodosShared(sharedTodoId, comboId) {
    wx.showLoading({ title: '添加中...' });
    try {
      const result = await combosApi.getById(comboId);
      const combo = result.combo || result;
      const allSharedTodos = combo.sharedTodos || [];
      const tree = this.buildTreeForAddition(allSharedTodos, parseInt(sharedTodoId));

      const idMapping = {};
      const now = Date.now();

      for (const node of tree) {
        const newId = `todo_${now}_${Math.random().toString(36).substring(2, 8)}`;
        const parentNewId = node.parentId ? (idMapping[node.parentId] || null) : null;

        saveTodo({
          id: newId,
          text: node.text,
          setDate: node.setDate || '',
          setTime: node.setTime || '12:00',
          remarks: node.remarks || '',
          location: node.location || null,
          completed: false,
          time: now,
          isStar: false,
          priority: node.priority || 'p2',
          tags: node.tags || [],
          images: [],
          parent_id: parentNewId,
          version: 1,
          isDeleted: false,
          deletedAt: null,
          updatedAt: now
        });
        idMapping[node.id] = newId;
      }

      wx.hideLoading();
      const todos = getLocalTodos();
      app.updateCalendarCache(todos);
      wx.showToast({ title: '已添加', icon: 'success' });
      wx.navigateBack();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '添加失败', icon: 'none' });
    }
  },

  // BFS 遍历共享待办列表获取完整子树
  buildTreeForAddition(sharedTodos, rootId) {
    const map = {};
    for (const t of sharedTodos) {
      map[t.id] = t;
    }
    const result = [];
    const queue = [rootId];
    const visited = new Set();
    while (queue.length > 0) {
      const currentId = queue.shift();
      if (visited.has(currentId)) continue;
      visited.add(currentId);
      const current = map[currentId];
      if (!current) continue;
      result.push(current);
      for (const t of sharedTodos) {
        if (t.parentId == currentId && !visited.has(t.id)) {
          queue.push(t.id);
        }
      }
    }
    return result;
  },

  // 从 snapshot 递归保存子任务子树（重映射 parent_id）
  restoreSubtasksFromSnapshot(newParentId, subtaskMap) {
    if (!subtaskMap || Object.keys(subtaskMap).length === 0) return;

    const idMapping = {};
    const queue = [newParentId];
    const oldParentIds = [this.data.todo.id];
    const now = Date.now();

    while (queue.length > 0) {
      const currentNewId = queue.shift();
      const oldParentId = oldParentIds.shift();
      const children = subtaskMap[oldParentId] || [];

      for (const childData of children) {
        const newId = `todo_${now}_${Math.random().toString(36).substring(2, 8)}`;

        saveTodo({
          ...childData,
          id: newId,
          parent_id: currentNewId,
          completed: false,
          time: now,
          version: 1,
          isDeleted: false,
          deletedAt: null,
          updatedAt: now
        });

        idMapping[childData.id] = newId;
        queue.push(newId);
        oldParentIds.push(childData.id);
      }
    }
  },

  onLoad(options) {
    const pages = getCurrentPages();
    const isFromShare = pages.length === 1;
    this.setData({ isFromShare });

    if (options.adminView === '1') {
      this._loadAdminView(options);
      return;
    }

    if (options.sharedTodoId) {
      this._loadBySharedTodoId(options);
      return;
    }

    if (options.todoId) {
      this._loadByTodoId(options);
      return;
    }

    if (!options.index && !options.id && options.isShare !== '1') {
      this._loadDefault(options);
      return;
    }

    if (options.id) {
      this._loadById(options);
      return;
    }

    if (options.isShare === '1') {
      if (options.shareId) {
        this._loadByShareWithSnapshot(options);
      } else {
        this._loadByShare(options);
      }
    } else {
      this._loadByIndex(options);
    }
  },

  // 路径1: 管理员查看模式（统一入口）
  _loadAdminView(options) {
    this.setData({ adminView: true });

    // 共享待办：走现有 sharedTodoId + comboId 路径（复用注释加载等能力）
    if (options.sharedTodoId) {
      this._loadBySharedTodoId(options);
      return;
    }

    // 个人待办：走新 admin API 加载完整数据
    if (options.todoId) {
      this._loadAdminViewWithApi(options);
      return;
    }

    // 兜底：旧 URL 编码方式
    this._loadAdminViewLegacy(options);
  },

  // 路径1a: adminView 通过 API 加载个人待办
  async _loadAdminViewWithApi(options) {
    try {
      const todoId = decodeURIComponent(options.todoId);
      const userId = options.userId || '';

      const res = await adminApi.getTodoDetail(todoId, userId);
      if (!res.success || !res.data) {
        logger.error('ADMIN', 'API', '获取待办详情失败', res);
        return;
      }

      const { todo, subtasks, combo, creator } = res.data;

      let parsedImages = this.parseImages(todo.images);
      let dateObj = new Date();
      if (todo.set_date || todo.setDate) {
        const rawDate = todo.set_date || todo.setDate;
        dateObj = new Date(rawDate);
        if (isNaN(dateObj.getTime())) dateObj = new Date();
      }
      const setTime = todo.set_time || todo.setTime || '12:00';

      this.setData({
        todo: {
          text: todo.text || '',
          setDate: this.formatDate(dateObj),
          setTime: setTime,
          remarks: todo.remarks || '',
          completed: todo.completed ? true : false,
          isStar: todo.is_star || todo.isStar || false,
          images: parsedImages,
          location: todo.location_text ? this.parseLocation(todo.location_text) : (todo.location || null),
          priority: todo.priority || 'p2'
        },
        creator: creator ? {
          nickname: creator.nickname || '未知用户',
          avatar: creator.avatar || '/images/avatar.png'
        } : null,
        subtaskList: Array.isArray(subtasks) ? subtasks.map(s => ({
          ...s,
          completed: s.completed > 0
        })) : [],
        comboInfo: combo ? {
          id: combo.id,
          name: combo.name,
          icon: combo.icon || 'folder',
          color: combo.color || '#4CAF50',
          is_shared: combo.is_shared
        } : null,
        formattedDate: this.formatRichDate(dateObj, setTime),
        formatDateTime: this.formatAdminDateTime(todo.created_at || todo.time || Date.now()),
        formatCompletedTime: todo.completed ? this.formatAdminDateTime(todo.completed) : '',
        imagesLayout: this.calculateImagesLayout(parsedImages),
        todoId: todo.todo_id || todoId,
        detailUserId: userId
      });
      wx.stopPullDownRefresh();
    } catch (err) {
      logger.error('ADMIN', 'API', '管理员API加载待办失败', err);
    }
  },

  // 路径1b: 旧版 URL 编码管理员查看（兜底）
  _loadAdminViewLegacy(options) {
    try {
      const todoData = JSON.parse(decodeURIComponent(options.todoData || '{}'));
      const creatorInfo = decodeURIComponent(options.creator || '{}');
      let creator;
      try {
        creator = JSON.parse(creatorInfo);
      } catch (e) {
        creator = { nickname: creatorInfo || '未知用户', avatar: '/images/avatar.png' };
      }

      let parsedImages = this.parseImages(todoData.images);

      let dateObj = new Date();
      if (todoData.set_date || todoData.setDate) {
        const rawDate = todoData.set_date || todoData.setDate;
        dateObj = new Date(rawDate);
        if (isNaN(dateObj.getTime())) dateObj = new Date();
      }

      const setTime = todoData.set_time || todoData.setTime || '12:00';

      this.setData({
        adminView: true,
        todo: {
          text: todoData.text || '',
          setDate: this.formatDate(dateObj),
          setTime: setTime,
          remarks: todoData.remarks || '',
          completed: todoData.completed ? true : false,
          isStar: todoData.is_star || todoData.isStar || false,
          images: parsedImages,
          location: todoData.location || null,
          priority: todoData.priority || 'p2'
        },
        creator: {
          nickname: creator.nickname || '未知用户',
          avatar: creator.avatar || '/images/avatar.png'
        },
        formattedDate: this.formatRichDate(dateObj, setTime),
        formatDateTime: this.formatAdminDateTime(todoData.created_at || todoData.time || Date.now()),
        formatCompletedTime: todoData.completed ? this.formatAdminDateTime(todoData.completed) : '',
        imagesLayout: this.calculateImagesLayout(parsedImages)
      });
    } catch (err) {
      logger.error('ADMIN', 'DATA', '解析管理员查看数据失败', err);
    }
  },

  // 路径2: 共享待办
  _loadBySharedTodoId(options) {
    this.setData({ isSharedTodo: true });
    this.loadSharedTodo(options.sharedTodoId, options.comboId);
  },

  // 路径3: 按 todoId 加载
  _loadByTodoId(options) {
    const todoId = decodeURIComponent(options.todoId);
    const todos = getLocalTodos();
    const index = todos.findIndex(t => t.id === todoId);

    if (index !== -1) {
      const todo = todos[index];
      if (!todo.priority) todo.priority = 'p2';

      let setDate;
      if (todo.setDate) {
        setDate = new Date(todo.setDate);
        if (isNaN(setDate.getTime())) {
          setDate = new Date();
        }
      } else {
        setDate = new Date();
      }
      todo.setDate = this.formatDate(setDate);
      todo.setTime = this.formatTime(todo.setTime);

      let parsedImages = this.parseImages(todo.images);
      todo.images = parsedImages;

      const formattedDate = this.formatRichDate(setDate);
      const formatDateTime = this.formatDateTime(todo.time || Date.now());
      const formatCompletedTime = todo.completed ? this.formatDateTime(todo.completed) : '';

      this.setData({
        currentIndex: index,
        todo,
        formattedDate,
        formatDateTime,
        formatCompletedTime,
        setTime: todo.setTime,
        isShare: false,
        time: todo.time || Date.now(),
        isStar: todo.isStar || false,
        todoTags: this.getTagsByIds(todo.tags || []),
        comboInfo: this.getComboById(todo.comboId),
        todoId: todo.id || todo.todo_id || String(todo.time),
        imagesLayout: this.calculateImagesLayout(parsedImages)
      });

      this.loadNotification();
      this.loadSubtasks();
      this.prepareShareSnapshotIfNeeded();
    } else {
      wx.showToast({
        title: '待办不存在或已被删除',
        icon: 'none',
        duration: 2000
      });
      setTimeout(() => wx.navigateBack(), 1500);
    }
  },

  // 路径4: 默认占位内容
  _loadDefault(options) {
    const defaultTodo = {
      text: '项目需求调研会议',
      setDate: new Date().toISOString().split('T')[0],
      setTime: '12:00',
      remarks: '1. 准备用户画像文档\n2. 确认技术可行性\n3. 制定项目排期',
      location: {
        name: '腾讯大厦会议室',
        address: '深圳市南山区科技园科技中一路',
        latitude: 22.546786,
        longitude: 113.944466
      },
      isStar: true
    };
    const formattedDate = this.formatRichDate(new Date(defaultTodo.setDate));
    this.setData({
      todo: defaultTodo,
      formattedDate,
      isShare: false
    });
  },

  // 路径5: 按旧版 id 加载
  _loadById(options) {
    const todoId = Number(options.id);
    const todos = getLocalTodos();
    const index = todos.findIndex(t => t.time === todoId);

    if (index !== -1) {
      const todo = todos[index];
      if (!todo.priority) todo.priority = 'p2';

      let setDate;
      if (todo.setDate) {
        setDate = new Date(todo.setDate);
        if (isNaN(setDate.getTime())) {
          setDate = new Date();
        }
      } else {
        setDate = new Date();
      }
      todo.setDate = this.formatDate(setDate);
      todo.setTime = this.formatTime(todo.setTime);

      let parsedImages = this.parseImages(todo.images);
      todo.images = parsedImages;

      const formattedDate = this.formatRichDate(setDate);
      const formatDateTime = this.formatDateTime(todo.time || Date.now());
      const formatCompletedTime = todo.completed ? this.formatDateTime(todo.completed) : '';

      this.setData({
        currentIndex: index,
        todo,
        formattedDate,
        formatDateTime,
        formatCompletedTime,
        setTime: todo.setTime,
        isShare: false,
        time: todo.time || Date.now(),
        isStar: todo.isStar || false,
        todoTags: this.getTagsByIds(todo.tags || []),
        comboInfo: this.getComboById(todo.comboId),
        todoId: todo.id || todo.todo_id || String(todo.time),
        imagesLayout: this.calculateImagesLayout(parsedImages)
      });

      this.loadNotification();
      this.loadSubtasks();
      this.prepareShareSnapshotIfNeeded();
    } else {
      wx.showToast({
        title: '待办不存在或已被删除',
        icon: 'none',
        duration: 2000
      });
      setTimeout(() => wx.navigateBack(), 1500);
    }
  },

  // 路径6: 微信分享链接加载
  _loadByShare(options) {
    let setDateObj;
    if (options.setDate) {
      setDateObj = new Date(options.setDate);
      if (isNaN(setDateObj.getTime())) {
        setDateObj = new Date();
      }
    } else {
      setDateObj = new Date();
    }
    const formattedDate = this.formatRichDate(setDateObj);

    const locationParam = options.location;
    let parsedLocation = null;
    try {
      if (locationParam) {
        parsedLocation = JSON.parse(decodeURIComponent(locationParam));
      }
    } catch (e) {
      logger.error('PAGE', 'LOCATION', '位置参数解析失败', e);
    }

    let parsedTags = [];
    try {
      if (options.tags) {
        parsedTags = JSON.parse(decodeURIComponent(options.tags));
      }
    } catch (e) {
      logger.error('PAGE', 'TAGS', '标签参数解析失败', e);
    }

    let parsedImages = [];
    try {
      if (options.images) {
        parsedImages = this.parseImages(decodeURIComponent(options.images));
      }
    } catch (e) {
      logger.error('PAGE', 'IMAGES', '图片参数解析失败', e);
    }

    this.setData({
      todo: {
        text: decodeURIComponent(options.text || ''),
        setDate: this.formatDate(setDateObj),
        setTime: this.formatTime(options.setTime),
        remarks: decodeURIComponent(options.remarks || ''),
        location: parsedLocation,
        time: Number(options.time || Date.now()),
        isStar: options.isStar === 'true',
        tags: parsedTags,
        images: parsedImages,
        priority: options.priority || 'p2'
      },
      todoTags: this.getTagsByIds(parsedTags),
      formattedDate,
      formatDateTime: this.formatDateTime(Number(options.time || Date.now())),
      isShare: true,
      imagesLayout: this.calculateImagesLayout(parsedImages)
    });
  },

  // 路径6b: 微信分享快照加载（含子任务）
  async _loadByShareWithSnapshot(options) {
    const shareId = options.shareId;
    if (!shareId) {
      this._loadByShare(options);
      return;
    }

    try {
      wx.showLoading({ title: '加载分享...' });
      const result = await shareApi.getSnapshot(shareId);
      wx.hideLoading();

      if (result.revoked) {
        wx.showToast({ title: '该分享已被发布者撤回', icon: 'none' });
        return;
      }

      if (!result.success || !result.data) {
        wx.showToast({ title: '分享已过期', icon: 'none' });
        return;
      }

      const { todo: sharedTodo, subtasks } = result.data;

      let setDateObj;
      if (sharedTodo.setDate) {
        setDateObj = new Date(sharedTodo.setDate);
        if (isNaN(setDateObj.getTime())) setDateObj = new Date();
      } else {
        setDateObj = new Date();
      }

      const formattedDate = this.formatRichDate(setDateObj);
      let parsedImages = this.parseImages(sharedTodo.images);
      let parsedTags = sharedTodo.tags || [];

      this.setData({
        todo: {
          ...sharedTodo,
          id: sharedTodo.id,
          setDate: this.formatDate(setDateObj),
          setTime: this.formatTime(sharedTodo.setTime),
          completed: false
        },
        todoTags: this.getTagsByIds(parsedTags),
        formattedDate,
        formatDateTime: this.formatDateTime(Date.now()),
        isShare: true,
        imagesLayout: this.calculateImagesLayout(parsedImages),
        shareSnapshotSubtasks: subtasks || {}
      });

      this.loadSubtasksFromSnapshot(subtasks || {}, sharedTodo.id);
    } catch (err) {
      wx.hideLoading();
      const errMsg = (err && err.message) || '';
      if (errMsg.includes('撤回')) {
        wx.showToast({ title: errMsg, icon: 'none' });
        return;
      }
      logger.error('PAGE', 'SNAPSHOT', '加载分享快照失败', err);
      this._loadByShare(options);
    }
  },

  // 从 snapshot 渲染子任务树（只读）
  loadSubtasksFromSnapshot(subtaskMap, rootParentId) {
    if (!subtaskMap || !rootParentId) {
      this.setData({ subtaskList: [] });
      return;
    }
    const flat = [];
    this.flattenSubtaskSnapshot(subtaskMap, rootParentId, 0, flat);
    this.setData({ subtaskList: flat });
  },

  flattenSubtaskSnapshot(subtaskMap, parentId, depth, result) {
    const children = subtaskMap[parentId] || [];
    for (const child of children) {
      result.push({ ...child, _depth: depth });
      this.flattenSubtaskSnapshot(subtaskMap, child.id, depth + 1, result);
    }
  },

  // 路径7: 按数组索引加载
  _loadByIndex(options) {
    const index = options.index;
    this.setData({ currentIndex: index });
    const todos = getLocalTodos();
    const todo = todos[index];
    if (!todo.priority) todo.priority = 'p2';

    let setDate;
    if (todo.setDate) {
      setDate = new Date(todo.setDate);
      if (isNaN(setDate.getTime())) {
        setDate = new Date();
      }
    } else {
      setDate = new Date();
    }
    todo.setDate = this.formatDate(setDate);
    todo.setTime = this.formatTime(todo.setTime);

    let parsedImages = this.parseImages(todo.images);
    todo.images = parsedImages;

    const formattedDate = this.formatRichDate(setDate);
    const formatDateTime = this.formatDateTime(todo.time || Date.now());
    const formatCompletedTime = todo.completed ? this.formatDateTime(todo.completed) : '';

    this.setData({
      todo,
      formattedDate,
      formatDateTime,
      formatCompletedTime,
      setTime: todo.setTime,
      isShare: false,
      time: todo.time || Date.now(),
      isStar: todo.isStar || false,
      todoTags: this.getTagsByIds(todo.tags || []),
      comboInfo: this.getComboById(todo.comboId),
      todoId: todo.id || todo.todo_id || String(todo.time),
      imagesLayout: this.calculateImagesLayout(parsedImages)
    });

    this.loadNotification();
    this.loadSubtasks();
    this.prepareShareSnapshotIfNeeded();
  },

  async loadSharedTodo(todoId, comboId) {
    try {
      wx.showLoading({ title: '加载中...' });
      
      const result = await combosApi.getById(comboId);
      const combo = result.combo || result;
      
      const numTodoId = Number(todoId);
      const sharedTodo = (combo.sharedTodos || []).find(t => Number(t.id) === numTodoId);
      
      if (!sharedTodo) {
        wx.hideLoading();
        wx.showToast({ title: '待办不存在', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 1500);
        return;
      }
      
      let rawDate = sharedTodo.set_date || sharedTodo.setDate;
      let rawTime = sharedTodo.set_time || sharedTodo.setTime || '12:00';
      
      if (rawDate && rawDate.includes('T')) {
        rawDate = rawDate.split('T')[0];
      }
      
      if (rawTime && rawTime.includes(':')) {
        const parts = rawTime.split(':');
        rawTime = `${parts[0]}:${parts[1]}`;
      }
      
      let dateObj;
      
      if (typeof rawDate === 'string') {
        if (rawDate.includes('-')) {
          dateObj = new Date(rawDate);
        } else if (/^\d+$/.test(rawDate)) {
          dateObj = new Date(parseInt(rawDate));
        } else {
          dateObj = new Date(rawDate);
        }
      } else if (typeof rawDate === 'number') {
        dateObj = new Date(rawDate);
      } else {
        dateObj = new Date();
      }
      
      if (isNaN(dateObj.getTime())) {
        dateObj = new Date();
      }
      
      const formattedDate = this.formatRichDate(dateObj);
      
      const myCompletedAt = sharedTodo.myCompletedAt || sharedTodo.my_completed_at || null;
      const assignments = (sharedTodo.assignments || []).map(a => {
        const completedTimestamp = a.completedAt || a.completed_at;
        return {
          ...a,
          completedAt: completedTimestamp ? this.formatShortDateTime(completedTimestamp) : null
        };
      });
      const assignType = sharedTodo.assignType || sharedTodo.assign_type || 'all';
      const excludeType = sharedTodo.excludeType || sharedTodo.exclude_type || '';
      const userRole = combo.userRole || 'member';
      const creator = sharedTodo.creator || null;
      const tags = sharedTodo.tags || [];
      
      const starredSharedTodos = wx.getStorageSync('starredSharedTodos') || {};
      const isStar = !!starredSharedTodos[todoId];
      
      const createdAt = sharedTodo.created_at || sharedTodo.createdAt || Date.now();
      
      let images = this.parseImages(sharedTodo.images);
      
      this.setData({
        todo: {
          text: sharedTodo.text,
          setDate: rawDate,
          setTime: rawTime,
          remarks: sharedTodo.remarks || '',
          location: sharedTodo.location || null,
          completed: myCompletedAt ? true : false,
          completedAt: myCompletedAt,
          allCompletedAt: sharedTodo.completedAt,
          isStar: isStar,
          tags: tags,
          images: images,
          priority: sharedTodo.priority || 'p2'
        },
        isSharedTodo: true,
        sharedTodoId: todoId,
        comboId,
        comboInfo: {
          id: combo.id,
          name: combo.name,
          icon: combo.icon,
          color: combo.color
        },
        isShare: false,
        formattedDate,
        formatDateTime: this.formatDateTime(createdAt),
        formatCompletedTime: myCompletedAt ? this.formatDateTime(myCompletedAt) : '',
        formatAllCompletedTime: sharedTodo.completedAt ? this.formatDateTime(sharedTodo.completedAt) : '',
        userRole,
        assignments,
        assignType,
        excludeType,
        creator,
        todoTags: this.getTagsByIds(tags),
        imagesLayout: this.calculateImagesLayout(images)
      });
      
      if (isLoggedIn()) {
        this.loadSharedNotification(todoId);
      }

      if (combo.sharedTodos && combo.sharedTodos.length > 0) {
        this.loadSharedSubtasks(combo.sharedTodos, numTodoId);
      }

      this.updateCompletionStats();
      
      wx.hideLoading();
      wx.stopPullDownRefresh();
    } catch (err) {
      logger.error('COLLAB', 'LOAD', '加载共享待办失败', err);
      wx.hideLoading();
      wx.stopPullDownRefresh();
      wx.showToast({ title: err.message || '加载失败', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
    }
  },

  onPullDownRefresh() {
    if (this.data.adminView) {
      if (this.data.isSharedTodo && this.data.sharedTodoId && this.data.comboId) {
        this.loadSharedTodo(this.data.sharedTodoId, this.data.comboId);
      } else if (this.data.todoId) {
        this._loadAdminViewWithApi({
          todoId: this.data.todoId,
          userId: this.data.detailUserId
        });
      } else {
        wx.stopPullDownRefresh();
      }
      return;
    }

    if (this.data.isSharedTodo && this.data.sharedTodoId && this.data.comboId) {
      this.loadSharedTodo(this.data.sharedTodoId, this.data.comboId);
    } else {
      wx.stopPullDownRefresh();
    }
  },

  toggleMarkdown(e) {
    this.setData({ showMarkdown: e.detail.value });
  }, 

  // 链接点击事件处理
  onRemarksTap(e) {
    const href = e.detail.node.href;
    this._currentCopyLink = href;
    
    ActionSheet.show({
      theme: ActionSheetTheme.List,
      selector: '#t-action-sheet',
      context: this,
      description: href,
      cancelText: '取消',
      items: ['复制'],
    })
  },

  // 复制链接选择事件处理
  onCopyActionSheetSelect(e) {
    const { index } = e.detail;
    if (index === 0) {
      // 复制链接
      const href = this._currentCopyLink;
      if (href) {
        wx.setClipboardData({
          data: href,
          success: () => {
            wx.showToast({
              title: '链接已复制到剪贴板',
              icon: 'none'
            });
          }
        });
      }
    }
  },

  // 日期格式化方法
  formatRichDate(targetDate, setTime) {
    if (!targetDate || !(targetDate instanceof Date) || isNaN(targetDate.getTime())) {
      logger.error('PAGE', 'DATE', '无效的日期对象', { date: targetDate });
      targetDate = new Date();
    }
    
    const time = this.formatTime(setTime || this.data.todo?.setTime) || '12:00';
    const [hours, minutes] = time.split(':').map(Number);
    targetDate.setHours(hours, minutes, 0, 0);

    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    const weekDay = weekDays[targetDate.getDay()];

    return `${this.formatDate(targetDate)} ${time} 周${weekDay}`;
  },

  // 保持原有的 formatDate 方法
  formatDate(date) {
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    return `${year}-${month}-${day}`
  },
  
  // 格式化时间
  formatTime(timeValue) {
    if (!timeValue) return '12:00';
    if (typeof timeValue === 'string' && timeValue.length <= 5) {
      const parts = timeValue.split(':');
      if (parts.length === 2) {
        const hours = parts[0].padStart(2, '0');
        const minutes = parts[1].padStart(2, '0');
        return `${hours}:${minutes}`;
      }
    }
    const timeMatch = String(timeValue).match(/(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      const hours = timeMatch[1].padStart(2, '0');
      const minutes = timeMatch[2].padStart(2, '0');
      return `${hours}:${minutes}`;
    }
    return '12:00';
  },

  // 将时间戳转换为指定格式
  formatDateTime(timestamp) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekDay = weekDays[date.getDay()];

    return `${year}-${month}-${day} ${hours}:${minutes} ${weekDay}`;
  },

  formatAdminDateTime(dateTimeStr) {
    if (!dateTimeStr) return '-';
    if (typeof dateTimeStr === 'number' || /^\d+$/.test(dateTimeStr)) {
      return this.formatDateTime(parseInt(dateTimeStr));
    }
    if (typeof dateTimeStr === 'string' && dateTimeStr.includes('年')) {
      const match = dateTimeStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日\s*(\d{1,2}):(\d{1,2}):?(\d{1,2})?/);
      if (match) {
        const [, year, month, day, hours, minutes] = match;
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes));
        const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const weekDay = weekDays[date.getDay()];
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${hours.padStart(2, '0')}:${minutes.padStart(2, '0')} ${weekDay}`;
      }
      return dateTimeStr;
    }
    if (typeof dateTimeStr === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateTimeStr)) {
      const date = new Date(dateTimeStr);
      if (!isNaN(date.getTime())) {
        return this.formatDateTime(date.getTime());
      }
      return dateTimeStr;
    }
    const date = new Date(dateTimeStr);
    if (isNaN(date.getTime())) return dateTimeStr;
    return this.formatDateTime(date.getTime());
  },

  getTagsByIds(tagIds) {
    if (!tagIds || tagIds.length === 0) return [];
    const app = getApp();
    const allTags = app.getAllTags ? app.getAllTags() : app.globalData.systemTags || [];
    return allTags.filter(tag => {
      return tagIds.some(t => t == tag.id || String(t) == String(tag.id));
    });
  },

  getComboById(comboId) {
    if (!comboId) return null;
    const app = getApp();
    const combos = app.globalData.combos || [];
    return combos.find(c => c.id === comboId || c.id === Number(comboId)) || null;
  },

  onShow() {
    if (this.data.adminView) {
      return;
    }
    
    if (this.data.isSharedTodo) {
      if (this.data.sharedTodoId && this.data.comboId) {
        this.loadSharedTodo(this.data.sharedTodoId, this.data.comboId);
      }
      return;
    }
    
    const todos = getLocalTodos()

    if (!todos[this.data.currentIndex]) {
      wx.navigateBack()
      return
    }

    const todo = todos[this.data.currentIndex]
    if (!todo.priority) todo.priority = 'p2';
    let setDate;
    if (todo.setDate) {
      setDate = new Date(todo.setDate);
      if (isNaN(setDate.getTime())) {
        setDate = new Date();
      }
    } else {
      setDate = new Date();
    }
    todo.setDate = this.formatDate(setDate);
    todo.setTime = this.formatTime(todo.setTime);
    
    let parsedImages = this.parseImages(todo.images);
    todo.images = parsedImages;

    this.setData({
      todo,
      formattedDate: this.formatRichDate(setDate),
      setDate: todo.setDate,
      setTime: todo.setTime,
      todoTags: this.getTagsByIds(todo.tags || []),
      comboInfo: this.getComboById(todo.comboId),
      imagesLayout: this.calculateImagesLayout(parsedImages)
    })
    
    this.loadSubtasks();
    this.prepareShareSnapshotIfNeeded();
    this.checkActiveShare();
  },

  countSubtasks(todos, parentId) {
    let count = 0;
    for (const t of todos) {
      if (t.parent_id === parentId) {
        count += 1 + this.countSubtasks(todos, t.id);
      }
    }
    return count;
  },

  // 检查当前待办是否有活跃的分享快照
  checkActiveShare() {
    const todo = this.data.todo;
    if (!todo || !todo.id || this.data.isSharedTodo) return;
    const storedIds = wx.getStorageSync('_sharedSnapshotIds') || {};
    const hasShare = !!storedIds[todo.id];
    this.setData({ hasActiveShare: hasShare });
  },

  // 撤回分享
  async revokeShare() {
    const todo = this.data.todo;
    const storedIds = wx.getStorageSync('_sharedSnapshotIds') || {};
    const shareId = storedIds[todo.id];
    if (!shareId) return;

    const that = this;
    wx.showModal({
      title: '撤回分享',
      content: '撤回后，已分享的链接将无法查看，确定撤回吗？',
      confirmText: '撤回',
      confirmColor: '#ff4d4f',
      async success(res) {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '撤回中...' });
            await shareApi.revokeSnapshot(shareId);
            wx.hideLoading();
            delete storedIds[todo.id];
            wx.setStorageSync('_sharedSnapshotIds', storedIds);
            that.setData({ hasActiveShare: false });
            wx.showToast({ title: '已撤回' });
          } catch (err) {
            wx.hideLoading();
            wx.showToast({ title: err.message || '撤回失败', icon: 'none' });
          }
        }
      }
    });
  },

  deleteSubtasks(parentId) {
    const todos = getLocalTodos();
    for (const t of todos) {
      if (t.parent_id === parentId) {
        this.deleteSubtasks(t.id);
        deleteTodoById(t.id, Date.now());
      }
    }
  },

  deleteTodo() {
    const that = this;
    const { isSharedTodo, sharedTodoId, comboId, currentIndex, todo } = this.data;
    
    if (isSharedTodo) {
      wx.showModal({
        title: '删除确认',
        content: '该操作不可撤销，确定继续吗？',
        confirmText: '删除',
        confirmColor: '#ff4d4f',
        success(res) {
          if (res.confirm) {
            collabApi.deleteSharedTodo(comboId, sharedTodoId)
              .then(() => {
                wx.showToast({ title: '删除成功' });
                setTimeout(() => wx.navigateBack(), 1500);
              })
              .catch(err => {
                wx.showToast({ title: err.message || '删除失败', icon: 'none' });
              });
          }
        }
      });
      return;
    }
    
    const allTodos = getLocalTodos();
    const subCount = this.countSubtasks(allTodos, todo.id);
    
    const content = subCount > 0
      ? `该待办有 ${subCount} 个子任务，是否全部删除？`
      : '该操作不可撤销，确定继续吗？';
    
    wx.showModal({
      title: '删除确认',
      content,
      confirmText: '删除',
      confirmColor: '#ff4d4f',
      success(res) {
        if (res.confirm) {
          if (subCount > 0) {
            that.deleteSubtasks(todo.id);
          }
          deleteTodoById(todo.id, Date.now());
          // 删除关联的分享记录
          const storedIds = wx.getStorageSync('_sharedSnapshotIds') || {};
          if (storedIds[todo.id]) {
            delete storedIds[todo.id];
            wx.setStorageSync('_sharedSnapshotIds', storedIds);
          }
          app.updateCalendarCache(getLocalTodos());
          wx.navigateBack();
          wx.showToast({ title: '删除成功' });
        }
      }
    });
  },

  // 新增编辑方法
  editTodo() {
    const todo = this.data.todo;
    const { isSharedTodo, sharedTodoId, comboId, currentIndex, assignType, assignments, excludeType } = this.data;
    const locationStr = todo.location ? encodeURIComponent(JSON.stringify(todo.location)) : '';
    const tagsStr = todo.tags ? encodeURIComponent(JSON.stringify(todo.tags)) : '';
    
    const app = getApp();
    app.globalData.editTodoImages = todo.images || [];
    
    if (isSharedTodo) {
      const assigneeIds = (assignments || []).map(a => a.userId || a.user_id);
      const assigneeIdsStr = assigneeIds.length > 0 ? encodeURIComponent(JSON.stringify(assigneeIds)) : '';
      
      wx.navigateTo({
        url: `/packagePages/add-todo/add-todo?edit=1&sharedTodoId=${sharedTodoId}&comboId=${comboId}&text=${encodeURIComponent(todo.text)}&setDate=${todo.setDate}&setTime=${todo.setTime || '12:00'}&remarks=${encodeURIComponent(todo.remarks || '')}&location=${locationStr}&priority=${todo.priority || 'p2'}&tags=${tagsStr}&assignType=${assignType || 'all'}&assigneeIds=${assigneeIdsStr}&excludeType=${excludeType || ''}&hasImages=${(todo.images && todo.images.length > 0) ? '1' : '0'}`
      });
    } else {
      wx.navigateTo({
        url: `/packagePages/add-todo/add-todo?edit=1&text=${encodeURIComponent(todo.text)}&setDate=${todo.setDate}&setTime=${todo.setTime || '12:00'}&remarks=${encodeURIComponent(todo.remarks || '')}&index=${currentIndex}&todoId=${todo.id}&location=${locationStr}&time=${todo.time}&isStar=${todo.isStar || false}&priority=${todo.priority || 'p2'}&comboId=${comboId || todo.comboId || ''}&tags=${tagsStr}&hasImages=${(todo.images && todo.images.length > 0) ? '1' : '0'}`
      });
    }
  },

  previewImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = this.data.todo.images || [];
    wx.previewImage({
      current: images[index],
      urls: images
    });
  },

  copyImageUrl(e) {
    const url = e.currentTarget.dataset.url;
    if (url) {
      wx.setClipboardData({
        data: url,
        success: () => {
          wx.showToast({ title: '已复制图片链接', icon: 'success' });
        }
      });
    }
  },

  parseImages(images) {
    if (!images) return [];
    if (typeof images === 'string') {
      try {
        const parsed = JSON.parse(images);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        return [];
      }
    }
    return Array.isArray(images) ? images : [];
  },

  parseLocation(loc) {
    if (!loc) return null;
    if (typeof loc === 'string') {
      try { return JSON.parse(loc); } catch (e) { return null; }
    }
    if (loc.longitude && loc.latitude) return loc;
    return null;
  },

  calculateImagesLayout(images) {
    if (!images || images.length === 0) return 'grid-3';
    
    let imageCount = 0;
    if (typeof images === 'string') {
      try {
        const parsed = JSON.parse(images);
        imageCount = Array.isArray(parsed) ? parsed.length : 0;
      } catch (e) {
        imageCount = 0;
      }
    } else if (Array.isArray(images)) {
      imageCount = images.length;
    }
    
    if (imageCount === 1) return 'grid-1';
    if (imageCount === 2) return 'grid-2';
    if (imageCount === 3) return 'grid-3';
    if (imageCount === 4) return 'grid-2x2';
    if (imageCount <= 6) return 'grid-3x2';
    return 'grid-3x3';
  },

  navigateToLocation() {
    const { latitude, longitude, name } = this.data.todo.location
    wx.openLocation({
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      name: name || '目标位置',
      scale: 18
    })
  },

  navigateToCombo() {
    if (this.data.comboInfo) {
      wx.navigateTo({
        url: `/packageCombo/combo-detail/combo-detail?id=${this.data.comboInfo.id}`
      });
    }
  },

  copyTitle() {
    wx.setClipboardData({
      data: this.data.todo.text,
      success: () => wx.showToast({ title: '标题已复制' })
    })
  },

  copyDate(e) {
    const target = e.currentTarget.dataset.target || 'deadline';
    let text = '';
    
    if (target === 'created') {
      text = this.data.formatDateTime;
    } else if (target === 'completed') {
      text = this.data.formatCompletedTime;
    } else {
      text = `${this.data.todo.setDate} ${this.data.todo.setTime}`;
    }
    
    wx.setClipboardData({
      data: text,
      success: () => wx.showToast({ title: '时间已复制' })
    });
  },
  
  copyRemarks() {
    wx.setClipboardData({
      data: this.data.todo.remarks || '',
      success: () => wx.showToast({ title: '备注已复制' })
    })
  },

  copyLocation() {
    wx.setClipboardData({
      data: this.data.todo.location.name,
      success: () => wx.showToast({ title: '位置名称已复制' })
    });
  },

  copyCreator() {
    const creator = this.data.creator;
    if (creator) {
      wx.setClipboardData({
        data: creator.nickname || '未知用户',
        success: () => wx.showToast({ title: '创建者已复制' })
      });
    }
  },

  copyAssignType() {
    const { assignType, excludeType } = this.data;
    let text = assignType === 'all' ? '全员完成' : assignType === 'any' ? '任一完成' : '指定成员';
    if (excludeType) {
      text += `（${excludeType === 'owner' ? '超管无需完成' : excludeType === 'self' ? '创建者无需完成' : '管理组无需完成'}）`;
    }
    wx.setClipboardData({
      data: text,
      success: () => wx.showToast({ title: '完成模式已复制' })
    });
  },

  copyProgress() {
    const { completedCount, totalCount, completedPercent } = this.data;
    wx.setClipboardData({
      data: `完成进度：${completedCount}/${totalCount} (${completedPercent}%)`,
      success: () => wx.showToast({ title: '进度已复制' })
    });
  },

  copyMemberList(e) {
    const type = e.currentTarget.dataset.type;
    const assignments = this.data.assignments || [];
    
    if (type === 'completed') {
      const completed = assignments.filter(a => a.completedAt);
      const names = completed.map(a => a.nickname || '用户').join('、');
      wx.setClipboardData({
        data: `已完成：${names || '无'}`,
        success: () => wx.showToast({ title: '成员列表已复制' })
      });
    } else {
      const uncompleted = assignments.filter(a => !a.completedAt);
      const names = uncompleted.map(a => a.nickname || '用户').join('、');
      wx.setClipboardData({
        data: `未完成：${names || '无'}`,
        success: () => wx.showToast({ title: '成员列表已复制' })
      });
    }
  },

  toggleStar() {
    const newStarState = !this.data.todo.isStar;
    const now = Date.now();
    
    this.setData({
      'todo.isStar': newStarState
    }, () => {
      if (this.data.isSharedTodo) {
        const starredSharedTodos = wx.getStorageSync('starredSharedTodos') || {};
        if (newStarState) {
          starredSharedTodos[this.data.sharedTodoId] = now;
        } else {
          delete starredSharedTodos[this.data.sharedTodoId];
        }
        wx.setStorageSync('starredSharedTodos', starredSharedTodos);
        return;
      }
      
      if (this.data.currentIndex > -1) {
        const todo = getTodoById(this.data.todo.id);
        if (todo) {
          todo.isStar = newStarState;
          todo.version = (todo.version || 1) + 1;
          todo.updatedAt = now;
          saveTodo(todo);
          getApp().updateCalendarCache(getLocalTodos());
        }

        const pages = getCurrentPages();
        const prevPage = pages.find(page => page.route === 'pages/todo/todo');
        if (prevPage && prevPage.updateTodoOrder) {
          prevPage.updateTodoOrder();
        }
        
        if (prevPage && prevPage.autoSyncToCloud) {
          prevPage.autoSyncToCloud('收藏状态');
        }
      }
      wx.showToast({
        title: newStarState ? '已收藏' : '已取消收藏',
        icon: 'none'
      });
    });
  },

  async loadNotification() {
    if (!isLoggedIn() || !this.data.todoId) return;
    
    try {
      const result = await notifyApi.getByTodoId(this.data.todoId);
      if (result.success && result.notification) {
        const notification = result.notification;
        notification.formattedTime = this.formatNotifyTime(notification.notifyTime);
        this.setData({ notification });
      }
    } catch (err) {
      logger.error('NOTIFY', 'LOAD', '加载通知失败', err);
    }
  },

  async loadSharedNotification(sharedTodoId) {
    if (!isLoggedIn() || !sharedTodoId) return;
    
    try {
      const result = await notifyApi.getSharedByTodoId(sharedTodoId);
      if (result.success && result.notification) {
        const notification = result.notification;
        notification.formattedTime = this.formatNotifyTime(notification.notifyTime);
        this.setData({ notification });
      }
    } catch (err) {
      logger.error('NOTIFY', 'SHARED', '加载共享待办通知失败', err);
    }
  },

  formatNotifyTime(notifyTime) {
    const date = new Date(notifyTime);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow = date.toDateString() === new Date(now.getTime() + 86400000).toDateString();
    
    const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    const dateStr = `${date.getMonth() + 1}月${date.getDate()}日`;
    
    if (isToday) return `今天 ${timeStr}`;
    if (isTomorrow) return `明天 ${timeStr}`;
    return `${dateStr} ${timeStr}`;
  },

  onNotifyCardTap() {
    if (this.data.isShare) return;
    
    if (!isLoggedIn()) {
      wx.showModal({
        title: '需要登录',
        content: '设置提醒需要登录，是否前往登录？',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/packagePages/login/login' });
          }
        }
      });
      return;
    }
    
    this.toggleNotifyConfig();
  },

  toggleNotifyConfig() {
    const newShow = !this.data.showNotifyConfig;
    if (newShow) {
      this.updateNotifyPreview();
    }
    this.setData({ showNotifyConfig: newShow });
  },

  onSelectDateOffset(e) {
    const offset = e.currentTarget.dataset.offset;
    this.setData({ 
      notifyDateOffset: offset,
      customDays: offset === 'custom' ? this.data.customDays : 3
    }, () => {
      this.updateNotifyPreview();
    });
  },

  onCustomDaysInput(e) {
    let days = parseInt(e.detail.value) || 0;
    if (days < 0) days = 0;
    if (days > 365) days = 365;
    this.setData({ customDays: days }, () => {
      this.updateNotifyPreview();
    });
  },

  onNotifyTimeChange(e) {
    this.setData({ notifyTime: e.detail.value }, () => {
      this.updateNotifyPreview();
    });
  },

  updateNotifyPreview() {
    const notifyDateTime = this.calculateNotifyDateTime();
    if (!notifyDateTime) {
      this.setData({ notifyPreviewText: '提醒时间不能早于当前时间' });
      return;
    }
    
    const date = new Date(notifyDateTime);
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const dateStr = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${weekDays[date.getDay()]}`;
    const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    
    this.setData({ 
      notifyPreviewText: `将在 ${dateStr} ${timeStr} 发送提醒`
    });
  },

  calculateNotifyDateTime() {
    const { todo, notifyDateOffset, notifyTime, customDays } = this.data;
    if (!todo.setDate || !notifyTime) return null;
    
    // 使用待办日期创建通知日期（本地时间）
    const [year, month, day] = todo.setDate.split('-').map(Number);
    const [hours, minutes] = notifyTime.split(':').map(Number);
    
    let notifyYear = year;
    let notifyMonth = month;
    let notifyDay = day;
    
    if (notifyDateOffset === '-1') {
      const d = new Date(year, month - 1, day);
      d.setDate(d.getDate() - 1);
      notifyYear = d.getFullYear();
      notifyMonth = d.getMonth() + 1;
      notifyDay = d.getDate();
    } else if (notifyDateOffset === 'custom') {
      const d = new Date(year, month - 1, day);
      d.setDate(d.getDate() - customDays);
      notifyYear = d.getFullYear();
      notifyMonth = d.getMonth() + 1;
      notifyDay = d.getDate();
    }
    
    // 创建本地时间日期对象
    const notifyDate = new Date(notifyYear, notifyMonth - 1, notifyDay, hours, minutes, 0);
    
    const now = new Date();
    if (notifyDate < now) {
      return null;
    }
    
    return notifyDate.getTime();
  },

  async saveNotification() {
    if (!isLoggedIn()) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    
    const notifyDateTime = this.calculateNotifyDateTime();
    if (!notifyDateTime) {
      wx.showToast({ title: '提醒时间不能早于当前时间', icon: 'none' });
      return;
    }
    
    if (this.data.notification && !this.data.notification.isSent) {
      const res = await new Promise(resolve => {
        wx.showModal({
          title: '覆盖提醒',
          content: '该待办已有未发送的提醒，是否覆盖？',
          success: resolve
        });
      });
      if (!res.confirm) return;
    }
    
    wx.showLoading({ title: '保存中...' });
    
    try {
      const templateId = this.data.isSharedTodo ? SHARED_TODO_TEMPLATE_ID : NOTIFY_TEMPLATE_ID;
      try {
        const subscribeRes = await wx.requestSubscribeMessage({
          tmplIds: [templateId]
        });
        logger.info('NOTIFY', 'SUBSCRIBE', '订阅授权结果', subscribeRes);
        
        if (subscribeRes[templateId] === 'reject') {
          wx.hideLoading();
          wx.showToast({ title: '您拒绝了订阅，无法发送提醒', icon: 'none' });
          return;
        }
      } catch (subscribeErr) {
        logger.warn('NOTIFY', 'SUBSCRIBE', '订阅授权失败，模板ID可能未配置', subscribeErr);
        wx.hideLoading();
        wx.showModal({
          title: '提示',
          content: '订阅消息模板未配置，请联系管理员在微信公众平台添加模板ID：' + templateId,
          showCancel: false
        });
        return;
      }
      
      let result;
      if (this.data.isSharedTodo) {
        result = await notifyApi.scheduleShared(this.data.sharedTodoId, notifyDateTime);
      } else {
        result = await notifyApi.schedule(this.data.todoId, notifyDateTime);
      }
      
      wx.hideLoading();
      
      if (result.success) {
        const notification = {
          id: result.notificationId,
          notifyTime: notifyDateTime,
          formattedTime: this.formatNotifyTime(notifyDateTime),
          isSent: false
        };
        this.setData({ 
          notification,
          showNotifyConfig: false
        });
        wx.showToast({ title: '提醒设置成功', icon: 'success' });
      } else {
        wx.showToast({ title: result.message || '设置失败', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      logger.error('NOTIFY', 'SAVE', '保存通知失败', err);
      wx.showToast({ title: err.message || '设置失败', icon: 'none' });
    }
  },

  onCancelNotify() {
    wx.showModal({
      title: '取消提醒',
      content: '确定要取消该提醒吗？',
      confirmColor: '#ff4d4f',
      success: async (res) => {
        if (res.confirm && this.data.notification) {
          try {
            wx.showLoading({ title: '取消中...' });
            if (this.data.isSharedTodo) {
              await notifyApi.cancelShared(this.data.notification.id);
            } else {
              await notifyApi.cancel(this.data.notification.id);
            }
            wx.hideLoading();
            this.setData({ 
              notification: null,
              showNotifyConfig: false
            });
            wx.showToast({ title: '已取消提醒', icon: 'success' });
          } catch (err) {
            wx.hideLoading();
            wx.showToast({ title: err.message || '取消失败', icon: 'none' });
          }
        }
      }
    });
  },
  
  getCompletionStats() {
    const { assignments } = this.data;
    if (!assignments || assignments.length === 0) {
      return { completed: 0, total: 0, percent: 0 };
    }
    
    const completed = assignments.filter(a => a.completedAt).length;
    const total = assignments.length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { completed, total, percent };
  },
  
  updateCompletionStats() {
    const { assignments, assignType } = this.data;
    
    if (assignType === 'any') {
      const hasCompleted = assignments && assignments.some(a => a.completedAt);
      this.setData({
        totalCount: 1,
        completedCount: hasCompleted ? 1 : 0,
        uncompletedCount: hasCompleted ? 0 : 1,
        completedPercent: hasCompleted ? 100 : 0,
        uncompletedPercent: hasCompleted ? 0 : 100
      });
    } else {
      const totalCount = assignments ? assignments.length : 0;
      const completedCount = assignments ? assignments.filter(a => a.completedAt).length : 0;
      const uncompletedCount = totalCount - completedCount;
      const completedPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
      const uncompletedPercent = totalCount > 0 ? Math.round((uncompletedCount / totalCount) * 100) : 0;
      
      this.setData({
        totalCount,
        completedCount,
        uncompletedCount,
        completedPercent,
        uncompletedPercent
      });
    }
  },
  
  formatShortDateTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  },
  
  goHome() {
    wx.reLaunch({
      url: '/pages/todo/todo'
    });
  },

  // ==================== 评论相关方法 ====================
  
  openCommentPopup() {
    if (!isLoggedIn()) {
      wx.showModal({
        title: '需要登录',
        content: '查看评论需要登录，是否前往登录？',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/packagePages/login/login' });
          }
        }
      });
      return;
    }
    
    this.setData({ 
      showCommentPopup: true,
      commentPage: 1,
      comments: [],
      commentHasMore: true
    });
    this.loadComments();
  },

  closeCommentPopup() {
    this.setData({ 
      showCommentPopup: false,
      replyTarget: null,
      commentInput: ''
    });
  },

  onCommentPopupChange(e) {
    if (!e.detail.visible) {
      this.setData({
        showCommentPopup: false,
        replyTarget: null,
        commentInput: ''
      });
    }
  },

  async loadComments(page = 1) {
    if (!this.data.sharedTodoId) return;
    
    this.setData({ commentLoading: true });
    
    try {
      const result = await commentsApi.getList(this.data.sharedTodoId, page, 20);
      
      if (result.success) {
        const comments = (result.data.list || []).map(comment => ({
          ...comment,
          formattedTime: this.formatCommentTime(comment.createdAt),
          replies: (comment.replies || []).map(reply => ({
            ...reply,
            formattedTime: this.formatCommentTime(reply.createdAt)
          }))
        }));
        
        if (page === 1) {
          this.setData({
            comments,
            commentTotal: result.data.total,
            commentPage: page,
            commentHasMore: result.data.hasMore,
            commentLoading: false,
            commentRefreshing: false
          });
        } else {
          this.setData({
            comments: [...this.data.comments, ...comments],
            commentPage: page,
            commentHasMore: result.data.hasMore,
            commentLoading: false
          });
        }
      }
    } catch (err) {
      logger.error('COMMENT', 'LOAD', '加载评论失败', err);
      this.setData({ 
        commentLoading: false,
        commentRefreshing: false
      });
      wx.showToast({ title: err.message || '加载失败', icon: 'none' });
    }
  },

  refreshComments() {
    this.setData({ commentRefreshing: true });
    this.loadComments(1);
  },

  loadMoreComments() {
    if (this.data.commentLoading || !this.data.commentHasMore) return;
    this.loadComments(this.data.commentPage + 1);
  },

  formatCommentTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
    if (diff < 604800000) return Math.floor(diff / 86400000) + '天前';
    
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    return `${month}月${day}日 ${hour}:${minute}`;
  },

  onCommentInput(e) {
    this.setData({ commentInput: e.detail.value });
  },

  replyComment(e) {
    const { comment, reply } = e.currentTarget.dataset;
    this.setData({
      replyTarget: reply || comment
    });
  },

  cancelReply() {
    this.setData({ replyTarget: null });
  },

  async submitComment() {
    const { commentInput, replyTarget, sharedTodoId } = this.data;
    
    if (!commentInput.trim()) {
      wx.showToast({ title: '请输入评论内容', icon: 'none' });
      return;
    }
    
    if (!isLoggedIn()) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    
    try {
      wx.showLoading({ title: '发送中...' });
      
      const result = await commentsApi.create(
        sharedTodoId,
        commentInput.trim(),
        replyTarget ? (replyTarget.parentId || replyTarget.id) : null,
        replyTarget ? replyTarget.user.id : null
      );
      
      wx.hideLoading();
      
      if (result.success) {
        this.setData({ 
          commentInput: '',
          replyTarget: null
        });
        this.loadComments(1);
        wx.showToast({ title: '发送成功', icon: 'success' });
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '发送失败', icon: 'none' });
    }
  },

  deleteComment(e) {
    const { id, parentId } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '删除确认',
      content: '确定要删除这条评论吗？',
      confirmColor: '#ff4d4f',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '删除中...' });
            if (this.data.adminView) {
              await adminApi.deleteComment(id);
            } else {
              await commentsApi.delete(id);
            }
            wx.hideLoading();
            
            if (parentId) {
              const comments = this.data.comments.map(c => {
                if (c.id === parentId && c.replies) {
                  c.replies = c.replies.filter(r => r.id !== id);
                }
                return c;
              });
              this.setData({ comments });
            } else {
              this.setData({
                comments: this.data.comments.filter(c => c.id !== id),
                commentTotal: Math.max(0, this.data.commentTotal - 1)
              });
            }
            
            wx.showToast({ title: '删除成功', icon: 'success' });
          } catch (err) {
            wx.hideLoading();
            wx.showToast({ title: err.message || '删除失败', icon: 'none' });
          }
        }
      }
    });
  },

  // ==================== 子任务 ====================

  // 从共享组合的 sharedTodos 数组中加载子任务树
  loadSharedSubtasks(allSharedTodos, rootSharedId) {
    const flat = [];
    const buildFlat = (parentId, depth) => {
      for (const t of allSharedTodos) {
        if (t.parentId == parentId) {
          flat.push({
            id: t.id,
            text: t.text,
            _depth: depth,
            completed: t.myCompletedAt ? true : false,
            parent_id: t.parentId
          });
          buildFlat(t.id, depth + 1);
        }
      }
    };
    buildFlat(rootSharedId, 0);
    this.setData({ subtaskList: flat });
  },

  loadSubtasks() {
    const { todo } = this.data;
    if (!todo || !todo.id) return;
    const allTodos = getLocalTodos();
    const flat = this.flattenSubtree(allTodos, todo.id, 0);
    this.setData({ subtaskList: flat });
  },

  toggleSubtaskCollapse() {
    this.setData({ subtaskCollapsed: !this.data.subtaskCollapsed });
  },

  flattenSubtree(allTodos, parentId, depth, result = []) {
    for (const t of allTodos) {
      if (t.parent_id === parentId && !t.isDeleted) {
        result.push({ ...t, _depth: depth });
        this.flattenSubtree(allTodos, t.id, depth + 1, result);
      }
    }
    return result;
  },

  onSubtaskInput(e) {
    const val = e.detail.value;
    this.setData({ subtaskInputValue: val, subtaskHasInput: val.trim().length > 0 });
  },

  createSubtask() {
    const text = this.data.subtaskInputValue.trim();
    if (!text) return;
    const { todo } = this.data;
    const now = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const newTodo = {
      id: `todo_${now}_${randomStr}`,
      text,
      setDate: todo.setDate || '',
      setTime: todo.setTime || '12:00',
      completed: false,
      time: now,
      parent_id: todo.id,
      priority: 'p2',
      version: 1,
      isDeleted: false,
      deletedAt: null,
      updatedAt: now,
      isStar: false,
      tags: [],
      images: [],
      location: null,
      remarks: ''
    };
    saveTodo(newTodo);
    getApp().updateCalendarCache(getLocalTodos());
    this.setData({ subtaskInputValue: '' });
    this.loadSubtasks();
    if (isLoggedIn()) syncWithCloud('local');
  },

  toggleSubtask(e) {
    const id = e.currentTarget.dataset.id;
    const todo = getTodoById(id);
    if (!todo) return;
    todo.completed = todo.completed ? false : Date.now();
    todo.version = (todo.version || 1) + 1;
    todo.updatedAt = Date.now();
    saveTodo(todo);
    getApp().updateCalendarCache(getLocalTodos());
    this.checkAndCompleteParent(todo.parent_id);
    this.loadSubtasks();
    if (isLoggedIn()) syncWithCloud('local');
  },

  checkAndCompleteParent(parentId) {
    if (!parentId) return;
    const allTodos = getLocalTodos();
    const parent = allTodos.find(t => t.id === parentId);
    if (!parent || parent.completed) return;
    const siblings = allTodos.filter(t => t.parent_id === parentId && !t.isDeleted);
    const allDone = siblings.length > 0 && siblings.every(t => t.completed);
    if (!allDone) return;
    parent.completed = Date.now();
    parent.version = (parent.version || 1) + 1;
    parent.updatedAt = Date.now();
    saveTodo(parent);
    getApp().updateCalendarCache(getLocalTodos());
    if (isLoggedIn()) syncWithCloud('local');
    if (parent.parent_id === this.data.todo.id) {
      this.setData({ todo: { ...this.data.todo, completed: parent.completed } });
    }
    this.checkAndCompleteParent(parent.parent_id);
  },

  startEditSubtask(e) {
    const id = e.currentTarget.dataset.id;
    const todo = getTodoById(id);
    if (!todo) return;
    this.setData({
      editingSubtaskId: id,
      editingSubtaskText: todo.text
    });
  },

  onEditInput(e) {
    this.setData({ editingSubtaskText: e.detail.value });
  },

  saveEditSubtask() {
    const { editingSubtaskId, editingSubtaskText } = this.data;
    const text = editingSubtaskText.trim();
    if (!text || !editingSubtaskId) {
      this.setData({ editingSubtaskId: null });
      return;
    }
    const todo = getTodoById(editingSubtaskId);
    if (!todo) return;
    todo.text = text;
    todo.version = (todo.version || 1) + 1;
    todo.updatedAt = Date.now();
    saveTodo(todo);
    this.setData({ editingSubtaskId: null });
    this.loadSubtasks();
    if (isLoggedIn()) syncWithCloud('local');
  },

  cancelEditSubtask() {
    this.setData({ editingSubtaskId: null });
  },

  showAddChildInput(e) {
    const id = e.currentTarget.dataset.id;
    const isClosing = this.data.addingChildForId === id;
    const found = this.data.subtaskList.find(t => t.id === id);
    const targetDepth = isClosing ? 0 : (found ? found._depth || 0 : 0);
    this.setData({
      addingChildForId: isClosing ? null : id,
      childInputValue: '',
      childInputPadding: targetDepth * 40 + 64
    });
  },

  onChildInput(e) {
    this.setData({ childInputValue: e.detail.value });
  },

  createChildSubtask() {
    const text = this.data.childInputValue.trim();
    const parentId = this.data.addingChildForId;
    if (!text || !parentId) return;
    const now = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const parentTodo = getTodoById(parentId);
    const parentSetDate = parentTodo ? (parentTodo.setDate || '') : '';
    const newTodo = {
      id: `todo_${now}_${randomStr}`,
      text,
      setDate: parentSetDate,
      setTime: '12:00',
      completed: false,
      time: now,
      parent_id: parentId,
      priority: 'p2',
      version: 1,
      isDeleted: false,
      deletedAt: null,
      updatedAt: now,
      isStar: false,
      tags: [],
      images: [],
      location: null,
      remarks: ''
    };
    saveTodo(newTodo);
    getApp().updateCalendarCache(getLocalTodos());
    this.setData({ addingChildForId: null, childInputValue: '' });
    this.loadSubtasks();
    if (isLoggedIn()) syncWithCloud('local');
  },

  deleteSubtask(e) {
    const id = e.currentTarget.dataset.id;
    const allTodos = getLocalTodos();
    const subCount = this.countSubtasks(allTodos, id);
    const content = subCount > 0
      ? `该子任务有 ${subCount} 个子任务，是否全部删除？`
      : '确定删除该子任务？';
    const that = this;
    wx.showModal({
      title: '删除确认',
      content,
      confirmColor: '#ff4d4f',
      success(res) {
        if (res.confirm) {
          if (subCount > 0) {
            that.deleteSubtasks(id);
          }
          deleteTodoById(id, Date.now());
          getApp().updateCalendarCache(getLocalTodos());
          that.loadSubtasks();
          if (isLoggedIn()) syncWithCloud('local');
        }
      }
    });
  }
})