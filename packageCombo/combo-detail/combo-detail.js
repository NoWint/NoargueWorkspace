const app = getApp();
const { combosApi, collabApi, isLoggedIn, notifyApi, adminApi, confirmRevokeIfShared } = require('../../utils/api.js');
const { getLocalTodos, saveTodo, getTodoById, deleteTodoById, syncWithCloud, addDeletedTodo } = require('../../utils/sync.js');
const { formatDateTime } = require('../../utils/util.js');

const plugin = requirePlugin('WechatSI');
const manager = plugin.getRecordRecognitionManager();

function formatDate(dateStr) {
  if (!dateStr) return '';
  const target = new Date(dateStr);
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

  if (dateStr === todayStr) return '今天';
  if (dateStr === yesterdayStr) return '昨天';
  if (dateStr === tomorrowStr) return '明天';

  const month = target.getMonth() + 1;
  const day = target.getDate();
  return `${month}月${day}日`;
}

// 标准化日期字符串：兼容 ISO UTC、"YYYY-MM-DD" 等格式，返回本地日期
function extractDateStr(dateStr) {
  if (!dateStr) return dateStr;
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

Page({
  data: {
    comboId: '',
    isShared: false,
    combo: null,
    todos: [],
    sharedTodos: [],
    filteredSharedTodos: [],
    members: [],
    requests: [],
    userRole: 'member',
    shareCode: '',
    showDescription: false,
    showOverallCompletion: false,
    showFilterPopup: false,
    filterMode: 'all',
    filterModeText: '',
    currentUserId: null,
    adminView: false,
    adminUserId: null,
    completedCount: 0,
    completionRate: 0,
    myAssignedCount: 0,
    _togglingIds: {},
    fixedHeaderHeight: 0,
    showBackTop: false,
    recordState: false,
    content: '',
    // 语音遮罩相关
    isRecording: false,
    overlayPhase: '',
    voiceText: '',
    voiceWaveBars: [],

    navBarHeight: app.globalData.navBarHeight,
    menuRight: app.globalData.menuRight
  },

  onLoad(options) {
    this.initRecord();
    
    if (options.adminView === '1') {
      this.setData({ adminView: true, comboId: options.id, adminUserId: options.userId });
      // 持久化 adminView 参数，防止页面重建时丢失
      wx.setStorageSync('_adminView_combo_' + options.id, {
        adminView: true,
        userId: options.userId,
        timestamp: Date.now()
      });
      this.loadComboDataForAdmin(options.id, options.userId);
      return;
    }
    
    if (options.shared === '1' && !isLoggedIn()) {
      wx.showModal({
        title: '需要登录',
        content: '查看共享组合需要登录，是否前往登录？',
        confirmText: '去登录',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/packagePages/login/login' });
          }
          if (res.cancel) {
            wx.navigateBack();
          }
        }
      });
      return;
    }
    
    if (options.id) {
      this.setData({ comboId: options.id });
      this.loadComboData(options.id);
    }
    if (options.shared === '1') {
      this.setData({ isShared: true });
    }
  },

  onShow() {
    if (this.data.adminView) {
      return;
    }

    // 检查是否有持久化的 adminView 参数（防止页面重建时参数丢失）
    if (this.data.comboId) {
      const cached = wx.getStorageSync('_adminView_combo_' + this.data.comboId);
      if (cached && cached.adminView && (Date.now() - cached.timestamp < 300000)) {
        // 5分钟内有效，恢复 adminView
        this.setData({ adminView: true, adminUserId: cached.userId });
        this.loadComboDataForAdmin(this.data.comboId, cached.userId);
        return;
      }
      this.loadComboData(this.data.comboId);
    }
  },

  onReady() {
    this.updateFixedHeaderHeight();
  },

  updateFixedHeaderHeight() {
    const query = wx.createSelectorQuery();
    query.select('#fixedHeader').boundingClientRect((rect) => {
      if (rect) {
        this.setData({
          fixedHeaderHeight: rect.height
        });
      }
    }).exec();
  },

  async onPullDownRefresh() {
    if (this.data.adminView) {
      if (this.data.comboId) {
        await this.loadComboDataForAdmin(this.data.comboId, this.data.adminUserId);
      }
      wx.stopPullDownRefresh();
      return;
    }

    if (this.data.comboId) {
      await this.loadComboData(this.data.comboId);
      wx.stopPullDownRefresh();
    }
  },

  checkMembership() {
    if (this.data.isShared && !this.data.userRole) {
      wx.showModal({
        title: '提示',
        content: '您已不是该协作组成员',
        showCancel: false,
        confirmText: '知道了',
        success: () => {
          wx.navigateBack();
        }
      });
      return false;
    }
    return true;
  },

  checkDefaultNickname() {
    const checkKey = `nickname_prompt_${this.data.comboId}`;
    const hasPrompted = wx.getStorageSync(checkKey);
    if (hasPrompted) return;
    
    if (this.data._nicknameChecking) return;
    this.data._nicknameChecking = true;
    
    const userInfo = app.globalData.userInfo || wx.getStorageSync('user') || {};
    const nickname = userInfo.nickname || '';
    
    if (nickname === '时光绿径用户') {
      wx.setStorageSync(checkKey, true);
      wx.showModal({
        title: '设置昵称',
        content: '检测到您还未设置昵称，设置昵称后便于组织管理，其他成员也能更容易识别您。是否前往设置？',
        confirmText: '去设置',
        cancelText: '稍后再说',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/packagePages/user-center/user-center' });
          }
        }
      });
    }
    this.data._nicknameChecking = false;
  },

  async loadComboData(id) {
    try {
      const result = await combosApi.getById(id);
      const combo = result.combo || result;
      
      if (combo.isShared || combo.is_shared) {
        if (!combo.userRole) {
          wx.showModal({
            title: '提示',
            content: '您已不是该协作组成员',
            showCancel: false,
            confirmText: '知道了',
            success: () => {
              wx.navigateBack();
            }
          });
          return;
        }
        
        const starredSharedTodos = wx.getStorageSync('starredSharedTodos') || {};
        const app = getApp();
        let currentUserId = app.globalData.userInfo?.id;
        
        if (!currentUserId) {
          const storedUser = wx.getStorageSync('user');
          currentUserId = storedUser?.id;
        }
        
        const sharedTodos = (combo.sharedTodos || []).map(todo => {
          let rawDate = extractDateStr(todo.setDate || todo.set_date);
          let rawTime = todo.setTime || todo.set_time || '12:00';

          if (rawTime && rawTime.includes(':')) {
            const parts = rawTime.split(':');
            rawTime = `${parts[0]}:${parts[1]}`;
          }
          
          const myCompletedAt = todo.myCompletedAt || todo.my_completed_at || null;
          const assignments = todo.assignments || [];
          const assignType = todo.assignType || todo.assign_type;
          const excludeType = todo.excludeType || todo.exclude_type || '';
          const creatorId = todo.creator?.id || todo.creator_id;
          const completedCount = todo.completedCount || assignments.filter(a => a.completedAt).length;
          const assignCount = todo.assignCount || assignments.length;
          const progressPercent = assignCount > 0 ? Math.round((completedCount / assignCount) * 100) : 0;
          
          let isAssigned = false;
          let shouldShowRadio = false;
          
          if (assignType === 'specific') {
            isAssigned = assignments.some(a => String(a.userId) === String(currentUserId));
            shouldShowRadio = isAssigned;
          } else {
            isAssigned = true;
            const isOwner = combo.userRole === 'owner';
            const isAdmin = combo.userRole === 'admin';
            const isCreator = currentUserId && creatorId && String(currentUserId) === String(creatorId);
            const isCompleted = !!(todo.completedAt || todo.completed_at);
            const isMyCompleted = !!(myCompletedAt);
            
            if (assignType === 'any' && isCompleted) {
              shouldShowRadio = isMyCompleted;
            } else if (excludeType === 'owner' && isOwner) {
              shouldShowRadio = false;
            } else if (excludeType === 'self' && isCreator) {
              shouldShowRadio = false;
            } else if (excludeType === 'admins' && (isOwner || isAdmin)) {
              shouldShowRadio = false;
            } else {
              shouldShowRadio = true;
            }
          }
          
          const completedAtTimestamp = todo.completedAt || todo.completed_at;
          const formatCompletedAt = (timestamp) => {
            if (!timestamp) return '';
            const date = new Date(timestamp);
            const month = date.getMonth() + 1;
            const day = date.getDate();
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            return `${month}月${day}日 ${hours}:${minutes}`;
          };
          
          return {
            ...todo,
            id: todo.id,
            text: todo.text,
            remarks: todo.remarks || '',
            location: todo.location || null,
            setDate: rawDate,
            setTime: rawTime,
            assignType: assignType,
            excludeType: excludeType,
            completedAt: completedAtTimestamp,
            formattedCompletedAt: formatCompletedAt(completedAtTimestamp),
            myCompletedAt: myCompletedAt,
            formattedDate: formatDate(rawDate),
            assigneeNames: assignments.map(a => a.nickname).join('、') || '未指定',
            assignments: assignments,
            isStar: !!starredSharedTodos[todo.id],
            isAssigned: isAssigned,
            shouldShowRadio: shouldShowRadio,
            completedCount: completedCount,
            assignCount: assignCount,
            progressPercent: progressPercent
          };
        });
        
        let requests = [];
        if (combo.userRole === 'owner' || combo.userRole === 'admin') {
          try {
            const requestsResult = await collabApi.getRequests(id);
            const rawRequests = requestsResult.requests || requestsResult || [];
            requests = rawRequests.map(req => ({
              ...req,
              formattedTime: formatDateTime(req.createdAt || req.created_at)
            }));
          } catch (err) {
            logger.error('COLLAB', 'APPROVALS', '获取审批申请失败', err);
          }
        }
        
        this.setData({
          combo,
          comboId: id,
          isShared: true,
          shareCode: combo.shareCode || '',
          userRole: combo.userRole || 'member',
          members: combo.members || [],
          sharedTodos,
          requests,
          currentUserId
        });
        
        this.checkDefaultNickname();
        
        this.loadFilterPreference();
        this.loadShowOverallPreference();
        this.applyFilter();
        this.updateStats();
        
        setTimeout(() => this.updateFixedHeaderHeight(), 100);
      } else {
        const allTodos = getLocalTodos();
        const comboTodos = allTodos.filter(todo => 
          String(todo.comboId) === String(id) && !todo.isDeleted
        ).map(todo => ({
          ...todo,
          formattedDate: formatDate(todo.setDate)
        }));
        
        this.setData({
          combo,
          comboId: id,
          todos: comboTodos,
          isShared: false,
          userRole: 'owner'
        });
        this.updateStats();
        
        setTimeout(() => this.updateFixedHeaderHeight(), 100);
      }
    } catch (err) {
      logger.error('COMBO', 'LOAD', '加载组合失败', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  toggleTodo(e) {
    const index = e.currentTarget.dataset.index;
    const todo = this.data.todos[index];
    if (!todo || !todo.id) return;
    
    const todoId = todo.id;
    
    if (this.data._togglingIds[todoId]) {
      return;
    }
    
    this.setData({
      [`_togglingIds.${todoId}`]: true
    });
    
    const isCompleting = !todo.completed;
    const now = Date.now();
    
    const todos = this.data.todos.map((item, i) => {
      if (i === index) {
        return { ...item, completed: isCompleting ? now : false, formattedDate: item.formattedDate };
      }
      return item;
    });
    
    this.setData({ todos });
    
    const storedTodo = getTodoById(todoId);
    if (storedTodo) {
      storedTodo.completed = isCompleting ? now : false;
      storedTodo.version = (storedTodo.version || 1) + 1;
      storedTodo.updatedAt = now;
      saveTodo(storedTodo);
    }
    app.updateCalendarCache(getLocalTodos());
    this.updateStats();
    
    setTimeout(() => {
      this.setData({
        [`_togglingIds.${todoId}`]: false
      });
    }, 300);
    
    if (isLoggedIn()) {
      this.autoSyncToCloud();
    }
  },

  stopPropagation() {},

  toggleViewMode(e) {
    const value = e.detail.value;
    this.setData({ showOverallCompletion: value });
    this.saveShowOverallPreference(value);
  },

  showFilterPopup() {
    this.setData({ showFilterPopup: true });
  },

  hideFilterPopup() {
    this.setData({ showFilterPopup: false });
  },

  onFilterPopupVisibleChange(e) {
    this.setData({ showFilterPopup: e.detail.visible });
  },

  onFilterChange(e) {
    const filterMode = e.detail.value;
    this.setFilterMode(filterMode);
  },

  onFilterOptionTap(e) {
    const filterMode = e.currentTarget.dataset.value;
    this.setFilterMode(filterMode);
  },

  setFilterMode(filterMode) {
    const filterModeText = this.getFilterModeText(filterMode);
    this.setData({ filterMode, filterModeText, showFilterPopup: false });
    this.saveFilterPreference(filterMode);
    this.applyFilter();
  },

  getFilterModeText(mode) {
    const texts = {
      'all': '全部',
      'my_assigned': '我被分配',
      'my_uncompleted': '我未完成',
      'my_completed': '我已完成',
      'global_uncompleted': '未完成',
      'global_completed': '已完成'
    };
    return texts[mode] || '';
  },

  isUserAssigned(todo, userId) {
    if (todo.assignType === 'specific') {
      return (todo.assignments || []).some(a => String(a.userId || a.user_id) === String(userId));
    }
    
    const excludeType = todo.excludeType || todo.exclude_type || '';
    const combo = this.data.combo;
    const userRole = combo ? combo.userRole : this.data.userRole;
    const creatorId = todo.creator?.id || todo.creator_id;
    const isOwner = userRole === 'owner';
    const isAdmin = userRole === 'admin';
    const isCreator = userId && creatorId && String(userId) === String(creatorId);
    
    if (excludeType === 'owner' && isOwner) return false;
    if (excludeType === 'self' && isCreator) return false;
    if (excludeType === 'admins' && (isOwner || isAdmin)) return false;
    
    return true;
  },

  applyFilter() {
    const { sharedTodos, filterMode, currentUserId } = this.data;
    
    if (!this.data.isShared) {
      this.setData({ filteredSharedTodos: [] });
      return;
    }
    
    let filtered = [...sharedTodos];
    
    switch (filterMode) {
      case 'my_assigned':
        filtered = sharedTodos.filter(todo => this.isUserAssigned(todo, currentUserId));
        break;
      case 'my_uncompleted':
        filtered = sharedTodos.filter(todo => 
          this.isUserAssigned(todo, currentUserId) && !todo.myCompletedAt
        );
        break;
      case 'my_completed':
        filtered = sharedTodos.filter(todo => 
          this.isUserAssigned(todo, currentUserId) && !!todo.myCompletedAt
        );
        break;
      case 'global_uncompleted':
        filtered = sharedTodos.filter(todo => !todo.completedAt);
        break;
      case 'global_completed':
        filtered = sharedTodos.filter(todo => !!todo.completedAt);
        break;
      default:
        break;
    }
    
    this.setData({ filteredSharedTodos: filtered });
    this.updateStats();
  },

  loadFilterPreference() {
    const { comboId } = this.data;
    const key = `combo_detail_filter_mode_${comboId}`;
    const savedMode = wx.getStorageSync(key);
    if (savedMode) {
      const filterModeText = this.getFilterModeText(savedMode);
      this.setData({ filterMode: savedMode, filterModeText });
    }
  },

  saveFilterPreference(mode) {
    const { comboId } = this.data;
    const key = `combo_detail_filter_mode_${comboId}`;
    wx.setStorageSync(key, mode);
  },

  loadShowOverallPreference() {
    const { comboId } = this.data;
    const key = `combo_detail_show_overall_${comboId}`;
    const savedValue = wx.getStorageSync(key);
    if (savedValue !== '' && savedValue !== null && savedValue !== undefined) {
      this.setData({ showOverallCompletion: savedValue });
    }
  },

  saveShowOverallPreference(value) {
    const { comboId } = this.data;
    const key = `combo_detail_show_overall_${comboId}`;
    wx.setStorageSync(key, value);
  },

  async approveRequest(e) {
    const requestId = e.currentTarget.dataset.id;
    const { combo, requests } = this.data;
    const request = requests.find(r => r.id === requestId);
    
    try {
      await collabApi.approveRequest(requestId);
      wx.showToast({ title: '已通过', icon: 'success' });
      
      this.sendApprovalNotification({
        comboName: combo?.name,
        comboId: combo?.id,
        shareCode: combo?.share_code || combo?.shareCode,
        applicantId: request?.userId || request?.user_id,
        requestTime: request?.createdAt || request?.created_at,
        approved: true
      });
      
      this.loadComboData(this.data.comboId);
    } catch (err) {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
    }
  },

  async rejectRequest(e) {
    const requestId = e.currentTarget.dataset.id;
    const { combo, requests } = this.data;
    const request = requests.find(r => r.id === requestId);
    
    try {
      await collabApi.rejectRequest(requestId);
      wx.showToast({ title: '已拒绝', icon: 'success' });
      
      this.sendApprovalNotification({
        comboName: combo?.name,
        comboId: combo?.id,
        shareCode: combo?.share_code || combo?.shareCode,
        applicantId: request?.userId || request?.user_id,
        requestTime: request?.createdAt || request?.created_at,
        approved: false
      });
      
      this.loadComboData(this.data.comboId);
    } catch (err) {
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
  },

  async toggleSharedTodo(e) {
    if (!this.checkMembership()) return;
    
    const todoId = e.currentTarget.dataset.id;
    const sharedTodos = this.data.sharedTodos;
    const sharedTodoIndex = sharedTodos.findIndex(t => t.id === todoId);
    if (sharedTodoIndex === -1) return;
    
    const todo = sharedTodos[sharedTodoIndex];
    const isCompleting = !todo.myCompletedAt;
    
    const formatCompletedAt = (timestamp) => {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${month}月${day}日 ${hours}:${minutes}`;
    };
    
    try {
      await collabApi.completeSharedTodo(this.data.comboId, todoId, isCompleting);
      const now = Date.now();
      const updatedSharedTodos = this.data.sharedTodos.map((item, i) => {
        if (i === sharedTodoIndex) {
          const updatedItem = { 
            ...item, 
            myCompletedAt: isCompleting ? now : null,
            formattedDate: item.formattedDate 
          };
          
          const assignments = item.assignments || [];
          const assignCount = item.assignCount || assignments.length;
          let newCompletedCount;
          
          if (item.assignType === 'any') {
            if (isCompleting) {
              updatedItem.completedAt = now;
              updatedItem.formattedCompletedAt = formatCompletedAt(now);
              newCompletedCount = 1;
              updatedItem.progressPercent = 100;
            } else {
              newCompletedCount = 0;
              updatedItem.completedAt = null;
              updatedItem.formattedCompletedAt = '';
              updatedItem.progressPercent = 0;
            }
          } else {
            newCompletedCount = isCompleting 
              ? (item.completedCount || 0) + 1 
              : Math.max(0, (item.completedCount || 0) - 1);
            updatedItem.progressPercent = assignCount > 0 ? Math.round((newCompletedCount / assignCount) * 100) : 0;
            
            if (newCompletedCount >= assignCount && assignCount > 0) {
              updatedItem.completedAt = now;
              updatedItem.formattedCompletedAt = formatCompletedAt(now);
            } else {
              updatedItem.completedAt = null;
              updatedItem.formattedCompletedAt = '';
            }
          }
          
          updatedItem.completedCount = newCompletedCount;
          updatedItem.assignCount = assignCount;
          
          return updatedItem;
        }
        return item;
      });
      this.setData({ sharedTodos: updatedSharedTodos });
      this.applyFilter();
      this.updateStats();
    } catch (err) {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
      this.loadComboData(this.data.comboId);
    }
  },

  editTodo(indexOrE) {
    if (!this.checkMembership()) return;

    const index = typeof indexOrE === 'number' ? indexOrE : parseInt(indexOrE.currentTarget.dataset.index);
    const todo = this.data.todos[index];
    if (!todo || !todo.id) return;

    const allTodos = getLocalTodos();
    const globalIndex = allTodos.findIndex(t => t.id === todo.id);
    const { comboId } = this.data;
    const tagsStr = todo.tags ? encodeURIComponent(JSON.stringify(todo.tags)) : '';

    const app = getApp();
    app.globalData.editTodoImages = todo.images || [];

    wx.navigateTo({
      url: `/packagePages/add-todo/add-todo?edit=1&index=${globalIndex}&todoId=${encodeURIComponent(todo.id)}&text=${encodeURIComponent(todo.text)}&setDate=${todo.setDate}&setTime=${todo.setTime || '12:00'}&remarks=${encodeURIComponent(todo.remarks || '')}&location=${encodeURIComponent(JSON.stringify(todo.location || false))}&time=${todo.time}&isStar=${todo.isStar || false}&priority=${todo.priority || ''}&tags=${tagsStr}&comboId=${comboId || ''}&hasImages=${(todo.images && todo.images.length > 0) ? '1' : '0'}`
    });
  },

  deleteTodo(indexOrE) {
    const index = typeof indexOrE === 'number' ? indexOrE : parseInt(indexOrE.currentTarget.dataset.index);
    const deletedTodo = this.data.todos[index];
    if (!deletedTodo || !deletedTodo.id) return;

    const todoId = deletedTodo.id;
    const that = this;

    // 分享撤回检测（同步读取）
    let shareId;
    try {
      const storedIds = wx.getStorageSync('_sharedSnapshotIds') || {};
      shareId = storedIds[todoId];
    } catch (e) {}

    const afterRevokeCheck = () => {
      const hasSubtasks = getLocalTodos().some(t => t.parent_id === todoId && !t.isDeleted);

      wx.showModal({
      title: '删除确认',
      content: hasSubtasks ? '该待办包含子待办，删除后子待办也将一同被删除，确定删除吗？' : '删除后保留 30 天，可在"更多-回收站"找回，确定删除吗？',
      confirmColor: '#ff4d4f',
      success(res) {
        if (res.confirm) {
          const now = Date.now();
          const updatedTodo = {
            ...deletedTodo,
            isDeleted: true,
            deletedAt: now,
            updatedAt: now,
            version: (deletedTodo.version || 1) + 1
          };
          
          addDeletedTodo(updatedTodo);

          // 级联删除子待办
          if (hasSubtasks) {
            that.deleteSubtasksRecursive(todoId);
          }

          const todos = that.data.todos.filter((_, i) => i !== index);
          that.setData({ todos });
          
          deleteTodoById(todoId, now);
          app.updateCalendarCache(getLocalTodos());          
          if (isLoggedIn()) {
            that.autoSyncToCloud();
          }
        }
      }
    });
    };

    if (shareId) {
      confirmRevokeIfShared(todoId, afterRevokeCheck);
    } else {
      afterRevokeCheck();
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

  navigateToDetail(e) {
    const index = e.currentTarget.dataset.index;
    const todo = this.data.todos[index];

    if (!todo || !todo.id) return;

    const { adminView, adminUserId } = this.data;
    wx.navigateTo({
      url: `/packagePages/todo-detail/todo-detail?todoId=${encodeURIComponent(todo.todo_id || todo.id)}${adminView ? `&adminView=1&userId=${adminUserId}` : ''}`
    });
  },

  navigateToSharedDetail(e) {
    const todoId = e.currentTarget.dataset.id;
    const todo = this.data.sharedTodos.find(t => t.id === todoId);
    if (!todo) return;
    const { comboId, adminView } = this.data;

    wx.navigateTo({
      url: `/packagePages/todo-detail/todo-detail?sharedTodoId=${todo.id}&comboId=${comboId}${adminView ? '&adminView=1' : ''}`
    });
  },

  copyShareCode() {
    wx.setClipboardData({
      data: this.data.shareCode,
      success: () => {
        wx.showToast({ title: '已复制邀请码', icon: 'success' });
      }
    });
  },

  showEditName() {
    const { comboId, isShared } = this.data;
    wx.navigateTo({
      url: `/packageCombo/combo-edit/combo-edit?edit=1&id=${comboId}${isShared ? '&shared=1' : ''}`
    });
  },

  toggleDescription() {
    this.setData({ showDescription: !this.data.showDescription }, () => {
      setTimeout(() => this.updateFixedHeaderHeight(), 50);
    });
  },

  navigateToCollaboration() {
    wx.navigateTo({
      url: `/packageCombo/collaboration/collaboration?id=${this.data.comboId}`
    });
  },

  addTodoToCombo() {
    const { comboId, isShared } = this.data;
    wx.navigateTo({
      url: `/packagePages/add-todo/add-todo?comboId=${comboId}&isShared=${isShared ? 1 : 0}`
    });
  },

  addTodoFromChild(text, setDate, setTime, remarks, location, tags, comboId, images, priority) {
    const now = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const newTodo = {
      id: `todo_${now}_${randomStr}`,
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
      updatedAt: now
    };
    
    const todos = [...this.data.todos, newTodo].map(todo => ({
      ...todo,
      formattedDate: formatDate(todo.setDate)
    }));
    
    this.setData({ todos });
    this.updateStats();
    
    saveTodo(newTodo);
    app.updateCalendarCache(getLocalTodos());
    
    if (isLoggedIn()) {
      this.autoSyncToCloud();
    }
  },

  handleSwipeAction(e) {
    const index = parseInt(e.currentTarget.dataset.index);
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

  handleSharedSwipeAction(e) {
    const todoId = e.currentTarget.dataset.id;
    const actionType = e.currentTarget.dataset.type;
    
    switch(actionType) {
      case 'delete':
        this.deleteSharedTodo(todoId);
        break;
      case 'edit':
        this.editSharedTodo(todoId);
        break;
    }
  },

  editSharedTodo(todoId) {
    if (!this.checkMembership()) return;
    
    const todo = this.data.sharedTodos.find(t => t.id === todoId);
    if (!todo) return;
    const { comboId } = this.data;
    
    const tagsStr = todo.tags ? encodeURIComponent(JSON.stringify(todo.tags)) : '';
    const assigneeIds = (todo.assignments || []).map(a => a.userId || a.user_id);
    const assigneeIdsStr = assigneeIds.length > 0 ? encodeURIComponent(JSON.stringify(assigneeIds)) : '';
    const excludeType = todo.excludeType || todo.exclude_type || '';
    const locationStr = todo.location ? encodeURIComponent(JSON.stringify(todo.location)) : '';
    
    const app = getApp();
    app.globalData.editTodoImages = todo.images || [];
    
    wx.navigateTo({
      url: `/packagePages/add-todo/add-todo?edit=1&sharedTodoId=${todo.id}&comboId=${comboId}&text=${encodeURIComponent(todo.text)}&setDate=${todo.setDate || todo.set_date}&setTime=${todo.setTime || todo.set_time || '12:00'}&remarks=${encodeURIComponent(todo.remarks || '')}&location=${locationStr}&tags=${tagsStr}&priority=${todo.priority || 'p2'}&assignType=${todo.assignType || 'all'}&assigneeIds=${assigneeIdsStr}&excludeType=${excludeType}&hasImages=${(todo.images && todo.images.length > 0) ? '1' : '0'}`
    });
  },

  deleteSharedTodo(todoId) {
    if (!this.checkMembership()) return;

    const that = this;
    const todo = this.data.sharedTodos.find(t => t.id === todoId);
    if (!todo) return;
    const { comboId } = this.data;
    const hasSubtasks = this.data.sharedTodos.some(t => t.parentId == todoId && !t.isDeleted);

    wx.showModal({
      title: '删除确认',
      content: hasSubtasks ? '该共享待办包含子待办，删除后子待办也将一同被删除，确定删除吗？' : '确定删除此共享待办吗？',
      confirmColor: '#ff4d4f',
      success(res) {
        if (res.confirm) {
          collabApi.deleteSharedTodo(comboId, todoId)
            .then(() => {
              const sharedTodos = that.data.sharedTodos.filter(t => t.id !== todoId);
              that.setData({ sharedTodos });
              that.applyFilter();
              wx.showToast({ title: '已删除', icon: 'success' });
            })
            .catch(err => {
              wx.showToast({ title: err.message || '删除失败', icon: 'none' });
            });
        }
      }
    });
  },

  deleteCombo() {
    const { comboId, isShared, todos, combo } = this.data;
    
    wx.showActionSheet({
      itemList: ['一并删除待办', '移出组合，保留待办'],
      itemColor: '#333',
      success: (res) => {
        const action = res.tapIndex === 0 ? 'delete_todos' : 'keep_todos';
        const confirmText = res.tapIndex === 0 ? '一并删除' : '移出组合';
        
        wx.showModal({
          title: '删除组合',
          content: res.tapIndex === 0 
            ? `确定删除组合「${combo?.name}」并删除其中的 ${todos.length} 个待办吗？`
            : `确定删除组合「${combo?.name}」？其中的 ${todos.length} 个待办将保留为普通待办。`,
          confirmText,
          confirmColor: '#ff4d4f',
          success: async (modalRes) => {
            if (modalRes.confirm) {
              try {
                const allTodos = getLocalTodos();
                const comboIdStr = String(comboId);
                
                if (action === 'keep_todos') {
                  const updatedTodos = allTodos.map(t => {
                    if (String(t.comboId) === comboIdStr) {
                      const updated = { ...t, comboId: '' };
                      saveTodo(updated);
                      return updated;
                    }
                    return t;
                  });
                  getApp().updateCalendarCache(updatedTodos);
                } else {
                  const updatedTodos = allTodos.filter(t => String(t.comboId) !== comboIdStr);
                  allTodos.filter(t => String(t.comboId) === comboIdStr).forEach(t => {
                    that.deleteSubtasksRecursive(t.id);
                    deleteTodoById(t.id, Date.now());
                  });
                  getApp().updateCalendarCache(updatedTodos);
                }
                
                await combosApi.delete(comboId, action);
                wx.showToast({ title: '已删除', icon: 'success' });
                
                const combos = app.globalData.combos || [];
                const newCombos = combos.filter(c => String(c.id) !== comboIdStr);
                app.setCombos(newCombos);
                
                setTimeout(() => wx.navigateBack(), 1500);
              } catch (err) {
                wx.showToast({ title: err.message || '操作失败', icon: 'none' });
              }
            }
          }
        });
      }
    });
  },

  async autoSyncToCloud() {
    try {
      await syncWithCloud('local');
    } catch (err) {
      logger.error('SYNC', 'AUTO', '自动同步失败', err);
    }
  },

  navigateToCollaboration() {
    const { comboId, adminView } = this.data;
    wx.navigateTo({
      url: `/packageCombo/collaboration/collaboration?id=${comboId}${adminView ? '&adminView=1' : ''}`
    });
  },

  navigateToReportBoard() {
    const { comboId } = this.data;
    wx.navigateTo({
      url: `/packageCombo/report-board/report-board?combo_id=${comboId}`
    });
  },

  navigateToStats() {
    const { comboId } = this.data;
    wx.navigateTo({
      url: `/packageCombo/combo-stats/combo-stats?id=${comboId}`
    });
  },

  updateStats() {
    const { isShared, filteredSharedTodos, todos, currentUserId } = this.data;
    const todoList = isShared ? filteredSharedTodos : todos;
    
    if (isShared && currentUserId) {
      const myTodos = todoList.filter(todo => {
        const assignments = todo.assignments || [];
        return assignments.some(a => String(a.userId) === String(currentUserId));
      });
      
      const myAssignedCount = myTodos.length;
      const myCompletedCount = myTodos.filter(todo => {
        return todo.myCompletedAt;
      }).length;
      const completionRate = myAssignedCount > 0 ? Math.round((myCompletedCount / myAssignedCount) * 100) : 0;
      
      this.setData({
        myAssignedCount,
        completedCount: myCompletedCount,
        completionRate
      });
    } else {
      const totalCount = todoList.length;
      const completedCount = todoList.filter(t => t.completed).length;
      const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
      
      this.setData({
        myAssignedCount: totalCount,
        completedCount,
        completionRate
      });
    }
  },

  async loadComboDataForAdmin(id, userId) {
    try {
      const result = await combosApi.getById(id);
      const combo = result.combo || result;
      logger.debug('ADMIN', 'DATA', 'loadComboDataForAdmin组合结果', combo);
      logger.debug('ADMIN', 'DATA', 'loadComboDataForAdmin待办', { count: combo.todos?.length });
      logger.debug('ADMIN', 'DATA', 'loadComboDataForAdmin共享待办', { count: combo.sharedTodos?.length });
      
      if (combo.isShared || combo.is_shared) {
        const sharedTodos = (combo.sharedTodos || []).map(todo => {
          let rawDate = extractDateStr(todo.setDate || todo.set_date);
          let rawTime = todo.setTime || todo.set_time || '12:00';

          if (rawTime && rawTime.includes(':')) {
            const parts = rawTime.split(':');
            rawTime = `${parts[0]}:${parts[1]}`;
          }
          
          const assignments = todo.assignments || [];
          const completedAssignments = assignments.filter(a => a.completedAt);
          const completedNames = completedAssignments.map(a => a.nickname).join('、') || '无';
          
          return {
            ...todo,
            id: todo.id,
            text: todo.text,
            remarks: todo.remarks || '',
            setDate: rawDate,
            setTime: rawTime,
            assignType: todo.assignType || todo.assign_type || 'all',
            completedAt: todo.completedAt || todo.completed_at,
            formattedDate: formatDate(rawDate),
            assigneeNames: assignments.map(a => a.nickname).join('、') || '未指定',
            completedNames: completedNames,
            assignments: assignments,
            completedCount: completedAssignments.length,
            assignCount: assignments.length,
            progressPercent: assignments.length > 0 ? Math.round((completedAssignments.length / assignments.length) * 100) : 0
          };
        });
        
        this.setData({
          combo,
          comboId: id,
          isShared: true,
          shareCode: combo.shareCode || '',
          userRole: 'admin',
          members: combo.members || [],
          sharedTodos,
          filteredSharedTodos: sharedTodos
        });

        this.loadFilterPreference();
        if (!this.data.filterModeText) {
          this.setData({ filterModeText: '全部' });
        }
        this.applyFilter();
      } else {
        const userResult = await adminApi.getUserDetail(userId);
        const userTodos = userResult.todos || [];
        logger.debug('ADMIN', 'DATA', '管理视图-用户待办数', { count: userTodos.length });
        logger.debug('ADMIN', 'DATA', '管理视图-组合ID', { id, type: typeof id });

        if (userTodos.length > 0) {
          logger.debug('ADMIN', 'DATA', '管理视图-首个待办字段', { keys: Object.keys(userTodos[0]) });
          logger.debug('ADMIN', 'DATA', '管理视图-首个待办内容', userTodos[0]);
        }
        
        const comboTodos = userTodos.filter(todo => {
          const todoComboId = todo.combo_id ?? todo.comboId;
          if (todoComboId === null || todoComboId === undefined || todoComboId === '') {
            return false;
          }
          const match = String(todoComboId) === String(id);
          return match;
        }).map(todo => {
          let rawDate = extractDateStr(todo.set_date || todo.setDate);
          return {
            ...todo,
            id: todo.id,
            text: todo.text,
            completed: todo.completed || todo.completed_at,
            setDate: rawDate,
            formattedDate: formatDate(rawDate)
          };
        });
        
        logger.debug('ADMIN', 'DATA', '管理视图-组合待办数', { count: comboTodos.length });

        this.setData({
          combo,
          comboId: id,
          isShared: false,
          userRole: 'admin',
          todos: comboTodos
        });
      }
    } catch (err) {
      logger.error('COMBO', 'LOAD', '加载组合失败', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  initRecord() {
    const that = this;
    
    manager.onRecognize = function (res) {
      const text = res.result;
      that.setData({
        content: text,
        voiceText: text
      });
    };

    manager.onStart = function (res) {
    };

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
            that.getRecordAuth();
          }
        }
      });
    };

    manager.onStop = function (res) {
      if (that._voiceDone) return;

      var text = res.result;

      if (text && text.length > 0) {
        const lastChar = text[text.length - 1];
        if (['。', '.', '，', ','].includes(lastChar)) {
          text = text.slice(0, -1);
        }
      }

      that.setData({ content: text });

      if (!that.data.isRecording) {
        wx.hideLoading();
        if (text) {
          const { comboId, isShared } = that.data;
          wx.showToast({ title: '识别完成', icon: 'none' });
        }
      }
    };
  },

  startRecording() {
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

    manager.start({ lang: 'zh_CN' });
  },

  touchStart(e) {
    if (this.data.isRecording) return;

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
                  if (res.confirm) {
                    wx.openSetting();
                  }
                }
              });
            }
          });
        } else {
          this.startRecording();
        }
      },
      fail: () => {
      }
    });
  },

  touchEnd(e) {
    if (!this.data.isRecording) return;

    this._voiceDone = true;
    manager.stop();

    this.setData({ overlayPhase: '' });

    this._collapseTimer = setTimeout(() => {
      this._collapseTimer = null;
      const text = this.data.voiceText;

      this.setData({
        isRecording: false,
        recordState: false,
        voiceWaveBars: []
      });

      if (text) {
        const { comboId, isShared } = this.data;
        wx.navigateTo({
          url: `/packagePages/add-todo/add-todo?voiceText=${encodeURIComponent(text)}&comboId=${comboId}&isShared=${isShared ? 1 : 0}`
        });
      }
    }, 280);
  },

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

  onUnload() {
    if (this._collapseTimer) {
      clearTimeout(this._collapseTimer);
      this._collapseTimer = null;
    }
    // 清除持久化的 adminView 参数
    if (this.data.comboId) {
      wx.removeStorageSync('_adminView_combo_' + this.data.comboId);
    }
  },

  preventTouchMove() {},

  onPageScroll(e) {
    const show = e.scrollTop > 300;
    if (this.data.showBackTop !== show) {
      this.setData({ showBackTop: show });
    }
  },

  onToTop() {
    wx.pageScrollTo({
      scrollTop: 0,
      duration: 300
    });
  }
});
