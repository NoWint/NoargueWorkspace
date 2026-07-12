const { adminApi } = require('../../utils/api');

const app = getApp();

const API_BASE_URL = 'https://api.yzjtiantian.cn';

function getFullAvatarUrl(avatarUrl) {
  if (!avatarUrl) return '/images/avatar.png';
  if (avatarUrl.startsWith('http')) return avatarUrl;
  return API_BASE_URL + avatarUrl;
}

const STAT_TYPE_MAP = {
  todayNewUsers: 'user',
  todayNewTodos: 'todo',
  todaySyncCount: 'sync',
  activeUsers7Days: 'user',
  activeUsers30Days: 'user',
  userCount: 'user',
  todoCount: 'todo',
  comboCount: 'combo',
  sharedComboCount: 'combo',
  completedTodoCount: 'todo',
  starredTodoCount: 'todo',
  deletedTodoCount: 'todo',
  todoWithLocation: 'todo',
  todoWithImages: 'todo',
  memberCount: 'member',
  sharedTodoCount: 'sharedTodo',
  assignmentCount: 'assignment',
  pendingRequests: 'request',
  tagCount: 'tag',
  notificationCount: 'notification',
  pendingNotificationCount: 'notification',
  syncLogCount: 'sync',
  commentCount: 'comment',
  mainCommentCount: 'comment',
  replyCount: 'comment',
  todayNewComments: 'comment',
  todayNewMainComments: 'comment',
  todayNewReplies: 'comment',
  nextDayRetention: 'retention',
  sevenDayRetention: 'retention',
  thirtyDayRetention: 'retention',
  tagUsageTop10: 'tagUsage',
  notificationSuccessRate: 'notificationRate',
  userTodoDistribution: 'distribution',
  todoHourlyDistribution: 'hourly',
  sharedTodoCompletionRate: 'sharedCompletion',
  memberRoleDistribution: 'memberRole',
  assignTypeDistribution: 'assignType',
  requestApprovalRate: 'approvalRate',
  syncActionDistribution: 'syncAction',
  tagCompletionRate: 'tagCompletion',
  notificationEffectData: 'notificationEffect'
};

const POPUP_DESC_MAP = {
  todayNewUsers: '今日新注册的用户列表，包含用户昵称、ID、注册时间等信息',
  todayNewTodos: '今日创建的待办事项列表，显示待办内容、所属用户、完成状态等',
  todaySyncCount: '今日的数据同步记录，包含同步用户、操作类型、同步数量等',
  activeUsers7Days: '最近7天内有同步行为的活跃用户，显示最后同步时间',
  activeUsers30Days: '最近30天内有同步行为的活跃用户，显示最后同步时间',
  userCount: '平台所有注册用户列表，可查看用户基本信息',
  todoCount: '所有未删除的待办事项列表，包含完成状态、所属用户等',
  comboCount: '所有组合列表，包含私有组合和共享组合',
  sharedComboCount: '已开启共享的组合列表，可被多人协作管理',
  completedTodoCount: '已标记为完成的待办事项列表',
  starredTodoCount: '用户标记为收藏/重要的待办事项',
  deletedTodoCount: '已删除但未永久清除的待办（回收站数据）',
  todoWithLocation: '设置了位置信息的待办事项，支持导航功能',
  todoWithImages: '包含图片附件的待办事项',
  memberCount: '共享组合的成员列表，显示成员角色和所属组合',
  sharedTodoCount: '共享待办列表，可被组合成员共同管理',
  assignmentCount: '共享待办的分配记录，显示待办分配给哪些成员',
  pendingRequests: '待审批的协作申请列表',
  tagCount: '所有标签列表，包含系统预设和用户自定义标签',
  notificationCount: '所有待办通知记录',
  pendingNotificationCount: '已设置但尚未发送的待办通知',
  syncLogCount: '数据同步日志，记录用户的所有同步操作',
  commentCount: '共享待办的所有评论记录',
  mainCommentCount: '评论（非回复），用户对共享待办的直接评论',
  replyCount: '回复，用户对其他评论的回复',
  todayNewComments: '今日新增的所有评论和回复',
  todayNewMainComments: '今日新增的主评论（非回复）',
  todayNewReplies: '今日新增的回复',
  nextDayRetention: '新用户次日留存率，反映用户初次体验后的回访情况',
  sevenDayRetention: '新用户7日留存率，反映中期用户粘性',
  thirtyDayRetention: '新用户30日留存率，反映长期用户忠诚度',
  tagUsageTop10: '标签使用频率排行，展示最受欢迎的标签',
  notificationSuccessRate: '通知发送成功率，反映通知服务的稳定性',
  userTodoDistribution: '用户待办数量分布，分析用户活跃程度分层',
  todoHourlyDistribution: '待办创建时段分布，分析用户使用习惯（最近7天）',
  sharedTodoCompletionRate: '共享待办完成率，反映协作效率',
  memberRoleDistribution: '组合成员角色分布，统计owner/admin/member比例',
  assignTypeDistribution: '共享待办分配类型分布（全员/任意/指定成员）',
  requestApprovalRate: '协作申请审批通过率',
  syncActionDistribution: '同步操作类型分布（上传/下载/合并/全量同步）',
  tagCompletionRate: '各标签对应待办的完成率对比，分析不同类型待办的执行效率',
  notificationEffectData: '通知效果分析，对比设置通知与未设置通知的待办完成率'
};

