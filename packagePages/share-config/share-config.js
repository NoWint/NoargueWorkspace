const app = getApp();

const EXPIRY_OPTIONS = [
  { label: '1 小时', value: '1h' },
  { label: '6 小时', value: '6h' },
  { label: '24 小时', value: '24h' },
  { label: '3 天', value: '3d' },
  { label: '7 天', value: '7d' },
];

let _deductedForShare = false;
let _defaultSettings = null;
let _defaultFieldPicker = [];

Page({
  data: {
    todo: null,
    subtaskSummary: '',
    tagList: [],
    tagText: '',
    priorityText: '',
    dateText: '',

    // Tab 1: share settings
    settings: {
      expiry: '24h',
      password: '',
      maxViews: '',
      remark: '',
      allowCopy: true,
      trackVisitors: false,
    },
    shareGenerated: false,
    shareId: '',

    // Common
    expiryVisible: false,
    expiryIndex: 1,
    expiryOptions: EXPIRY_OPTIONS,

    // Field visibility control
    fieldVisibility: {
      subtask: true,
      tags: true,
      date: true,
      priority: true,
      remarks: true,
      location: true,
    },
    showFieldPicker: false,
    fieldPickerValue: ['subtask', 'tags', 'date', 'priority', 'remarks', 'location'],
    fieldPickerOptions: [
      { key: 'subtask', label: '子任务', icon: 'tree-list' },
      { key: 'tags', label: '标签', icon: 'tag' },
      { key: 'date', label: '截止时间', icon: 'time' },
      { key: 'priority', label: '优先等级', icon: 'flag' },
      { key: 'remarks', label: '备注', icon: 'edit-2' },
      { key: 'location', label: '位置信息', icon: 'pin' },
    ],
    fieldPickerSummary: '',
    settingsDirty: false,
    pointsCostDisplay: '',
    pointsInsufficient: false,
    userPoints: 0,
  },

  onLoad(options) {
    const todoId = options.todoId;
    if (!todoId) {
      wx.showToast({ title: '参数错误', icon: 'none' });
      return;
    }
    this.loadTodo(todoId);
    this._snapshotDefaults();
    this._loadUserPoints();
  },

  async loadTodo(todoId) {
    const { getLocalTodos } = require('../../utils/sync');
    const localTodos = getLocalTodos();
    let todo = localTodos.find(t => t.id == todoId);

    if (todo) {
      this.renderTodo(todo, localTodos);
    } else {
      try {
        const { todosApi } = require('../../utils/api');
        const res = await todosApi.getById(todoId);
        if (res.success && res.todo) {
          this.renderTodo(res.todo, []);
        } else {
          wx.showToast({ title: '加载待办失败', icon: 'none' });
        }
      } catch {
        wx.showToast({ title: '网络错误', icon: 'none' });
      }
    }
  },

  renderTodo(todo, allTodos) {
    // Build subtask summary (first 3 lines)
    const children = allTodos.filter(t => t.parent_id === todo.id && !t.isDeleted);
    const subtaskSummary =
      children
        .slice(0, 3)
        .map(t => '• ' + t.text)
        .join('\n') +
      (children.length > 3 ? '\n...' : '');

    // Priority text (match todo-detail priority scheme)
    const priorityMap = {
      p1: '紧急重要',
      p2: '重要不紧急',
      p3: '紧急不重要',
      p4: '不紧急不重要',
    };

    // Tags: convert tag IDs to tag objects with name + color
    const app = getApp();
    const allTags = app.getAllTags ? app.getAllTags() : app.globalData.systemTags || [];
    const tagIds = Array.isArray(todo.tags) ? todo.tags : [];
    const tagList = allTags.filter(t => tagIds.some(id => String(id) == String(t.id)));
    const tagText = tagList.map(t => t.name).join(', ');

    // Build field picker summary
    const hasSubtask = !!subtaskSummary;
    const hasTags = tagList.length > 0;
    const hasDate = !!todo.setDate;
    const hasPriority = !!priorityMap[todo.priority];
    const hasRemarks = !!todo.remarks;
    const hasLocation = !!(todo.location && todo.location.name);
    const fieldHasData = { subtask: hasSubtask, tags: hasTags, date: hasDate, priority: hasPriority, remarks: hasRemarks, location: hasLocation };
    const fieldPickerOptions = [
      { key: 'subtask', label: '子任务', icon: 'tree-list', show: hasSubtask },
      { key: 'tags', label: '标签', icon: 'tag', show: hasTags },
      { key: 'date', label: '截止时间', icon: 'time', show: hasDate },
      { key: 'priority', label: '优先等级', icon: 'flag', show: hasPriority },
      { key: 'remarks', label: '备注', icon: 'edit-2', show: hasRemarks },
      { key: 'location', label: '位置信息', icon: 'pin', show: hasLocation },
    ];
    const filteredPickerOptions = fieldPickerOptions.filter(o => o.show);
    // Reset fieldVisibility for any empty fields (they stay hidden, no option shown)
    const fieldVisibility = {};
    for (const opt of fieldPickerOptions) {
      fieldVisibility[opt.key] = opt.show;
    }
    const fieldPickerSummary = this._computeFieldPickerSummary(fieldVisibility, filteredPickerOptions);

    this.setData({
      todo,
      subtaskSummary,
      tagList,
      tagText,
      priorityText: priorityMap[todo.priority] || '',
      dateText: todo.setDate || '',
      fieldVisibility,
      fieldPickerOptions: filteredPickerOptions,
      fieldPickerValue: filteredPickerOptions.map(o => o.key),
      fieldPickerSummary,
    });
  },

  _computeFieldPickerSummary(fieldVisibility, pickerOptions) {
    const opts = pickerOptions || this.data.fieldPickerOptions;
    const vis = fieldVisibility || this.data.fieldVisibility;
    const visible = opts.filter(o => vis[o.key]).length;
    return `已选 ${visible}/${opts.length} 项`;
  },

  // === Field visibility control ===

  onFieldPickerTap() {
    this.setData({ showFieldPicker: !this.data.showFieldPicker });
  },

  onFieldVisibilityChange(e) {
    const selected = e.detail.value;
    const visibility = {};
    const options = this.data.fieldPickerOptions;
    for (const opt of options) {
      visibility[opt.key] = selected.includes(opt.key);
    }
    this.setData({
      fieldPickerValue: selected,
      fieldVisibility: visibility,
      fieldPickerSummary: this._computeFieldPickerSummary(),
    });
    this._checkDirty();
  },

  // === Tab 1: Share settings ===

  onExpiryTap() {
    this.setData({ expiryVisible: true });
  },

  onExpiryConfirm(e) {
    const value = e.detail.value[0];
    const labels = EXPIRY_OPTIONS.map(o => o.value);
    this.setData({
      'settings.expiry': value,
      expiryVisible: false,
      expiryIndex: labels.indexOf(value),
    });
    this._checkDirty();
  },

  onExpiryCancel() {
    this.setData({ expiryVisible: false });
  },

  onPasswordChange(e) {
    this.setData({ 'settings.password': e.detail.value });
    this._checkDirty();
  },

  onMaxViewsChange(e) {
    this.setData({ 'settings.maxViews': e.detail.value });
    this._checkDirty();
  },

  onRemarkChange(e) {
    this.setData({ 'settings.remark': e.detail.value });
    this._checkDirty();
  },

  onAllowCopyChange(e) {
    this.setData({ 'settings.allowCopy': e.detail.checked });
    this._checkDirty();
  },

  onTrackVisitorsChange(e) {
    this.setData({ 'settings.trackVisitors': e.detail.checked });
    this._checkDirty();
  },

  async onGenerateShareCard() {
    if (this.data.settingsDirty && this.data.pointsInsufficient) return;

    const todo = this.data.todo;
    if (!todo || !todo.id) return;

    const { getLocalTodos } = require('../../utils/sync');
    const { shareApi, isLoggedIn, requireLogin, checkinApi } = require('../../utils/api');

    if (!isLoggedIn()) {
      requireLogin(() => {});
      return;
    }

    // Deduct points first if dirty
    if (this.data.settingsDirty && !_deductedForShare) {
      wx.showLoading({ title: '处理中...' });
      try {
        const deductRes = await checkinApi.deductPoints(2);
        if (!deductRes.success) {
          wx.hideLoading();
          wx.showToast({ title: deductRes.message || '积分扣除失败', icon: 'none' });
          return;
        }
        _deductedForShare = true;
        this.setData({ userPoints: deductRes.data.remaining });
      } catch (err) {
        wx.hideLoading();
        wx.showToast({ title: '积分扣除失败', icon: 'none' });
        return;
      }
    }

    const allTodos = getLocalTodos();
    const subtasks = {};
    this.collectSubtaskTree(allTodos, todo.id, subtasks);

    wx.showLoading({ title: '生成分享卡片...' });

    try {
      const result = await shareApi.createSnapshot(
        todo,
        subtasks,
        this.data.settings
      );

      if (result.success) {
        const shareId = result.shareId;
        // Persist share ID (array format for multi-snapshot support)
        const storedIds = wx.getStorageSync('_sharedSnapshotIds') || {};
        if (!storedIds[todo.id]) {
          storedIds[todo.id] = [];
        }
        storedIds[todo.id].push(shareId);
        wx.setStorageSync('_sharedSnapshotIds', storedIds);

        wx.hideLoading();
        if (_deductedForShare) {
          wx.showToast({ title: `消耗2积分，剩余${this.data.userPoints}积分`, icon: 'none' });
        }
        this.setData({ shareGenerated: true, shareId });
      } else {
        wx.hideLoading();
        wx.showToast({ title: '生成失败', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '生成失败', icon: 'error' });
    }
  },

  _snapshotDefaults() {
    _defaultSettings = JSON.parse(JSON.stringify(this.data.settings));
  },

  async _loadUserPoints() {
    try {
      const { checkinApi } = require('../../utils/api');
      const res = await checkinApi.getStatus();
      if (res.success) {
        this.setData({ userPoints: res.data.totalPoints });
        this._checkDirty();
      }
    } catch (err) {
      // silently fail
    }
  },

  _checkDirty() {
    const defaults = _defaultSettings;
    const cur = this.data.settings;
    const dirty = Object.keys(defaults).some(k => defaults[k] !== cur[k]);
    // 设置为非脏状态时重置扣分标记，以便下次修改后重新扣分
    if (!dirty) _deductedForShare = false;
    this.setData({
      settingsDirty: dirty,
      pointsCostDisplay: dirty ? '（消耗2积分）' : '',
      pointsInsufficient: dirty && (this.data.userPoints < 2),
    });
  },

  collectSubtaskTree(allTodos, rootParentId, result) {
    const children = allTodos.filter(
      t => t.parent_id === rootParentId && !t.isDeleted
    );
    if (children.length === 0) return;

    result[rootParentId] = children.map(t => ({
      id: t.id,
      text: t.text,
      completed: t.completed,
      priority: t.priority,
      dueDate: t.dueDate,
      tags: t.tags,
    }));

    children.forEach(c => this.collectSubtaskTree(allTodos, c.id, result));
  },

  onShareAppMessage() {
    const todo = this.data.todo;

    if (
      this.data.shareGenerated &&
      this.data.shareId
    ) {
      return {
        title: '分享待办：' + (todo ? todo.text : ''),
        path:
          '/packagePages/todo-detail/todo-detail?isShare=1&shareId=' +
          this.data.shareId,
      };
    }

    return { title: '时光绿径待办' };
  },

  // === Tab 2: Community

  onPublishToCommunity() {
    const todo = this.data.todo;
    if (!todo || !todo.id) return;

    // Check login
    const { isLoggedIn } = require('../../utils/api');
    if (!isLoggedIn()) {
      const { requireLogin } = require('../../utils/api');
      requireLogin(() => {});
      return;
    }

    // Store todo data for post-edit to read (without text to avoid pre-filling title)
    app.globalData.quickShareTodo = { ...todo, text: '' };
    wx.navigateTo({
      url: '/packageCommunity/post-edit/post-edit?todoId=' + todo.id,
    });
  },
});
