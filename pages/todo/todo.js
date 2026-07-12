const app = getApp();
const weatherKey = 'SdnJZGqS_c7zVlCnj';
const { isLoggedIn, combosApi, collabApi, todosApi, configApi, notifyApi, shareApi, confirmRevokeIfShared } = require('../../utils/api.js');
const { addDeletedTodo, getLocalTodos, setLocalTodos, checkSyncDiff, syncWithCloud, getTodoById, saveTodo, deleteTodoById } = require('../../utils/sync.js');
const { formatFriendlyDate, formatDateTime } = require('../../utils/util.js');

const plugin = requirePlugin('WechatSI');
const manager = plugin.getRecordRecognitionManager();

function generateTodoId() {
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `todo_${Date.now()}_${randomStr}`;
}

import ActionSheet, { ActionSheetTheme } from 'tdesign-miniprogram/action-sheet';

Page({
  // ===========================
  // 数据定义
  // ===========================
  data: {
    todos: [],
    allTodos: [],
    allTags: [],
    currentTagFilter: 'all',
    currentTagName: '全部待办',
    showTagDropdown: false,
    dropdownTop: 0,

    latestNoticeTitle: "",  // 最新公告标题
    _hasNewNotice: false,  // 是否有未读的新公告

    currentTab: 'all',
    tabs: [
      { key: 'all', name: '全部待办' },
      { key: 'combos', name: '我的组合' },
      { key: 'shared', name: '共享组合' }
    ],

    combos: [],
    sharedCombos: [],

    isDragging: false,
    dragIndex: -1,
    placeholderIndex: -1,
    dragItem: null,
    dragX: 0,
    dragY: 0,
    dragOffsetX: 0,
    dragOffsetY: 0,
    dragItemWidth: 0,
    dragItemHeight: 0,
    touchStartX: 0,
    touchStartY: 0,
    listScrollTop: 0,
    scrollEnabled: true,    // 控制列表滚动
    _originalTodos: [],     // 备份数据用于取消拖拽
    _longPressTimer: null,  // 长按定时器
    _isLongPress: false,    // 是否触发长按
    _touchStartIndex: -1,   // 触摸开始的项索引
    _preventTap: false,     // 防止长按后的误点击

    // 语音相关
    recordState: false, // 录音状态
    content: '', // 识别的内容
    // 语音遮罩相关
    isRecording: false,   // 遮罩显隐控制
    overlayPhase: '',     // 动画阶段: '' / 'show'
    voiceText: '',        // 实时识别文字
    voiceWaveBars: [],    // 波浪 bar 数组（32 个元素）

    scrollTop: 0,
    showBackTop: false, // 返回顶部按钮显示控制
    showClearActionSheet: false,

    // 导航栏相关
    navBarHeight: app.globalData.navBarHeight,
    menuRight: app.globalData.menuRight,
    menuTop: app.globalData.menuTop,
    menuHeight: app.globalData.menuHeight,

    menuWidth: app.globalData.menuWidth,
    menuLeft: app.globalData.menuLeft,

    showLoginPopup: false,
    pendingShareData: null,
    showInvitePopup: false,
    inviteComboInfo: null,
    inviteAutoJoin: false,
    isJoining: false,

    showApprovalPopup: false,
    approvalGroups: [],
    approvalLoading: false,
    totalApprovalCount: 0,

    _togglingIds: {},

    // 卡片长按操作模式
    showCardAction: false,
    actionTodo: null,
    actionTodoIndex: -1,
    _actionCardTop: 0,
    _actionCardLeft: 0,
    _actionCardWidth: 0,
    _actionMenuStyle: '',
    _actionMenuDir: 'down',
    _actionMenuShow: false,
    _overlayShow: false,
    // 复制弹窗
    _showCopyPopup: false,
    _copyInputValue: '',
    _copyKeepCompleted: true,
    _copyKeepStar: true,
    _copySourceTodo: null,
  },

  // ===========================
  // 生命周期函数
  // ===========================
  
  /**
   * 页面加载
   */
  onLoad(options) {
    if (options && options.type) {
      this.handleShareParams(options);
    } else if (options && options.scene) {
      this.handleSceneParams(options);
    }

    const allTodos = getLocalTodos();
    const todos = this.formatAllTodos(allTodos.filter(item => !item.isDeleted && !item.parent_id));
    const allTags = app.getAllTags ? app.getAllTags() : app.globalData.systemTags || [];

    const hasInitialized = wx.getStorageSync('hasInitializedDefaultTodos');
    if (!hasInitialized && todos.length === 0) {
      this.initDefaultTodos();
    } else {
      this.setData({ todos, allTodos: todos, allTags });
    }

    this.initRecord();
    
    const notices = app.globalData.notices || [];
    if (notices.length > 0) {
      const lastRead = wx.getStorageSync('_lastReadNoticeDate') || '';
      const hasNew = !lastRead || (notices[0].date && notices[0].date > lastRead);
      this.setData({
        latestNoticeTitle: notices[0].title + " ",
        latestNoticeContent: notices[0].content,
        _hasNewNotice: hasNew,
        weather: getApp().globalData.weather
      });
    } else {
      this.loadNotices();
    }

    this.loadWeather();
  },

  /**
   * 页面显示
   */
  onShow() {
    this.checkPendingShareData();

    const allTodos = getLocalTodos();
    const todos = this.formatAllTodos(allTodos.filter(item => !item.isDeleted && !item.parent_id));
    const allTags = app.getAllTags ? app.getAllTags() : app.globalData.systemTags || [];
    
    this.setData({
      allTodos: todos,
      allTags,
      isLoading: true,
      combos: app.globalData.combos || [],
      sharedCombos: app.globalData.sharedCombos || []
    });
    
    this.applyTagFilter();

    this.checkLocationPermission();
    this.initRecord();
    
    if (isLoggedIn()) {
      this.performSync();
      this.loadCombosFromCloud();
      this.checkPendingApprovals();
    } else {
      this.refreshLocalComboCounts();
    }
  },

  /**
   * 页面卸载 - 清理定时器
   */
  onUnload() {
    if (this._collapseTimer) {
      clearTimeout(this._collapseTimer);
      this._collapseTimer = null;
    }
  },

  async performSync() {
    if (!isLoggedIn()) {
      return;
    }

    try {
      const diffResult = await checkSyncDiff();
      
      if (!diffResult.hasDiff) {
        return;
      }
      
      const hasLocalChanges = diffResult.localChangesCount > 0 || diffResult.localDeletedCount > 0;
      const hasCloudChanges = diffResult.cloudChangesCount > 0 || diffResult.cloudDeletedCount > 0;
      
      if (hasLocalChanges && hasCloudChanges) {
        await syncWithCloud('merge');
      } else if (hasCloudChanges) {
        await syncWithCloud('cloud');
      } else if (hasLocalChanges) {
        await syncWithCloud('local');
      }
      
      const mergedTodos = getLocalTodos();
      const sortedTodos = mergedTodos.filter(t => !t.isDeleted && !t.parent_id).sort((a, b) => (b.time || 0) - (a.time || 0));
      const formattedTodos = this.formatAllTodos(sortedTodos);
      this.setData({ allTodos: formattedTodos });
      this.applyTagFilter();
      app.updateCalendarCache(formattedTodos);
    } catch (err) {
      logger.error('TODO', 'SYNC', '同步失败', err);
    }
  },

  async autoSyncToCloud() {
    try {
      await syncWithCloud('local');
    } catch (err) {
      logger.error('SYNC', 'AUTO', '自动同步失败', err);
    }
  },

  async onPullDownRefresh() {
    const tasks = [];
    
    if (isLoggedIn()) {
      tasks.push(this.performSync());
    }
    
    tasks.push(this.loadWeather());
    tasks.push(this.loadNotices());
    
    try {
      await Promise.all(tasks);
    } catch (err) {
      logger.error('TODO', 'REFRESH', '下拉刷新失败', err);
    } finally {
      wx.stopPullDownRefresh();
    }
  },

  async loadNotices() {
    try {
      const result = await configApi.getNotices();
      if (result.success && result.notices) {
        app.globalData.notices = result.notices;
        const latestNotice = result.notices.find(n => n.title);
        if (latestNotice) {
          // 判断是否有新公告：存的上次阅读日期 < 最新公告日期
          const lastRead = wx.getStorageSync('_lastReadNoticeDate') || '';
          const hasNew = !lastRead || (latestNotice.date && latestNotice.date > lastRead);
          this.setData({
            latestNoticeTitle: latestNotice.title,
            latestNoticeContent: latestNotice.content,
            _hasNewNotice: hasNew
          });
        }
      }
    } catch (err) {
      logger.error('NOTIFY', 'NOTICES', '获取公告失败', err);
    }
  },

  refreshLocalComboCounts() {
    const allTodos = getLocalTodos();
    const todos = allTodos.filter(item => !item.isDeleted && !item.parent_id);
    const combos = (app.globalData.combos || []).map(combo => ({
      ...combo,
      todoCount: todos.filter(t => String(t.comboId) === String(combo.id)).length
    }));
    const sharedCombos = (app.globalData.sharedCombos || []).map(combo => ({
      ...combo,
      todoCount: todos.filter(t => String(t.comboId) === String(combo.id)).length
    }));
    this.setData({ combos, sharedCombos });
  },

  async loadCombosFromCloud() {
    try {
      const combosResult = await combosApi.getList();
      const cloudCombos = combosResult.combos || combosResult || [];
      
      const combos = cloudCombos.map(combo => {
        return {
          ...combo,
          todoCount: combo.todoCount || 0
        };
      });
      
      this.setData({ combos });
      app.setCombos(combos);
      
      const sharedResult = await collabApi.getSharedList();
      const cloudSharedCombos = sharedResult.sharedCombos || sharedResult || [];
      
      const sharedCombos = cloudSharedCombos.map(combo => {
        return {
          ...combo,
          todoCount: combo.todoCount || 0
        };
      });
      
      this.setData({ sharedCombos });
      app.setSharedCombos(sharedCombos);
    } catch (err) {
      logger.error('COMBO', 'LOAD', '加载组合数据失败', err);
    }
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    
    if ((tab === 'combos' || tab === 'shared') && !isLoggedIn()) {
      wx.showModal({
        title: '需要登录',
        content: '该功能需要登录后才能使用，是否前往登录？',
        confirmText: '去登录',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/packagePages/login/login' });
          }
        }
      });
      return;
    }
    
    this.setData({ currentTab: tab, showTagDropdown: false });
  },

  toggleTagDropdown() {
    if (this.data.currentTab !== 'all') {
      this.setData({ 
        currentTab: 'all',
        showTagDropdown: false
      });
      return;
    }
    
    const query = wx.createSelectorQuery();
    query.select('.dropdown-trigger').boundingClientRect((rect) => {
      if (rect) {
        this.setData({
          showTagDropdown: !this.data.showTagDropdown,
          dropdownTop: rect.bottom + 8
        });
      }
    }).exec();
  },

  selectTagFilter(e) {
    const filter = e.currentTarget.dataset.filter;
    const allTags = app.getAllTags();
    
    let tagName = '全部待办';
    if (filter === 'completed') {
      tagName = '已完成';
    } else if (filter === 'uncompleted') {
      tagName = '待完成';
    } else if (filter === 'p1') {
      tagName = '紧急重要';
    } else if (filter === 'p2') {
      tagName = '重要不紧急';
    } else if (filter === 'p3') {
      tagName = '紧急不重要';
    } else if (filter === 'p4') {
      tagName = '不紧急不重要';
    } else if (filter === 'none') {
      tagName = '未分类';
    } else if (filter !== 'all') {
      const tag = allTags.find(t => String(t.id) === String(filter));
      if (tag) tagName = tag.name;
    }
    
    this.setData({
      currentTagFilter: filter,
      currentTagName: tagName,
      showTagDropdown: false
    });
    
    this.applyTagFilter();
  },

  applyTagFilter() {
    const { allTodos, currentTagFilter } = this.data;
    
    let filteredTodos = allTodos;
    
    if (currentTagFilter === 'completed') {
      filteredTodos = allTodos.filter(todo => todo.completed);
    } else if (currentTagFilter === 'uncompleted') {
      filteredTodos = allTodos.filter(todo => !todo.completed);
    } else if (currentTagFilter === 'p1' || currentTagFilter === 'p2' || currentTagFilter === 'p3' || currentTagFilter === 'p4') {
      filteredTodos = allTodos.filter(todo => (todo.priority || 'p2') === currentTagFilter);
    } else if (currentTagFilter === 'none') {
      filteredTodos = allTodos.filter(todo => !todo.tags || todo.tags.length === 0);
    } else if (currentTagFilter !== 'all') {
      filteredTodos = allTodos.filter(todo => {
        if (!todo.tags || todo.tags.length === 0) return false;
        return todo.tags.some(t => String(t) === String(currentTagFilter));
      });
    }
    
    this.setData({ todos: filteredTodos });
  },

  hideTagDropdown() {
    if (this.data.showTagDropdown) {
      this.setData({ showTagDropdown: false });
    }
  },

  preventTouchMove() {
  },



  navigateToCombo(e) {
    const comboId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/packageCombo/combo-detail/combo-detail?id=${comboId}`
    });
  },

  navigateToSharedCombo(e) {
    const comboId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/packageCombo/combo-detail/combo-detail?id=${comboId}&shared=1`
    });
  },

  createNewCombo() {
    if (!isLoggedIn()) {
      wx.showModal({
        title: '需要登录',
        content: '创建组合需要登录后才能使用，是否前往登录？',
        confirmText: '去登录',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/packagePages/login/login' });
          }
        }
      });
      return;
    }
    wx.navigateTo({
      url: '/packageCombo/combo-edit/combo-edit'
    });
  },

  createNewSharedCombo() {
    if (!isLoggedIn()) {
      wx.showModal({
        title: '需要登录',
        content: '创建共享组合需要登录后才能使用，是否前往登录？',
        confirmText: '去登录',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/packagePages/login/login' });
          }
        }
      });
      return;
    }
    wx.navigateTo({
      url: '/packageCombo/combo-edit/combo-edit?isShared=1'
    });
  },

  navigateToJoinCollab() {
    wx.navigateTo({
      url: '/packageTools/join-collab/join-collab'
    });
  },

  // ===========================
  // 分享功能
  // ===========================
  
  /**
   * 分享到朋友圈
   */
  onShareTimeline() {
    return {
      title: '时光绿径待办-您的每日任务足迹管家',
      path: '/pages/todo/todo',
      imageUrl: 'https://api.yzjtiantian.cn/uploads/logo/logo.png'
    };
  },

  // ===========================
  // 搜索功能
  // ===========================
  
  /**
   * 搜索提交
   */
  onSearchConfirm() {
    wx.navigateTo({
      url: `/packagePages/todo-search/todo-search`
    });
  },

  // ===========================
  // 待办事项管理
  // ===========================
  
  /**
   * 初始化默认待办数据
   */
  initDefaultTodos() {
    const baseTime = Date.now();
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const defaultTodos = [
      {
        id: generateTodoId(),
        text: '👋 欢迎使用时光绿径待办',
        setDate: today,
        setTime: '09:00',
        remarks: '💡 小提示：点击这条待办试试看！\n\n感谢您选择时光绿径待办！这是一款简洁高效的待办管理工具。\n\n**快速上手指南：**\n\n1️⃣ 点击右下角 **+** 按钮创建新待办\n2️⃣ 点击待办卡片查看详情\n3️⃣ 左滑待办可编辑或删除\n4️⃣ 点击右上角可批量清空',
        completed: false,
        time: baseTime,
        version: 1,
        isDeleted: false,
        deletedAt: null,
        updatedAt: baseTime
      },
      {
        id: generateTodoId(),
        text: '⭕ 点击右侧圆框完成待办',
        setDate: today,
        setTime: '10:00',
        remarks: '💡 小提示：试试点击右侧圆框完成这条待办！\n\n**完成待办操作：**\n\n✅ 点击待办右侧的圆框即可标记完成\n🔄 再次点击可取消完成状态\n\n**完成后的效果：**\n\n• 待办卡片变为绿色渐变背景\n• 标题显示删除线\n• 视觉上清晰区分已完成/未完成',
        completed: false,
        time: baseTime + 1,
        version: 1,
        isDeleted: false,
        deletedAt: null,
        updatedAt: baseTime + 1
      },
      {
        id: generateTodoId(),
        text: '← 左滑待办可编辑或删除',
        setDate: today,
        setTime: '11:00',
        remarks: '💡 小提示：试试左滑这条待办！\n\n**滑动操作指南：**\n\n← 向左滑动待办卡片，会出现两个按钮：\n\n🟠 **编辑** - 修改待办内容、时间、地点等\n🔴 **删除** - 删除待办（可在回收站恢复）\n\n**删除保护机制：**\n\n• 删除的待办会保留 **30天**\n• 前往 **更多 → 回收站** 可恢复\n• 回收站支持永久删除',
        completed: false,
        time: baseTime + 2,
        version: 1,
        isDeleted: false,
        deletedAt: null,
        updatedAt: baseTime + 2
      },
      {
        id: generateTodoId(),
        text: '📍 待办可以添加地点',
        setDate: today,
        setTime: '14:00',
        remarks: '**地点功能：**\n\n为待办添加地点信息，方便记录和导航。\n\n**如何添加地点：**\n\n1. 创建或编辑待办时点击"添加地点"\n2. 搜索或选择目标位置\n3. 保存后地点会显示在待办卡片上\n\n**一键导航：**\n\n在待办详情页点击地点，可直接调用地图导航！\n\n**适用场景：**\n\n• 🏢 会议地点提醒\n• 🛒 购物清单定位\n• 🎯 约会地点记录',
        location: {
          name: '示例地点',
          address: '点击右下方编辑按钮添加实际地点',
          latitude: 0,
          longitude: 0
        },
        completed: false,
        time: baseTime + 3,
        version: 1,
        isDeleted: false,
        deletedAt: null,
        updatedAt: baseTime + 3
      },
      {
        id: generateTodoId(),
        text: '🏷️ 使用标签分类管理',
        setDate: today,
        setTime: '16:00',
        remarks: '💡 小提示：这条待办已标记"工作"标签\n\n**标签系统：**\n\n使用标签对待办进行分类，让管理更有条理。\n\n**系统预设标签：**\n\n💼 工作 | 📚 学习 | 🏠 生活\n💪 健康 | 🛒 购物 | 💡 其他\n\n**自定义标签：**\n\n前往 **更多 → 标签管理** 创建专属标签\n可自定义名称、颜色和图标\n\n**筛选查看：**\n\n点击顶部标签下拉菜单，按标签筛选待办',
        tags: [1],
        completed: false,
        time: baseTime + 4,
        version: 1,
        isDeleted: false,
        deletedAt: null,
        updatedAt: baseTime + 4
      },
      {
        id: generateTodoId(),
        text: '🎤 按住底部麦克风语音创建',
        setDate: today,
        setTime: '18:00',
        remarks: '**语音创建待办：**\n\n解放双手，用语音快速创建待办！\n\n**操作步骤：**\n\n1. 长按右下角麦克风按钮 🎤\n2. 说出待办内容（如："明天下午3点开会"）\n3. 松开手指，自动跳转编辑页\n\n**语音识别支持：**\n\n• 自动识别时间关键词\n• 支持中英文混合\n• 安静环境识别更准确\n\n**权限要求：**\n\n首次使用需授权麦克风权限',
        completed: false,
        time: baseTime + 5,
        version: 1,
        isDeleted: false,
        deletedAt: null,
        updatedAt: baseTime + 5
      },
      {
        id: generateTodoId(),
        text: '📊 查看数据分析',
        setDate: today,
        setTime: '20:00',
        remarks: '💡 点击 **更多** 探索全部功能！\n\n**统计分析：**\n\n点击底部"统计"标签，查看完成情况图表。\n\n**数据维度：**\n\n📈 每日/每周/每月完成趋势\n📊 完成率统计\n🏆 连续完成天数\n\n---\n\n**更多功能等你发现：**\n\n📅 **日历视图** - 按日期查看待办，直观了解日程\n📁 **组合归档** - 创建组合分类整理待办\n👥 **协作功能** - 邀请好友共享待办，协作管理\n⭐ **收藏功能** - 标记重要待办，快速访问\n💾 **数据导出** - 备份与恢复，数据不丢失\n🔧 **小工具集** - 密码生成器、文本加密等',
        completed: false,
        time: baseTime + 6,
        version: 1,
        isDeleted: false,
        deletedAt: null,
        updatedAt: baseTime + 6
      },
    ];

    this.setData({ todos: defaultTodos });
    setLocalTodos(defaultTodos);
    wx.setStorageSync('hasInitializedDefaultTodos', true);
    getApp().updateCalendarCache(defaultTodos);
  },

  /**
   * 切换待办完成状态
   */
  toggleTodo(e) {
    const index = e.currentTarget.dataset.index;
    const todo = this.data.todos[index];
    if (!todo) return;
    
    const todoId = todo.id;
    
    if (this.data._togglingIds[todoId]) {
      return;
    }
    
    this.setData({
      [`_togglingIds.${todoId}`]: true
    });
    
    const isCompleting = !todo.completed;
    const now = Date.now();
    const { currentTagFilter } = this.data;

    const allTodos = this.data.allTodos.map(item =>
      item.id === todoId ? {
        ...item,
        completed: isCompleting ? now : false,
        version: (item.version || 1) + 1,
        updatedAt: now,
        _animate: isCompleting ? 'first-complete' : ''
      } : item
    );

    const shouldRemove = 
      (currentTagFilter === 'completed' && !isCompleting) ||
      (currentTagFilter === 'uncompleted' && isCompleting);

    if (shouldRemove) {
      const todos = this.data.todos.map(item =>
        item.id === todoId ? { ...item, _animate: 'remove-animation' } : item
      );
      this.setData({ todos, allTodos });
      
      setTimeout(() => {
        const currentTodos = this.data.todos;
        const newTodos = currentTodos.filter(item => item.id !== todoId);
        this.setData({ 
          todos: newTodos,
          [`_togglingIds.${todoId}`]: false
        });
      }, 300);
    } else {
      const todos = this.data.todos.map(item =>
        item.id === todoId ? {
          ...item,
          completed: isCompleting ? now : false,
          version: (item.version || 1) + 1,
          updatedAt: now,
          _animate: isCompleting ? 'first-complete' : ''
        } : item
      );
      this.setData({ todos, allTodos });

      if (isCompleting) {
        setTimeout(() => {
          const currentTodos = this.data.todos;
          const todoIndex = currentTodos.findIndex(t => t.id === todoId);
          if (todoIndex > -1 && currentTodos[todoIndex]._animate) {
            this.setData({
              [`todos[${todoIndex}]._animate`]: '',
              [`_togglingIds.${todoId}`]: false
            });
          } else {
            this.setData({
              [`_togglingIds.${todoId}`]: false
            });
          }
        }, 600);
      } else {
        this.setData({
          [`_togglingIds.${todoId}`]: false
        });
      }
    }

    const updatedTodo = allTodos.find(t => t.id === todoId);
    if (updatedTodo) saveTodo(updatedTodo);
    getApp().updateCalendarCache(allTodos);

    if (isLoggedIn()) {
      this.autoSyncToCloud();
    }
  },

  // ========== 子待办递归操作 ==========

  upgradeSubtasksRecursive(parentId) {
    const todos = getLocalTodos();
    for (const t of todos) {
      if (t.parent_id === parentId && !t.isDeleted) {
        this.upgradeSubtasksRecursive(t.id);
        delete t.parent_id;
        t.updatedAt = Date.now();
        t.version = (t.version || 1) + 1;
        saveTodo(t);
      }
    }
  },

  deleteSubtasksRecursive(parentId) {
    const todos = getLocalTodos();
    for (const t of todos) {
      if (t.parent_id === parentId) {
        this.deleteSubtasksRecursive(t.id);
        deleteTodoById(t.id, Date.now());
      }
    }
  },

  doDeleteTodo(index, allIndex) {
    const that = this;
    that.setData({
      [`todos[${index}]._animate`]: 'remove-animation',
      [`allTodos[${allIndex}]._animate`]: 'remove-animation'
    }, () => {
      setTimeout(() => {
        const now = Date.now();
        const deletedItem = that.data.todos[index];
        const deletedTodo = {
          ...deletedItem,
          isDeleted: true,
          deletedAt: now,
          updatedAt: now,
          version: (deletedItem.version || 1) + 1
        };

        addDeletedTodo(deletedTodo);
        deleteTodoById(deletedTodo.id, now);

        const storageTodos = getLocalTodos();
        const updatedTodos = storageTodos.map(t =>
          t.id === deletedTodo.id ? deletedTodo : t
        );
        if (!storageTodos.find(t => t.id === deletedTodo.id)) {
          updatedTodos.push(deletedTodo);
        }
        getApp().updateCalendarCache(updatedTodos);

        const newAllTodos = that.data.allTodos.filter((item, i) => i !== allIndex);
        that.setData({ allTodos: newAllTodos });
        that.applyTagFilter();
        getApp().updateCalendarCache(newAllTodos);

        if (isLoggedIn()) {
          that.autoSyncToCloud();
        }
      }, 300);
    });
  },

  /**
   * 删除待办事项（含子待办处理）
   */
  deleteTodo(index) {
    const that = this;
    const todo = this.data.todos[index];
    if (!todo) return;
    const allIndex = this.data.allTodos.findIndex(t => t.id === todo.id);

    // 分享撤回检测（同步读取，无分享时直接继续）
    let shareId;
    try {
      const storedIds = wx.getStorageSync('_sharedSnapshotIds') || {};
      shareId = storedIds[todo.id];
    } catch (e) {}

    const afterRevokeCheck = () => {
      const hasSubtasks = getLocalTodos().some(t => t.parent_id === todo.id && !t.isDeleted);

      if (hasSubtasks) {
        wx.showActionSheet({
          itemList: ['升级子待办为普通待办', '一并删除子待办', '取消'],
          cancelIndex: 2,
          success(res) {
            if (res.tapIndex === 2) return;

            const action = res.tapIndex === 0 ? 'upgrade' : 'delete';
            const content = action === 'upgrade'
              ? '子待办将变为普通待办，确定删除吗？'
              : '子待办也将一同被删除，确定删除吗？';

            wx.showModal({
              title: '删除待办',
              content,
              confirmText: '删除',
              confirmColor: '#ff4d4f',
              success(modalRes) {
                if (modalRes.confirm) {
                  if (action === 'upgrade') {
                    that.upgradeSubtasksRecursive(todo.id);
                    const storageTodos = getLocalTodos();
                    const sortedRootTodos = storageTodos
                      .filter(t => !t.isDeleted && !t.parent_id)
                      .sort((a, b) => (b.time || 0) - (a.time || 0));
                    const formattedTodos = that.formatAllTodos(sortedRootTodos);
                    const newAllIndex = formattedTodos.findIndex(t => t.id === todo.id);
                    that.setData({ allTodos: formattedTodos });
                    that.doDeleteTodo(index, newAllIndex > -1 ? newAllIndex : allIndex);
                  } else {
                    that.deleteSubtasksRecursive(todo.id);
                    that.doDeleteTodo(index, allIndex);
                  }
                }
              }
            });
          }
        });
      } else {
        wx.showModal({
          title: '删除确认',
          content: '删除后保留 30 天，可在"更多-回收站"找回，确定删除吗？',
          confirmText: '删除',
          confirmColor: '#ff4d4f',
          success(res) {
            if (res.confirm) {
              that.doDeleteTodo(index, allIndex);
            }
          }
        });
      }
    };

    if (shareId) {
      confirmRevokeIfShared(todo.id, afterRevokeCheck);
    } else {
      afterRevokeCheck();
    }
  },

  /**
   * 编辑待办事项
   */
  editTodo(index) {
    const todo = this.data.todos[index];
    const allIndex = this.data.allTodos.findIndex(t => t.id === todo.id);
    const locationStr = todo.location ? encodeURIComponent(JSON.stringify(todo.location)) : '';
    const tagsStr = todo.tags ? encodeURIComponent(JSON.stringify(todo.tags)) : '';
    
    const app = getApp();
    app.globalData.editTodoImages = todo.images || [];
    
    wx.navigateTo({
      url: `/packagePages/add-todo/add-todo?edit=1&index=${allIndex}&todoId=${todo.id}&text=${encodeURIComponent(todo.text)}&setDate=${todo.setDate}&setTime=${todo.setTime || '12:00'}&remarks=${encodeURIComponent(todo.remarks || '')}&location=${locationStr}&time=${todo.time}&isStar=${todo.isStar || false}&priority=${todo.priority || ''}&tags=${tagsStr}&comboId=${todo.comboId || ''}&hasImages=${(todo.images && todo.images.length > 0) ? '1' : '0'}`
    });
  },

  /**
   * 从子页面添加待办事项
   */
  addTodoFromChild(text, setDate, setTime, remarks, location, tags, comboId, images, priority) {
    const now = Date.now();
    const newTodo = {
      id: generateTodoId(),
      text,
      setDate,
      setTime,
      remarks,
      location,
      completed: false,
      time: now,
      isStar: false,
      tags: tags || [],
      comboId: comboId || '',
      images: images || [],
      priority: priority || 'p2',
      version: 1,
      isDeleted: false,
      deletedAt: null,
      updatedAt: now,
      _animate: 'add-animation'
    };

    const allTodos = [newTodo, ...this.data.allTodos];
    this.setData({ allTodos });
    this.applyTagFilter();

    setTimeout(() => {
      const updatedTodos = [...allTodos];
      updatedTodos[0]._animate = '';
      this.setData({ allTodos: updatedTodos });
      this.applyTagFilter();
    }, 500);

    saveTodo(newTodo);
    getApp().updateCalendarCache(allTodos);
    
    if (comboId) {
      this.updateComboTodoCount(comboId, allTodos);
    }
    
    if (isLoggedIn()) {
      this.autoSyncToCloud();
    }
  },

  updateComboTodoCount(comboId, todos) {
    const allTodos = todos || getLocalTodos();
    const activeTodos = allTodos.filter(item => !item.isDeleted && !item.parent_id);
    const count = activeTodos.filter(t => String(t.comboId) === String(comboId)).length;
    
    const combos = this.data.combos || [];
    const comboIndex = combos.findIndex(c => String(c.id) === String(comboId));
    if (comboIndex > -1) {
      combos[comboIndex].todoCount = count;
      this.setData({ combos });
      app.setCombos(combos);
    }
    
    const sharedCombos = this.data.sharedCombos || [];
    const sharedIndex = sharedCombos.findIndex(c => String(c.id) === String(comboId));
    if (sharedIndex > -1) {
      sharedCombos[sharedIndex].todoCount = count;
      this.setData({ sharedCombos });
      app.setSharedCombos(sharedCombos);
    }
  },

  /**
   * 显示清空选项
   */
  showClearOptions() {
    ActionSheet.show({
      theme: ActionSheetTheme.List,
      selector: '#t-action-sheet',
      context: this,
      cancelText: '取消',
      items: [
        { label: '清空已完成待办' },
        { label: '清空所有待办', color: '#ff4d4f' }
      ],
    })
  },

  /**
   * 处理清空待办 ActionSheet 选择
   */
  onClearActionSheetSelect(e) {
    const { index } = e.detail;
    this.setData({
      showClearActionSheet: false
    });
    if (index === 0) {
      this.handleClearCompleted();
    } else if (index === 1) {
      this.showClearConfirm();
    }
  },

  /**
   * 清空已完成待办
   */
  handleClearCompleted() {
    wx.showModal({
      title: '确认清空已完成待办吗',
      content: '将永久删除所有已完成待办',
      confirmText: '立即清空',
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          const now = Date.now();
          const allTodos = this.data.allTodos;
          const completedCount = allTodos.filter(t => t.completed).length;

          // 注册已删除待办到云端同步列表（防止云同步后恢复）
          allTodos.filter(t => t.completed).forEach(t => {
            addDeletedTodo({
              id: t.id,
              deletedAt: now,
              updatedAt: now
            });
          });

          const newAllTodos = allTodos.map(item => {
            if (item.completed) {
              return {
                ...item,
                isDeleted: true,
                deletedAt: now,
                updatedAt: now,
                version: (item.version || 1) + 1
              };
            }
            return item;
          }).filter(item => !item.isDeleted);

          this.setData({ allTodos: newAllTodos });
          this.applyTagFilter();
          setLocalTodos(newAllTodos);
          getApp().updateCalendarCache(newAllTodos);
          if (isLoggedIn()) {
            this.autoSyncToCloud();
          }
          wx.showToast({
            title: `已清理 ${completedCount} 项待办`,
            icon: 'success'
          });
        }
      }
    });
  },

  /**
   * 显示清空所有待办确认
   */
  showClearConfirm() {
    wx.showModal({
      title: '确认清空所有待办吗',
      content: '这将永久删除所有待办事项',
      confirmText: '彻底清空',
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          const now = Date.now();
          const allTodos = this.data.allTodos;

          // 注册已删除待办到云端同步列表
          allTodos.forEach(t => {
            addDeletedTodo({
              id: t.id,
              deletedAt: now,
              updatedAt: now
            });
          });

          const newAllTodos = allTodos.map(item => ({
            ...item,
            isDeleted: true,
            deletedAt: now,
            updatedAt: now,
            version: (item.version || 1) + 1
          })).filter(item => !item.isDeleted);

          this.setData({ allTodos: newAllTodos });
          this.applyTagFilter();
          setLocalTodos(newAllTodos);
          app.updateCalendarCache(newAllTodos);
          if (isLoggedIn()) {
            this.autoSyncToCloud();
          }
          wx.showToast({
            title: '已清空',
            icon: 'success',
            duration: 2000
          });
        }
      }
    });
  },

  // ===========================
  // 拖拽排序功能 - 占位符 + 平滑动画方案
  // ===========================

  /**
   * 列表滚动事件 - 记录滚动位置
   */
  onListScroll(e) {
    this.setData({
      listScrollTop: e.detail.scrollTop
    });
  },

  /**
   * 浮动项上的 touchmove - 处理拖拽移动
   */
  onFloatTouchMove(e) {
    if (!this.data.isDragging) return;
    
    const touch = e.touches[0];
    this._handleDragMove(touch);
  },

  /**
   * 触摸开始 - 启动长按检测
   */
  onTouchStart(e) {
    // 如果正在拖拽或卡片操作模式，不处理
    if (this.data.isDragging || this.data.showCardAction) return;

    const index = parseInt(e.currentTarget.dataset.index);
    const touch = e.touches[0];

    // 清除之前的定时器
    if (this.data._longPressTimer) {
      clearTimeout(this.data._longPressTimer);
    }

    // 记录触摸起始信息（用于定时器回调）
    this._pendingDragIndex = index;
    this._pendingTouchStartX = touch.pageX;
    this._pendingTouchStartY = touch.pageY;

    // 记录到 data 用于 touchmove
    this.setData({
      _touchStartIndex: index,
      touchStartX: touch.pageX,
      touchStartY: touch.pageY
    });

    // 设置长按定时器（350ms）
    const that = this;
    const timer = setTimeout(() => {
      // 使用保存的位置信息开始拖拽
      that._startDragInternal(that._pendingDragIndex, {
        pageX: that._pendingTouchStartX,
        pageY: that._pendingTouchStartY
      });
    }, 350);

    this.setData({
      _longPressTimer: timer,
      _isLongPress: false
    });
  },

  /**
   * 触摸移动 - 检查是否移动过大（取消长按）
   */
  onTouchMove(e) {
    const { isDragging, showCardAction, _longPressTimer, touchStartX, touchStartY, _touchStartIndex } = this.data;

    if (showCardAction) return;

    const touch = e.touches[0];
    const moveThreshold = 15; // 移动阈值，超过则取消长按

    // 计算移动距离
    const deltaX = Math.abs(touch.pageX - touchStartX);
    const deltaY = Math.abs(touch.pageY - touchStartY);

    // 如果移动过大且还未开始拖拽，取消长按
    if (!isDragging && _longPressTimer && (deltaX > moveThreshold || deltaY > moveThreshold)) {
      clearTimeout(_longPressTimer);
      this.setData({
        _longPressTimer: null,
        _touchStartIndex: -1
      });
      return;
    }

    // 如果正在拖拽，处理拖拽移动
    if (isDragging) {
      this._handleDragMove(touch);
    }
  },

  /**
   * 触摸结束
   */
  onTouchEnd(e) {
    const { isDragging, showCardAction, _longPressTimer } = this.data;

    if (showCardAction) {
      if (_longPressTimer) {
        clearTimeout(_longPressTimer);
        this.setData({ _longPressTimer: null, _touchStartIndex: -1 });
      }
      return;
    }

    // 清除长按定时器
    if (_longPressTimer) {
      clearTimeout(_longPressTimer);
      this.setData({
        _longPressTimer: null,
        _touchStartIndex: -1
      });
    }

    // 如果正在拖拽，结束拖拽
    if (isDragging) {
      this._handleDragEnd();
    }
  },

  /**
   * 触摸取消
   */
  onTouchCancel(e) {
    this.onTouchEnd(e);
  },

  /**
   * 内部：开始拖拽
   */
  _startDragInternal(index, touch) {
    if (this.data.showCardAction) return;
    const todo = this.data.todos[index];
    if (!todo || todo._isPlaceholder) return;

    // 标记长按已触发，并设置防止点击标志
    this.setData({
      _isLongPress: true,
      _preventTap: true  // 防止触发点击事件
    });

    // 震动反馈
    wx.vibrateShort({ type: 'medium' });

    // 备份原始数据
    const originalTodos = JSON.parse(JSON.stringify(this.data.todos));

    // 过滤掉占位符，创建干净的数组
    const cleanTodos = originalTodos.filter(item => !item._isPlaceholder);

    // 创建带占位符的数组
    const todosWithPlaceholder = [...cleanTodos];
    todosWithPlaceholder.splice(index, 0, {
      _isPlaceholder: true,
      _id: 'placeholder'
    });

    // 获取屏幕尺寸用于定位
    const sysInfo = wx.getSystemInfoSync();
    const windowWidth = sysInfo.windowWidth;

    this.setData({
      isDragging: true,
      dragIndex: index,
      placeholderIndex: index,
      dragItem: { ...todo, _isDragging: true },
      todos: todosWithPlaceholder,
      _originalTodos: cleanTodos,
      dragX: touch.pageX,
      dragY: touch.pageY,
      dragOffsetX: 0,
      dragOffsetY: 0,
      scrollEnabled: false,  // 禁用列表滚动
      _longPressTimer: null,
      dragItemWidth: windowWidth - 40  // rpx 转 px 约等于屏幕宽减去边距
    });

    // 获取拖拽项的准确高度
    this._getDragItemSize();
  },

  /**
   * 内部：获取拖拽项尺寸
   */
  _getDragItemSize() {
    const query = wx.createSelectorQuery().in(this);
    query.select('.todo-item:not(.placeholder)').boundingClientRect(rect => {
      if (rect) {
        this.setData({
          dragItemWidth: rect.width,
          dragItemHeight: rect.height
        });
      }
    }).exec();
  },

  /**
   * 内部：处理拖拽移动
   */
  _handleDragMove(touch) {
    const { touchStartX, touchStartY, dragItemHeight, dragItemWidth, placeholderIndex, todos, listScrollTop } = this.data;

    // 计算偏移量
    const offsetX = touch.pageX - touchStartX;
    const offsetY = touch.pageY - touchStartY;

    // 更新拖拽位置（使用手指当前位置直接定位）
    this.setData({
      dragX: touch.pageX,
      dragY: touch.pageY,
      dragOffsetX: offsetX,
      dragOffsetY: offsetY
    });

    // 计算新的占位符位置
    const sysInfo = wx.getSystemInfoSync();
    const itemHeight = dragItemHeight || 140 * sysInfo.windowWidth / 750; // 转换为 px

    // 列表在屏幕上的起始位置（顶部栏 + 天气卡片 + 公告高度约 300rpx = 150px 左右）
    const listTopPx = 150;

    // 计算手指相对于列表顶部的位置（考虑滚动）
    const scrollTopPx = listScrollTop * sysInfo.windowWidth / 750;
    const relativeY = touch.pageY - listTopPx + scrollTopPx;

    // 找到应该插入的位置
    let newIndex = Math.floor(relativeY / itemHeight);
    const maxIndex = this.data._originalTodos.length;
    newIndex = Math.max(0, Math.min(newIndex, maxIndex));

    // 如果位置变化，移动占位符
    if (newIndex !== placeholderIndex) {
      this._movePlaceholder(newIndex);
    }
  },

  /**
   * 内部：移动占位符
   */
  _movePlaceholder(newIndex) {
    const { todos, _originalTodos } = this.data;

    // 从当前数组中移除占位符
    const filteredTodos = todos.filter(item => !item._isPlaceholder);

    // 在新位置插入占位符
    filteredTodos.splice(newIndex, 0, {
      _isPlaceholder: true,
      _id: 'placeholder'
    });

    this.setData({
      todos: filteredTodos,
      placeholderIndex: newIndex
    });
  },

  /**
   * 内部：处理拖拽结束
   */
  _handleDragEnd() {
    const { _originalTodos, placeholderIndex, dragIndex } = this.data;

    const finalTodos = [..._originalTodos];
    const movedItem = finalTodos.splice(dragIndex, 1)[0];

    let insertIndex = placeholderIndex;
    if (dragIndex < placeholderIndex) {
      insertIndex = placeholderIndex - 1;
    }
    insertIndex = Math.max(0, Math.min(insertIndex, finalTodos.length));

    finalTodos.splice(insertIndex, 0, movedItem);

    this.setData({
      isDragging: false,
      dragIndex: -1,
      placeholderIndex: -1,
      dragItem: null,
      todos: finalTodos,
      _originalTodos: [],
      scrollEnabled: true,
      dragOffsetX: 0,
      dragOffsetY: 0,
      _isLongPress: false
    });

    setLocalTodos(finalTodos);
    getApp().updateCalendarCache(finalTodos);

    wx.vibrateShort({ type: 'light' });
  },

  // ===========================
  // 天气信息功能
  // ===========================
  
  /**
   * 加载天气信息
   */
  loadWeather() {
    return new Promise((resolve, reject) => {
      const that = this;
      let weatherSource = '精确卫星定位';
      
      wx.getLocation({
        type: 'wgs84',
        success: (locationRes) => {
          wx.request({
            url: 'https://api.seniverse.com/v3/weather/now.json',
            data: {
              key: weatherKey,
              location: `${locationRes.latitude}:${locationRes.longitude}`,
              language: 'zh-Hans',
              unit: 'c'
            },
            success(res) {
              if (res.data.results?.[0]?.now) {
                const weatherData = res.data.results[0];
                const dateObj = new Date(weatherData.last_update);
                const formattedDate = `${dateObj.getFullYear()}年${ 
                  (dateObj.getMonth() + 1).toString().padStart(2, '0')}月${
                  dateObj.getDate().toString().padStart(2, '0')}日 ${
                  dateObj.getHours().toString().padStart(2, '0')}:${
                  dateObj.getMinutes().toString().padStart(2, '0')}`;
    
                const meta = that.getWeatherMeta(weatherData.now.code);
                getApp().globalData.weather = {
                  city: weatherData.location.name,
                  code: weatherData.now.code,
                  text: weatherData.now.text,
                  temperature: weatherData.now.temperature,
                  last_update: formattedDate,
                  source: weatherSource,
                  symbol: meta.symbol,
                  bgClass: meta.bgClass
                };

                that.setData({
                  weather: getApp().globalData.weather,
                  isLoading: false
                });
                resolve(getApp().globalData.weather);
              } else {
                resolve(null);
              }
            },
            fail: () => {
              weatherSource = 'IP 定位';
              getApp().globalData.weather = {
                city: "未知城市",
                code: 0,
                text: "未知天气",
                temperature: "--",
                last_update: '',
                source: weatherSource,
                symbol: '🌤',
                bgClass: 'default'
              };
              that.setData({
                weather: getApp().globalData.weather,
                isLoading: false
              });
              resolve(null);
            }
          });
        },
        fail: () => {
          weatherSource = 'IP 定位';
          wx.request({
            url: 'https://api.seniverse.com/v3/weather/now.json',
            data: {
              key: weatherKey,
              location: 'ip',
              language: 'zh-Hans',
              unit: 'c'
            },
            success: (res) => {
              if (res.data.results?.[0]?.now) {
                const weatherData = res.data.results[0];
                const dateObj = new Date(weatherData.last_update);
                const formattedDate = `${dateObj.getFullYear()}年${
                  (dateObj.getMonth() + 1).toString().padStart(2, '0')}月${
                  dateObj.getDate().toString().padStart(2, '0')}日 ${
                  dateObj.getHours().toString().padStart(2, '0')}:${
                  dateObj.getMinutes().toString().padStart(2, '0')}`;

                const meta = that.getWeatherMeta(weatherData.now.code);
                getApp().globalData.weather = {
                  city: weatherData.location.name,
                  code: weatherData.now.code,
                  text: weatherData.now.text,
                  temperature: weatherData.now.temperature,
                  last_update: formattedDate,
                  source: weatherSource,
                  symbol: meta.symbol,
                  bgClass: meta.bgClass
                };
                
                that.setData({ 
                  weather: getApp().globalData.weather,
                  isLoading: false
                });
                resolve(getApp().globalData.weather);
              } else {
                resolve(null);
              }
            },
            fail: () => {
              that.setData({ isLoading: false });
              resolve(null);
            }
          });
        }
      });
    });
  },

  /**
   * 显示天气详情
   */
  showWeather() {
    const weatherSource = this.data.weather?.source || '未知方式';
    const ipWarning = weatherSource === 'IP 定位' ? '\n\n注意：您可能正在使用移动数据，IP 定位可能不准确' : '';
    
    wx.showModal({
      title: '实时天气信息',
      content: `所在城市：${this.data.weather?.city || '未知'}
天气：${this.data.weather?.text || '未知'}
温度：${this.data.weather?.temperature || '--'}℃
最后更新时间：${this.data.weather?.last_update || '未知'}

由 心知天气 提供实时气象数据
获取方式：${weatherSource}${ipWarning}`,
      showCancel: false,
      confirmText: "知道了"
    });
  },

  /**
   * 获取天气对应的图标和背景样式
   */
  getWeatherMeta(code) {
    const codeNum = Number(code);
    // 心知天气 code → TDesign icon 映射
    if (codeNum === 0) return { iconName: 'sunny', bgClass: 'sunny' };
    if (codeNum === 1) return { iconName: 'cloudy-night', bgClass: 'sunny' };
    if (codeNum === 2) return { iconName: 'cloudy-sunny', bgClass: 'sunny' };
    if (codeNum === 3) return { iconName: 'cloudy-day', bgClass: 'cloudy' };
    if (codeNum === 4) return { iconName: 'cloud', bgClass: 'overcast' };
    if (codeNum >= 5 && codeNum <= 7) return { iconName: 'fog', bgClass: 'foggy' };
    if (codeNum === 8) return { iconName: 'windy', bgClass: 'windy' };
    if (codeNum >= 9 && codeNum <= 12) return { iconName: 'rain-medium', bgClass: 'rainy' };
    if (codeNum === 13 || codeNum === 14) return { iconName: 'thunderstorm', bgClass: 'rainy' };
    if (codeNum === 15 || codeNum === 16) return { iconName: 'snowflake', bgClass: 'snowy' };
    if (codeNum === 18) return { iconName: 'rain-medium', bgClass: 'rainy' };
    if (codeNum === 19) return { iconName: 'snowflake', bgClass: 'snowy' };
    return { iconName: 'sunny', bgClass: 'default' };
  },

  // ===========================
  // 权限管理
  // ===========================
  
  /**
   * 检查位置权限
   */
  checkLocationPermission() {
    wx.getSetting({
      success: (res) => {
        if (!res.authSetting['scope.userLocation']) {
          wx.authorize({
            scope: 'scope.userLocation',
            success: () => {
              // 实际调用位置接口触发权限系统记录
              wx.getLocation({
                type: 'wgs84',
                success: () => logger.debug('UI', 'LOCATION', '位置权限已获取'),
                fail: () => this.showLocationGuide()
              });
            },
            fail: () => this.showLocationGuide()
          });
        }
      }
    });
  },

  /**
   * 显示位置权限引导
   */
  showLocationGuide() {
    wx.showModal({
      title: '需要位置权限',
      content: '请在系统设置中开启位置权限：\n1. 点击右上角「···」\n2. 进入「设置」\n3. 找到「位置信息」并开启',
      confirmText: '去设置',
      success: (res) => {
        if (res.confirm) {
          wx.openSetting({
            success: (settingRes) => {
              if (!settingRes.authSetting['scope.userLocation']) {
                this.showSystemSettingGuide();
              }
            }
          });
        }
      }
    });
  },

  /**
   * 显示系统权限引导
   */
  showSystemSettingGuide() {
    const systemInfo = wx.getSystemInfoSync();
    let guideText = '请前往手机设置开启权限：';
    
    if (systemInfo.platform === 'android') {
      guideText += '\n设置 > 应用管理 > 找到本小程序 > 权限管理';
    }

    wx.showModal({
      title: '系统权限指引',
      content: guideText,
      confirmText: '明白了',
      showCancel: false
    });
  },

  /**
   * 获取录音权限
   */
  getRecordAuth() {
    wx.getSetting({
      success: (res) => {
        if (!res.authSetting['scope.record']) {
          wx.authorize({
            scope: 'scope.record',
            fail: () => {
              wx.showModal({
                title: '权限申请',
                content: '需要麦克风权限进行语音输入',
                success: (res) => {
                  if (res.confirm) wx.openSetting();
                }
              });
            }
          });
        }
      },
      fail(res) {
      }
    });
  },

  /**
   * 用户拒绝授权处理
   */
  userAuthFail(scope, tip) {
    return new Promise((resolve, reject) => {
      wx.showModal({
        title: '提示',
        content: tip,
        confirmText: '去授权',
        cancelText: '不授权',
        success(res) {
          if (res.confirm) {
            wx.openSetting({
              success: (res) => {
                resolve(res.authSetting[scope]);
              }
            });
          }
          if (res.cancel) {
            reject('您拒绝了授权');
          }
        },
      });
    });
  },

  // ===========================
  // 语音识别功能
  // ===========================
  
  /**
   * 初始化语音识别
   */
  initRecord() {
    const that = this;
    
    // 有新的识别内容返回
    manager.onRecognize = function (res) {
      const text = res.result;
      that.setData({
        voiceText: text,
        content: text
      });

      // 只有非遮罩模式下的空结果才弹窗提示
      if (text === '' && !that.data.isRecording) {
        wx.showModal({
          title: '语音识别未成功',
          content: `未能识别到有效内容。可能是您在上一轮识别为完成时开启了第二轮识别。
若不是以上情况，请尝试：
1. 长按麦克风按钮保持1秒以上；
2. 在安静环境下清晰说出待办内容；
4. 确认手机麦克风权限已开启。

您也可以直接使用文字输入创建待办`,
          confirmText: '知道了',
          showCancel: false
        });
      }
    };

    // 识别错误事件
    manager.onError = function (res) {
      wx.hideLoading();
      logger.error('UI', 'VOICE', '语音识别错误', res);
      wx.showModal({
        title: '识别服务异常',
        content: `未能识别到有效内容，您需要：
1. 长按麦克风按钮保持1秒以上；
2. 在安静环境下清晰说出待办内容；
4. 确认手机麦克风权限已开启。

您也可以直接使用文字输入创建待办`,
        success(res) {
          if (res.confirm) {
            that.getRecordAuth(); // 重新获取授权
          }
        }
      });
    };

    // 识别结束事件
    manager.onStop = function (res) {
      // 遮罩模式已处理，不重复执行
      if (that._voiceDone) return;

      var text = res.result;

      // 过滤末尾标点
      if (text && text.length > 0) {
        const lastChar = text[text.length - 1];
        if (['。', '.', '，', ','].includes(lastChar)) {
          text = text.slice(0, -1);
        }
      }

      that.setData({ content: text });

      // 非遮罩模式（旧路径兼容）：遮罩模式下 text 已由 onRecognize 更新
      if (!that.data.isRecording) {
        wx.hideLoading();
        if (text) {
          wx.navigateTo({
            url: `/packagePages/add-todo/add-todo?voiceText=${encodeURIComponent(text)}`
          });
        }
      }
    };
  },

  /**
   * 开始录音
   */
  startRecording() {
    // 渐显插入 DOM
    this.setData({
      isRecording: true,
      overlayPhase: '',
      recordState: true,
      voiceText: '',
      voiceWaveBars: new Array(32).fill(0)
    });

    setTimeout(() => {
      this.setData({ overlayPhase: 'show' });
    }, 50);

    // 开始语音识别
    manager.start({ lang: 'zh_CN' });
  },

  /**
   * 触摸开始录音
   */
  touchStart(e) {
    // 如果遮罩已显示，防止二次触发
    if (this.data.isRecording) return;

    // 先检查麦克风权限
    wx.getSetting({
      success: (res) => {
        if (!res.authSetting['scope.record']) {
          wx.authorize({
            scope: 'scope.record',
            success: () => {
              this.startRecording();
            },
            fail: () => {
              wx.showModal({
                title: '需要麦克风权限',
                content: '语音功能需要麦克风权限，请在设置中开启',
                confirmText: '去设置',
                success: (res) => {
                  if (res.confirm) wx.openSetting();
                }
              });
            }
          });
        } else {
          this.startRecording();
        }
      }
    });
  },

  /**
   * 触摸结束录音
   */
  touchEnd(e) {
    if (!this.data.isRecording) return;

    // 标记完成，防止 onStop 异步竞争跳转
    this._voiceDone = true;

    // 停止语音识别
    manager.stop();

    // 触发 opacity 淡出
    this.setData({ overlayPhase: '' });

    // 等 CSS transition 0.25s 完成后移除 DOM + 跳转
    this._collapseTimer = setTimeout(() => {
      this._collapseTimer = null;
      const text = this.data.voiceText;

      this.setData({
        isRecording: false,
        recordState: false,
        voiceWaveBars: []
      });

      // 有识别文本才跳转（快速松手无文本则不跳转）
      if (text) {
        this._voiceDone = true;
        wx.navigateTo({
          url: `/packagePages/add-todo/add-todo?voiceText=${encodeURIComponent(text)}`
        });
      }
    }, 280); // 略长于 0.25s opacity transition
  },

  // ===========================
  // 页面交互与导航
  // ===========================
  
  /**
   * 手动输入内容
   */
  conInput(e) {
    this.setData({
      content: e.detail.value,
    });
  },

  /**
   * 跳转到待办详情
   */
  navigateToDetail(e) {
    if (this.data._preventTap) {
      this.setData({ _preventTap: false });
      return;
    }

    if (this.data.showCardAction) return;

    if (e.target.dataset.component === 't-radio') {
      return;
    }

    const todoId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/packagePages/todo-detail/todo-detail?todoId=${encodeURIComponent(todoId)}`
    });
  },

  /**
   * 跳转到添加待办页面
   */
  navigateToAdd() {
    const { currentTab } = this.data;
    
    if (currentTab === 'all') {
      wx.navigateTo({
        url: '/packagePages/add-todo/add-todo'
      });
    } else if (currentTab === 'combos') {
      wx.navigateTo({
        url: '/packageCombo/combo-edit/combo-edit'
      });
    } else if (currentTab === 'shared') {
      wx.showActionSheet({
        itemList: ['新建共享组合', '加入共享组合'],
        success: (res) => {
          if (res.tapIndex === 0) {
            wx.navigateTo({
              url: '/packageCombo/combo-edit/combo-edit?isShared=1'
            });
          } else if (res.tapIndex === 1) {
            wx.navigateTo({
              url: '/packageTools/join-collab/join-collab'
            });
          }
        }
      });
    }
  },

  /**
   * 跳转到公告页面
   */
  navigateToNotice() {
    // 点击后记录最新公告日期，下次不显示 NEW
    const notices = app.globalData.notices || [];
    const latestNotice = notices.find(n => n.title);
    if (latestNotice && latestNotice.date) {
      wx.setStorageSync('_lastReadNoticeDate', latestNotice.date);
    }
    this.setData({ _hasNewNotice: false });
    wx.navigateTo({
      url: '/packagePages/notice/notice'
    });
  },

  /**
   * 处理滑动操作
   */
  handleSwipeAction(e) {
    const index = parseInt(e.currentTarget.dataset.index); // 确保转换为数字
    const todo = this.data.todos[index];
    
    if (!todo) return;
    
    const actionType = e.currentTarget.dataset.type;
    switch(actionType) {
      case 'delete':
        this.deleteTodo(index);
        break;
      case 'edit':
        this.editTodo(index);
        break;
    }
  },

  /**
   * 关闭卡片操作模式
   */
  closeCardAction() {
    this.setData({ _overlayShow: false, _actionMenuShow: false });
    setTimeout(() => {
      this.setData({
        showCardAction: false,
        actionTodo: null,
        actionTodoIndex: -1,
        _actionCardTop: 0,
        _actionCardLeft: 0,
        _actionCardWidth: 0
      });
    }, 250);
  },

  /**
   * t-cell 长按 → 卡片浮起 + 操作菜单
   */
  onCellLongPress(e) {
    const index = e.currentTarget.dataset.index;
    const todo = this.data.todos[index];
    if (!todo) return;

    if (this.data._longPressTimer) {
      clearTimeout(this.data._longPressTimer);
      this.setData({ _longPressTimer: null });
    }

    wx.vibrateShort({ type: 'medium' });

    // 获取 cell 位置
    const query = wx.createSelectorQuery().in(this);
    query.selectAll('.todo-item-wrapper').boundingClientRect().exec((res) => {
      if (!res || !res[0] || !res[0][index]) return;
      const rect = res[0][index];

      const sysInfo = wx.getSystemInfoSync();
      const screenMid = sysInfo.windowHeight / 2;
      const isBelow = rect.top > screenMid;
      const gap = 12;
      const menuW = sysInfo.windowWidth * 0.9;
      const menuLeft = (sysInfo.windowWidth - menuW) / 2;

      this.setData({
        showCardAction: true,
        actionTodo: todo,
        actionTodoIndex: index,
        _overlayShow: false,
        _actionCardTop: rect.top,
        _actionCardLeft: rect.left,
        _actionCardWidth: rect.width,
        _actionMenuStyle: isBelow
          ? `bottom:${sysInfo.windowHeight - rect.top + gap}px;left:${menuLeft}px;width:${menuW}px;`
          : `top:${rect.bottom + gap}px;left:${menuLeft}px;width:${menuW}px;`,
        _actionMenuDir: isBelow ? 'up' : 'down',
        _actionMenuShow: false
      });

      setTimeout(() => {
        this.setData({ _actionMenuShow: true, _overlayShow: true });
      }, 50);
    });
  },

  async onCardShareAction(e) {
    const todo = this.data.actionTodo;
    if (!todo) return;
    if (!isLoggedIn()) {
      wx.showModal({
        title: '提示',
        content: '分享需要登录账号，是否前往登录？',
        success(r) { if (r.confirm) wx.navigateTo({ url: '/packagePages/login/login' }); }
      });
      return;
    }
    this.closeCardAction();
    wx.navigateTo({ url: '/packagePages/share-config/share-config?todoId=' + todo.id });
  },

  /**
   * 操作菜单按钮点击
   */
  onCardActionTap(e) {
    const action = e.currentTarget.dataset.action;
    const index = this.data.actionTodoIndex;

    switch (action) {
      case 'edit':
        this.closeCardAction();
        setTimeout(() => this.editTodo(index), 100);
        break;
      case 'delete':
        this.closeCardAction();
        setTimeout(() => this.deleteTodo(index), 100);
        break;
      case 'copy':
        this.closeCardAction();
        const copyTodo = this.data.actionTodo;
        if (copyTodo && copyTodo.id) {
          setTimeout(() => this.showCopyPopup(copyTodo), 100);
        }
        break;
      case 'share':
        this.closeCardAction();
        const shareTodo2 = this.data.actionTodo;
        if (shareTodo2 && shareTodo2.id) {
          if (!isLoggedIn()) {
            wx.showModal({
              title: '提示',
              content: '分享需要登录账号，是否前往登录？',
              success(r) { if (r.confirm) wx.navigateTo({ url: '/packagePages/login/login' }); }
            });
            break;
          }
          setTimeout(() => {
            wx.navigateTo({ url: '/packagePages/share-config/share-config?todoId=' + shareTodo2.id });
          }, 100);
        }
        break;
      default:
        this.closeCardAction();
        break;
    }
  },


  // ===========================
  // 复制待办
  // ===========================

  showCopyPopup(todo) {
    this.setData({
      _showCopyPopup: true,
      _copyInputValue: todo.text,
      _copyKeepCompleted: true,
      _copyKeepStar: true,
      _copySourceTodo: todo
    });
  },

  onCopyInput(e) {
    this.setData({ _copyInputValue: e.detail.value });
  },

  onCopyKeepCompletedChange() {
    this.setData({ _copyKeepCompleted: !this.data._copyKeepCompleted });
  },

  onCopyKeepStarChange() {
    this.setData({ _copyKeepStar: !this.data._copyKeepStar });
  },

  onCopyCancel() {
    this.setData({ _showCopyPopup: false, _copySourceTodo: null });
  },

  onCopyConfirm() {
    const source = this.data._copySourceTodo;
    const newText = this.data._copyInputValue.trim();
    if (!source || !newText) {
      wx.showToast({ title: '请输入待办名称', icon: 'none' });
      return;
    }
    const keepCompleted = this.data._copyKeepCompleted;
    const keepStar = this.data._copyKeepStar;
    this.copyTodoWithSubtrees(source, newText, keepCompleted, keepStar);
    this.setData({ _showCopyPopup: false, _copySourceTodo: null });
    const allTodos = getLocalTodos();
    const todos = this.formatAllTodos(allTodos.filter(item => !item.isDeleted && !item.parent_id));
    this.setData({ todos, allTodos: todos });
    getApp().updateCalendarCache(todos);
    wx.showToast({ title: '已复制', icon: 'success' });
  },

  copyTodoWithSubtrees(source, newText, keepCompleted, keepStar) {
    const now = Date.now();
    const newRootId = 'todo_' + now + '_' + Math.random().toString(36).substring(2, 8);
    const newRoot = {
      ...source,
      id: newRootId,
      text: newText,
      time: now,
      completed: keepCompleted && source.completed ? source.completed : false,
      isStar: keepStar && source.isStar ? source.isStar : false,
      version: 1,
      updatedAt: now
    };
    delete newRoot.parent_id;
    saveTodo(newRoot);

    const allTodos = getLocalTodos();
    const queue = [{ oldId: source.id, newId: newRootId }];
    while (queue.length > 0) {
      const { oldId, newId } = queue.shift();
      const children = allTodos.filter(t => t.parent_id === oldId && !t.isDeleted);
      for (const child of children) {
        const newChildId = 'todo_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
        saveTodo({
          ...child,
          id: newChildId,
          parent_id: newId,
          completed: keepCompleted && child.completed ? child.completed : false,
          time: Date.now(),
          version: 1,
          updatedAt: Date.now()
        });
        queue.push({ oldId: child.id, newId: newChildId });
      }
    }
  },

  /**
   * 监听页面滚动
   */
  onPageScroll(e) {
    const show = e.scrollTop > 500; // 阈值
    if (this.data.showBackTop !== show) {
      this.setData({ showBackTop: show });
    }
  },

  /**
   * 返回顶部
   */
  onToTop() {
    wx.pageScrollTo({
      scrollTop: 0,
      duration: 300
    });
  },

  // ===========================
  // 辅助函数
  // ===========================

  /**
   * 格式化日期
   */
  formatDate(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * 格式化时间
   */
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

  /**
   * 格式化待办日期时间
   */
  formatTodoDate(dateValue) {
    if (!dateValue) return '';
    const dateObj = new Date(dateValue);
    if (isNaN(dateObj.getTime())) return '';
    return this.formatDate(dateObj);
  },

  /**
   * 格式化所有待办的日期时间
   */
  formatAllTodos(todos) {
    if (!todos || !Array.isArray(todos)) return todos;
    return todos.map(todo => ({
      ...todo,
      setDate: this.formatTodoDate(todo.setDate),
      setTime: this.formatTime(todo.setTime),
      friendlyDate: formatFriendlyDate(todo.setDate),
      priority: todo.priority || 'p2'
    }));
  },

  // ===========================
  // 广告事件处理
  // ===========================

  /**
   * 广告加载失败
   */
  onAdError(err) {
    logger.error('UI', 'AD', '原生模板广告加载失败', err);
  },

  // ===========================
  // 分享参数处理
  // ===========================

  handleShareParams(options) {
    const { type, code, auto } = options;
    
    if (type === 'combo_invite' && code) {
      const shareData = {
        type: 'combo_invite',
        code: code.toUpperCase().slice(0, 6),
        auto: auto === '1',
        timestamp: Date.now()
      };
      
      wx.setStorageSync('pendingShareData', shareData);
      
      if (!isLoggedIn()) {
        this.setData({ showLoginPopup: true });
      } else {
        this.processComboInvite(shareData.code, shareData.auto);
      }
    }
  },

  handleSceneParams(options) {
    let scene = options.scene;
    if (!scene) return;
    
    try {
      scene = decodeURIComponent(scene);
    } catch (e) {
      logger.error('APP', 'SCENE', '解码scene参数失败', e);
      return;
    }
    
    let code = '';
    let autoJoin = false;
    
    if (scene.includes('=')) {
      const params = {};
      const parts = scene.split('&');
      parts.forEach(part => {
        const [key, value] = part.split('=');
        if (key && value) {
          params[key] = value;
        }
      });
      
      if (params.code) {
        code = params.code.toUpperCase().slice(0, 6);
        autoJoin = params.auto === '1';
      }
    }
    
    if (code.length === 6) {
      const shareData = {
        type: 'combo_invite',
        code: code,
        auto: autoJoin,
        timestamp: Date.now()
      };
      
      wx.setStorageSync('pendingShareData', shareData);
      
      if (!isLoggedIn()) {
        this.setData({ showLoginPopup: true });
      } else {
        this.processComboInvite(shareData.code, shareData.auto);
      }
    }
  },

  checkPendingShareData() {
    const shareData = wx.getStorageSync('pendingShareData');
    
    if (!shareData) return;
    
    const TEN_MINUTES = 10 * 60 * 1000;
    if (Date.now() - shareData.timestamp > TEN_MINUTES) {
      wx.removeStorageSync('pendingShareData');
      return;
    }
    
    if (shareData.type === 'combo_invite') {
      if (!isLoggedIn()) {
        this.setData({ showLoginPopup: true });
      } else {
        this.processComboInvite(shareData.code, shareData.auto);
      }
    }
  },

  async processComboInvite(code, autoJoin = false) {
    if (!code || code.length !== 6) {
      wx.showToast({ title: '无效的邀请码', icon: 'none' });
      wx.removeStorageSync('pendingShareData');
      return;
    }

    try {
      const result = await collabApi.join(code);
      const comboInfo = result.combo || result;
      comboInfo.isMember = result.isMember;
      comboInfo.hasPendingRequest = result.hasPendingRequest;
      comboInfo.memberFull = result.memberFull;
      comboInfo.inviteCode = code;
      
      this.setData({
        showInvitePopup: true,
        inviteComboInfo: comboInfo,
        inviteAutoJoin: autoJoin
      });
    } catch (err) {
      wx.showToast({ title: err.message || '获取组合信息失败', icon: 'none' });
      wx.removeStorageSync('pendingShareData');
    }
  },

  hideLoginPopup(e) {
    if (e && e.detail && e.detail.visible === true) {
      return;
    }
    this.setData({ showLoginPopup: false });
    wx.removeStorageSync('pendingShareData');
  },

  goToLogin() {
    this.setData({ showLoginPopup: false });
    wx.navigateTo({ url: '/packagePages/login/login' });
  },

  hideInvitePopup(e) {
    if (e && e.detail && e.detail.visible === true) {
      return;
    }
    this.setData({ showInvitePopup: false, inviteComboInfo: null, inviteAutoJoin: false });
    wx.removeStorageSync('pendingShareData');
  },

  async handleJoinCombo() {
    const { inviteComboInfo, isJoining, inviteAutoJoin } = this.data;
    
    if (isJoining || !inviteComboInfo) return;
    
    if (inviteComboInfo.isMember) {
      wx.navigateTo({
        url: `/packageCombo/combo-detail/combo-detail?id=${inviteComboInfo.id}&shared=1`
      });
      this.hideInvitePopup();
      return;
    }
    
    if (inviteComboInfo.memberFull) {
      wx.showModal({
        title: '成员已满',
        content: '该共享组合成员已满，请联系该组合的超管或管理员。',
        showCancel: false,
        confirmText: '我知道了'
      });
      return;
    }
    
    if (inviteComboInfo.hasPendingRequest) {
      wx.showModal({
        title: '提示',
        content: '您已发送过加入申请，请等待超管审批。',
        showCancel: false,
        confirmText: '我知道了'
      });
      return;
    }

    this.setData({ isJoining: true });

    try {
      const code = inviteComboInfo.inviteCode;
      let result;
      
      if (inviteAutoJoin) {
        result = await collabApi.autoJoin(code);
        
        this.setData({ isJoining: false, showInvitePopup: false });
        wx.removeStorageSync('pendingShareData');
        
        wx.showModal({
          title: '加入成功',
          content: '您已成功加入该共享组合！是否立即进入？\n\n您也可以在"共享组合"标签页找到该组合。',
          confirmText: '立即进入',
          cancelText: '稍后再说',
          success: (res) => {
            if (res.confirm) {
              const comboId = result.combo?.id || inviteComboInfo.id;
              wx.navigateTo({
                url: `/packageCombo/combo-detail/combo-detail?id=${comboId}&shared=1`
              });
            }
            this.loadCombosFromCloud();
          }
        });
      } else {
        result = await collabApi.sendRequest(code);
        
        this.setData({ 
          isJoining: false, 
          'inviteComboInfo.hasPendingRequest': true 
        });
        
        wx.showModal({
          title: '申请已发送',
          content: '您的加入申请已发送，请等待超管或管理员审批。',
          showCancel: false,
          confirmText: '我知道了',
          success: () => {
            this.askSubscribeApprovalResult();
          }
        });
      }
    } catch (err) {
      this.setData({ isJoining: false });
      
      if (err.message && err.message.includes('已是该组成员')) {
        wx.showModal({
          title: '提示',
          content: '您已经是该组合的成员，是否立即进入？',
          confirmText: '立即进入',
          cancelText: '稍后再说',
          success: (res) => {
            if (res.confirm) {
              wx.navigateTo({
                url: `/packageCombo/combo-detail/combo-detail?id=${inviteComboInfo.id}&shared=1`
              });
            }
            this.hideInvitePopup();
          }
        });
      } else if (err.message && err.message.includes('成员已满')) {
        wx.showModal({
          title: '成员已满',
          content: '该共享组合成员已满，请联系该组合的超管或管理员。',
          showCancel: false,
          confirmText: '我知道了'
        });
      } else {
        wx.showToast({ title: err.message || '操作失败', icon: 'none' });
      }
    }
  },

  askSubscribeApprovalResult() {
    const templateId = 'LenG38LPKm6kK4ymXx4Ftoc9LoN2f7xXh7qJ-U-myxA';
    
    wx.showModal({
      title: '订阅审批结果',
      content: '审批通过或拒绝后，您将第一时间收到消息提醒。',
      confirmText: '订阅通知',
      cancelText: '暂不需要',
      success: async (res) => {
        if (res.confirm) {
          try {
            const subscribeRes = await wx.requestSubscribeMessage({
              tmplIds: [templateId]
            });
            
            if (subscribeRes[templateId] === 'accept') {
              const { notifyApi } = require('../../utils/api.js');
              await notifyApi.subscribe([templateId]);
              wx.showToast({ title: '订阅成功', icon: 'success' });
            } else {
              wx.showToast({ title: '已取消订阅', icon: 'none' });
            }
          } catch (err) {
            logger.error('NOTIFY', 'SUBSCRIBE', '订阅失败', err);
            wx.showToast({ title: '订阅失败', icon: 'none' });
          }
        }
      }
    });
  },

  async checkPendingApprovals() {
    if (!isLoggedIn()) return;
    
    const sharedCombos = app.globalData.sharedCombos || [];
    if (sharedCombos.length === 0) return;
    
    const managedCombos = sharedCombos.filter(combo => 
      combo.role === 'owner' || combo.role === 'admin'
    );
    if (managedCombos.length === 0) return;
    
    const approvalGroups = [];
    
    for (const combo of managedCombos) {
      try {
        const result = await collabApi.getRequests(combo.id);
        const requests = result.requests || result || [];
        if (requests.length > 0) {
          const formattedRequests = requests.map(req => ({
            ...req,
            formattedTime: formatDateTime(req.createdAt || req.created_at)
          }));
          approvalGroups.push({
            combo: combo,
            requests: formattedRequests
          });
        }
      } catch (err) {
        logger.error('COLLAB', 'APPROVALS', '获取审批申请失败', err);
      }
    }
    
    if (approvalGroups.length > 0) {
      const totalApprovalCount = approvalGroups.reduce((sum, group) => sum + group.requests.length, 0);
      this.setData({
        showApprovalPopup: true,
        approvalGroups: approvalGroups,
        totalApprovalCount: totalApprovalCount
      });
    }
  },

  hideApprovalPopup(e) {
    if (e && e.detail && e.detail.visible === true) {
      return;
    }
    this.setData({ 
      showApprovalPopup: false, 
      approvalGroups: [],
      totalApprovalCount: 0
    });
  },

  async approveRequest(e) {
    const requestId = e.currentTarget.dataset.id;
    const comboId = e.currentTarget.dataset.comboId;
    const { approvalGroups } = this.data;
    
    const group = approvalGroups.find(g => String(g.combo.id) === String(comboId));
    const request = group?.requests.find(r => r.id === requestId);
    
    this.setData({ approvalLoading: true });
    
    try {
      await collabApi.approveRequest(requestId);
      wx.showToast({ title: '已通过', icon: 'success' });
      
      this.sendApprovalNotification({
        comboName: group?.combo?.name,
        comboId: group?.combo?.id,
        shareCode: group?.combo?.share_code || group?.combo?.shareCode,
        applicantId: request?.userId || request?.user_id,
        requestTime: request?.createdAt || request?.created_at,
        approved: true
      });
      
      const newGroups = approvalGroups.map(group => {
        if (String(group.combo.id) === String(comboId)) {
          return {
            ...group,
            requests: group.requests.filter(r => r.id !== requestId)
          };
        }
        return group;
      }).filter(group => group.requests.length > 0);
      
      if (newGroups.length > 0) {
        const totalApprovalCount = newGroups.reduce((sum, group) => sum + group.requests.length, 0);
        this.setData({ 
          approvalGroups: newGroups,
          totalApprovalCount: totalApprovalCount,
          approvalLoading: false
        });
      } else {
        this.setData({ 
          showApprovalPopup: false,
          approvalGroups: [],
          totalApprovalCount: 0,
          approvalLoading: false
        });
      }
      
      this.loadCombosFromCloud();
    } catch (err) {
      this.setData({ approvalLoading: false });
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
    }
  },

  async rejectRequest(e) {
    const requestId = e.currentTarget.dataset.id;
    const comboId = e.currentTarget.dataset.comboId;
    const { approvalGroups } = this.data;
    
    const group = approvalGroups.find(g => String(g.combo.id) === String(comboId));
    const request = group?.requests.find(r => r.id === requestId);
    
    this.setData({ approvalLoading: true });
    
    try {
      await collabApi.rejectRequest(requestId);
      wx.showToast({ title: '已拒绝', icon: 'success' });
      
      this.sendApprovalNotification({
        comboName: group?.combo?.name,
        comboId: group?.combo?.id,
        shareCode: group?.combo?.share_code || group?.combo?.shareCode,
        applicantId: request?.userId || request?.user_id,
        requestTime: request?.createdAt || request?.created_at,
        approved: false
      });
      
      const newGroups = approvalGroups.map(group => {
        if (String(group.combo.id) === String(comboId)) {
          return {
            ...group,
            requests: group.requests.filter(r => r.id !== requestId)
          };
        }
        return group;
      }).filter(group => group.requests.length > 0);
      
      if (newGroups.length > 0) {
        const totalApprovalCount = newGroups.reduce((sum, group) => sum + group.requests.length, 0);
        this.setData({ 
          approvalGroups: newGroups,
          totalApprovalCount: totalApprovalCount,
          approvalLoading: false
        });
      } else {
        this.setData({ 
          showApprovalPopup: false,
          approvalGroups: [],
          totalApprovalCount: 0,
          approvalLoading: false
        });
      }
    } catch (err) {
      this.setData({ approvalLoading: false });
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
    }
  },

  async sendApprovalNotification({ comboName, comboId, shareCode, applicantId, requestTime, approved }) {
    if (!applicantId) return;
    
    try {
      const userInfo = app.globalData.userInfo || wx.getStorageSync('user') || {};
      const now = new Date();
      
      const formatTime = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const h = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');
        return `${y}年${m}月${d}日 ${h}:${min}`;
      };
      
      await notifyApi.sendApprovalResult({
        templateId: 'LenG38LPKm6kK4ymXx4Ftoc9LoN2f7xXh7qJ-U-myxA',
        toUserId: applicantId,
        comboId: comboId,
        shareCode: shareCode,
        approved: approved,
        data: {
          thing28: { value: `申请加入「${comboName || '协作组'}」` },
          time52: { value: formatTime(new Date(requestTime)) },
          time26: { value: formatTime(now) },
          phrase1: { value: approved ? '已通过' : '未通过' },
          name2: { value: userInfo.nickname || '管理员' }
        }
      });
    } catch (err) {
      logger.error('NOTIFY', 'APPROVAL', '发送审批通知失败', err);
    }
  }
});