Page({
  data: {
    stats: {
      userCount: 0,
      todoCount: 0,
      comboCount: 0,
      sharedComboCount: 0,
      tagCount: 0,
      sharedTodoCount: 0,
      notificationCount: 0,
      syncLogCount: 0,
      todayNewUsers: 0,
      todayNewTodos: 0,
      todaySyncCount: 0,
      activeUsers7Days: 0,
      completedTodoCount: 0,
      completionRate: 0,
      starredTodoCount: 0,
      deletedTodoCount: 0,
      todoWithLocation: 0,
      todoWithImages: 0,
      avgTodosPerUser: 0,
      activeUsers30Days: 0,
      memberCount: 0,
      assignmentCount: 0,
      pendingRequests: 0,
      pendingNotificationCount: 0,
      syncSuccessRate: 0,
      nextDayRetention: 0,
      sevenDayRetention: 0,
      thirtyDayRetention: 0,
      tagUsageTop10: [],
      notificationSuccessRate: 0,
      userTodoDistribution: [],
      todoHourlyDistribution: [],
      peakHours: [],
      sharedTodoCompletionRate: 0,
      memberRoleDistribution: [],
      assignTypeDistribution: [],
      requestApprovalRate: 0,
      syncActionDistribution: [],
      tagCompletionRate: [],
      notificationEffectData: null
    },
    popupVisible: false,
    popupLoading: false,
    popupData: {
      key: '',
      label: '',
      value: 0,
      hasDetail: true,
      type: '',
      list: []
    },
    analysisLoading: false,
    analysisData: null
  },

  onLoad() {
    this.loadStats();
  },

  onShow() {
    this.loadStats();
  },

  async onPullDownRefresh() {
    await this.loadStats();
    wx.stopPullDownRefresh();
  },

  async loadStats() {
    try {
      const result = await adminApi.getStats();
      if (result.success) {
        this.setData({ stats: result.stats });
        this.loadAnalysisStats();
      }
    } catch (err) {
      logger.error('ADMIN', 'STATS', '加载统计数据失败', err);
      wx.showToast({ title: '加载统计数据失败', icon: 'none' });
    }
  },

  async loadAnalysisStats() {
    try {
      const [
        retention,
        tagUsage,
        notificationRate,
        userTodoDist,
        todoHourly,
        sharedCompletion,
        memberRoles,
        assignTypes,
        requestRate,
        syncActions,
        tagCompletion,
        notificationEffect
      ] = await Promise.all([
        adminApi.getRetentionStats(),
        adminApi.getTagUsageStats(),
        adminApi.getNotificationRateStats(),
        adminApi.getUserTodoDistribution(),
        adminApi.getTodoHourlyStats(),
        adminApi.getSharedTodoCompletion(),
        adminApi.getMemberRoleStats(),
        adminApi.getAssignTypeStats(),
        adminApi.getRequestApprovalRate(),
        adminApi.getSyncActionStats(),
        adminApi.getTagCompletionAnalysis(),
        adminApi.getNotificationEffectAnalysis()
      ]);

      const updates = {};
      
      if (retention.success) {
        updates['stats.nextDayRetention'] = retention.data.nextDayRetention;
        updates['stats.sevenDayRetention'] = retention.data.sevenDayRetention;
        updates['stats.thirtyDayRetention'] = retention.data.thirtyDayRetention;
      }
      
      if (tagUsage.success) {
        updates['stats.tagUsageTop10'] = tagUsage.data.topTags.slice(0, 10);
      }
      
      if (notificationRate.success) {
        updates['stats.notificationSuccessRate'] = notificationRate.data.successRate;
      }
      
      if (userTodoDist.success) {
        updates['stats.userTodoDistribution'] = userTodoDist.data.distribution;
      }
      
      if (todoHourly.success) {
        updates['stats.todoHourlyDistribution'] = todoHourly.data.hourlyDistribution;
        updates['stats.peakHours'] = todoHourly.data.peakHours;
      }
      
      if (sharedCompletion.success) {
        updates['stats.sharedTodoCompletionRate'] = sharedCompletion.data.completionRate;
      }
      
      if (memberRoles.success) {
        updates['stats.memberRoleDistribution'] = memberRoles.data.roleDistribution;
      }
      
      if (assignTypes.success) {
        updates['stats.assignTypeDistribution'] = assignTypes.data.distribution;
      }
      
      if (requestRate.success) {
        updates['stats.requestApprovalRate'] = requestRate.data.approvalRate;
      }
      
      if (syncActions.success) {
        updates['stats.syncActionDistribution'] = syncActions.data.distribution;
      }
      
      if (tagCompletion.success) {
        updates['stats.tagCompletionRate'] = tagCompletion.data.tagCompletion;
      }
      
      if (notificationEffect.success) {
        updates['stats.notificationEffectData'] = notificationEffect.data;
      }
      
      this.setData(updates);
    } catch (err) {
      logger.error('ADMIN', 'STATS', '加载分析数据失败', err);
      wx.showToast({ title: '加载统计数据失败', icon: 'none' });
    }
  },

  async showStatDetail(e) {
    const { key, label, hasDetail } = e.currentTarget.dataset;
    const value = this.data.stats[key];
    const desc = POPUP_DESC_MAP[key] || '';
    
    if (hasDetail === 'false' || hasDetail === false) {
      this.setData({
        popupVisible: true,
        popupData: {
          key,
          label,
          value: value !== undefined ? value : 0,
          hasDetail: false,
          type: '',
          list: [],
          desc
        }
      });
      return;
    }
    
    const localDataKeys = {
      tagUsageTop10: 'tagUsageTop10',
      userTodoDistribution: 'userTodoDistribution',
      todoHourlyDistribution: 'todoHourlyDistribution',
      tagCompletionRate: 'tagCompletionRate',
      memberRoleDistribution: 'memberRoleDistribution',
      assignTypeDistribution: 'assignTypeDistribution',
      syncActionDistribution: 'syncActionDistribution',
      notificationEffectData: 'notificationEffectData'
    };
    
    if (localDataKeys[key]) {
      const localData = this.data.stats[localDataKeys[key]] || [];
      this.setData({
        popupVisible: true,
        popupLoading: false,
        popupData: {
          key,
          label,
          value: localData.length,
          hasDetail: true,
          type: STAT_TYPE_MAP[key] || 'generic',
          list: localData,
          desc
        }
      });
      return;
    }
    
    this.setData({
      popupVisible: true,
      popupLoading: true,
      popupData: {
        key,
        label,
        value: value !== undefined ? value : 0,
        hasDetail: true,
        type: STAT_TYPE_MAP[key] || 'generic',
        list: [],
        desc
      }
    });
    
    try {
      const result = await adminApi.getStatDetail(key);
      if (result.success) {
        const list = (result.data || []).map(item => {
          if (item.avatar_url) {
            item.avatar_url = getFullAvatarUrl(item.avatar_url);
          }
          return item;
        });
        this.setData({
          popupLoading: false,
          'popupData.list': list
        });
      }
    } catch (err) {
      logger.error('ADMIN', 'STATS', '加载详情失败', err);
      this.setData({
        popupLoading: false,
        'popupData.list': []
      });
    }
  },

  closePopup() {
    this.setData({ popupVisible: false });
  },

  onPopupVisibleChange(e) {
    this.setData({ popupVisible: e.detail.visible });
  },

  navigateToUserDetail(e) {
    const userId = e.currentTarget.dataset.id;
    if (userId) {
      this.setData({ popupVisible: false });
      wx.navigateTo({
        url: `/packageAdmin/user-detail/user-detail?id=${userId}`
      });
    }
  },

  navigateToTodoDetail(e) {
    const item = e.currentTarget.dataset.item;
    if (!item) return;

    this.setData({ popupVisible: false });
    wx.navigateTo({
      url: `/packagePages/todo-detail/todo-detail?adminView=1&todoId=${encodeURIComponent(item.todo_id || item.id)}&userId=${item.user_id}`
    });
  },

  navigateToComboDetail(e) {
    const item = e.currentTarget.dataset.item;
    if (item && item.id) {
      this.setData({ popupVisible: false });
      wx.navigateTo({
        url: `/packageCombo/combo-detail/combo-detail?adminView=1&id=${item.id}`
      });
    }
  },

  navigateToSharedTodoDetail(e) {
    const item = e.currentTarget.dataset.item;
    if (!item) return;
    
    const todoId = item.todo_id || item.id;
    const comboId = item.combo_id || item.comboId;
    
    if (todoId && comboId) {
      this.setData({ popupVisible: false });
      wx.navigateTo({
        url: `/packagePages/todo-detail/todo-detail?sharedTodoId=${todoId}&comboId=${comboId}&adminView=1`
      });
    }
  },

  deleteComment(e) {
    const { id, content } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '删除确认',
      content: `确定要删除这条评论吗？\n\n"${content.length > 50 ? content.substring(0, 50) + '...' : content}"`,
      confirmText: '删除',
      confirmColor: '#ff4d4f',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '删除中...' });
            const result = await adminApi.deleteComment(id);
            wx.hideLoading();
            
            if (result.success) {
              const list = this.data.popupData.list.filter(item => item.id !== id);
              this.setData({
                'popupData.list': list,
                'popupData.value': this.data.popupData.value - 1
              });
              
              const stats = this.data.stats;
              if (this.data.popupData.key.startsWith('today')) {
                stats.todayNewComments = Math.max(0, (stats.todayNewComments || 0) - 1);
              }
              stats.commentCount = Math.max(0, (stats.commentCount || 0) - 1);
              this.setData({ stats });
              
              wx.showToast({ title: '删除成功', icon: 'success' });
            }
          } catch (err) {
            wx.hideLoading();
            wx.showToast({ title: err.message || '删除失败', icon: 'none' });
          }
        }
      }
    });
  }
});
