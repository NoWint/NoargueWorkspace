const API_BASE_URL = 'https://api.yzjtiantian.cn';

let token = '';
let _loginRedirecting = false;

function setToken(newToken) {
  token = newToken;
  _loginRedirecting = false;
  wx.setStorageSync('authToken', newToken);
}

function getToken() {
  if (!token) {
    token = wx.getStorageSync('authToken') || '';
  }
  return token;
}

function clearToken() {
  token = '';
  wx.removeStorageSync('authToken');
}

function isLoggedIn() {
  return !!getToken();
}

function requireLogin(callback) {
  if (isLoggedIn()) {
    return callback();
  }

  if (_loginRedirecting) return null;
  _loginRedirecting = true;

  wx.showModal({
    title: '需要登录',
    content: '该功能需要登录后才能使用，是否前往登录？',
    confirmText: '去登录',
    cancelText: '取消',
    success: (res) => {
      if (res.confirm) {
        wx.navigateTo({ url: '/packagePages/login/login' });
      }
      _loginRedirecting = false;
    },
    fail: () => { _loginRedirecting = false; }
  });
  return null;
}

function request(options) {
  const { url, method = 'GET', data = {}, header = {} } = options;
  
  const requestHeader = {
    'Content-Type': 'application/json',
    ...header
  };
  
  const currentToken = getToken();
  if (currentToken) {
    requestHeader['Authorization'] = `Bearer ${currentToken}`;
  }
  
  return new Promise((resolve, reject) => {
    wx.request({
      url: API_BASE_URL + url,
      method,
      data,
      header: requestHeader,
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data);
        } else if (res.statusCode === 401) {
          clearToken();
          if (!_loginRedirecting) {
            _loginRedirecting = true;
            wx.navigateTo({ url: '/packagePages/login/login' });
          }
          reject(new Error('登录已过期，请重新登录'));
        } else if (res.statusCode === 403) {
          reject(new Error(res.data?.message || '无管理员权限'));
        } else {
          logger.error('NETWORK', 'REQUEST', 'API请求失败', { url: url, status: res.statusCode, data: res.data });
          reject(new Error(res.data?.message || `请求失败(${res.statusCode})`));
        }
      },
      fail: (err) => {
        reject(new Error(err.errMsg || '网络请求失败'));
      }
    });
  });
}

const authApi = {
  login: (code) => request({
    url: '/auth/login',
    method: 'POST',
    data: { code }
  }),
  
  getUserInfo: () => request({
    url: '/auth/userInfo',
    method: 'GET'
  }),
  
  updateUserInfo: (userInfo) => request({
    url: '/auth/updateUserInfo',
    method: 'POST',
    data: userInfo
  }),
  
  increaseTodoLimit: (amount = 10) => request({
    url: '/auth/increaseTodoLimit',
    method: 'POST',
    data: { amount }
  }),
  
  uploadAvatar: (filePath) => {
    return new Promise((resolve, reject) => {
      const currentToken = getToken();
      if (!currentToken) {
        reject(new Error('未登录'));
        return;
      }

      wx.uploadFile({
        url: API_BASE_URL + '/upload/avatar',
        filePath: filePath,
        name: 'avatar',
        header: {
          'Authorization': `Bearer ${currentToken}`
        },
        success: (res) => {
          if (res.statusCode === 200) {
            const data = JSON.parse(res.data);
            resolve(data);
          } else {
            reject(new Error('上传失败'));
          }
        },
        fail: (err) => {
          reject(new Error(err.errMsg || '上传失败'));
        }
      });
    })
  },

  markQrCodeScanned: (sceneId) => request({
    url: '/auth/qrcode/scanned',
    method: 'POST',
    data: { sceneId }
  }),

  confirmQrCodeLogin: (sceneId) => request({
    url: '/auth/qrcode/confirm',
    method: 'POST',
    data: { sceneId }
  })
};

const todosApi = {
  getList: (params = {}) => request({
    url: '/todos/list',
    method: 'GET',
    data: params
  }),
  
  getById: (id) => request({
    url: `/todos/${id}`,
    method: 'GET'
  }),
  
  create: (todo) => request({
    url: '/todos/create',
    method: 'POST',
    data: todo
  }),
  
  update: (id, todo) => request({
    url: `/todos/${id}`,
    method: 'PUT',
    data: todo
  }),
  
  delete: (id) => request({
    url: `/todos/${id}`,
    method: 'DELETE'
  }),
  
  batchMove: (todoIds, comboId) => request({
    url: '/todos/batch-move',
    method: 'POST',
    data: { todoIds, comboId }
  }),

  getTodosBatch: (ids, detail = false) => request({
    url: '/todos/batch',
    method: 'POST',
    data: { ids, detail }
  }),
  
  sync: ({ localChanges, localDeletedIds, lastSyncAt }) => request({
    url: '/todos/sync',
    method: 'POST',
    data: { localChanges, localDeletedIds, lastSyncAt }
  }),
  
  fullSync: (lastSyncAt) => request({
    url: '/todos/full-sync',
    method: 'GET',
    data: { lastSyncAt }
  }),
  
  getDeleted: () => request({
    url: '/todos/deleted',
    method: 'GET'
  }),
  
  restore: (todoId) => request({
    url: `/todos/restore/${todoId}`,
    method: 'POST'
  }),
  
  permanentDelete: (todoId) => request({
    url: `/todos/permanent/${todoId}`,
    method: 'DELETE'
  })
};

const tagsApi = {
  getList: () => request({
    url: '/tags/list',
    method: 'GET'
  }),
  
  create: (tag) => request({
    url: '/tags/create',
    method: 'POST',
    data: tag
  }),
  
  update: (id, tag) => request({
    url: `/tags/${id}`,
    method: 'PUT',
    data: tag
  }),
  
  delete: (id) => request({
    url: `/tags/${id}`,
    method: 'DELETE'
  })
};

const combosApi = {
  getList: () => request({
    url: '/combos/list',
    method: 'GET'
  }),
  
  getById: (id) => request({
    url: `/combos/${id}`,
    method: 'GET'
  }),
  
  create: (combo) => request({
    url: '/combos/create',
    method: 'POST',
    data: combo
  }),
  
  update: (id, combo) => request({
    url: `/combos/${id}`,
    method: 'PUT',
    data: combo
  }),
  
  delete: (id, action) => request({
    url: `/combos/${id}${action ? `?action=${action}` : ''}`,
    method: 'DELETE'
  }),
  
  getMembers: (id) => request({
    url: `/combos/${id}/members`,
    method: 'GET'
  }),
  
  setMemberRole: (comboId, userId, role) => request({
    url: `/combos/${comboId}/members/${userId}/role`,
    method: 'PUT',
    data: { role }
  })
};

const collabApi = {
  join: (shareCode) => request({
    url: '/collab/join',
    method: 'POST',
    data: { shareCode }
  }),
  
  autoJoin: (shareCode) => request({
    url: '/collab/auto-join',
    method: 'POST',
    data: { shareCode }
  }),
  
  sendRequest: (shareCode, message) => request({
    url: '/collab/request',
    method: 'POST',
    data: { shareCode, message }
  }),
  
  getRequests: (comboId) => request({
    url: '/collab/requests',
    method: 'GET',
    data: { comboId }
  }),
  
  approveRequest: (requestId) => request({
    url: `/collab/requests/${requestId}/approve`,
    method: 'POST'
  }),
  
  rejectRequest: (requestId) => request({
    url: `/collab/requests/${requestId}/reject`,
    method: 'POST'
  }),
  
  getSharedList: () => request({
    url: '/collab/shared',
    method: 'GET'
  }),
  
  createSharedTodo: (comboId, todo) => request({
    url: `/collab/shared/${comboId}/todos`,
    method: 'POST',
    data: todo
  }),
  
  completeSharedTodo: (comboId, todoId, completed = true) => request({
    url: `/collab/shared/${comboId}/todos/${todoId}/complete`,
    method: 'PUT',
    data: { completed }
  }),
  
  updateSharedTodo: (comboId, todoId, data) => request({
    url: `/collab/shared/${comboId}/todos/${todoId}`,
    method: 'PUT',
    data
  }),
  
  deleteSharedTodo: (comboId, todoId) => request({
    url: `/collab/shared/${comboId}/todos/${todoId}`,
    method: 'DELETE'
  }),
  
  removeMember: (comboId, userId) => request({
    url: `/collab/member`,
    method: 'DELETE',
    data: { comboId, userId }
  }),
  
  leaveCombo: (comboId, transferToUserId) => request({
    url: '/collab/leave',
    method: 'POST',
    data: { comboId, transferToUserId }
  }),
  
  getQrCode: (shareCode, auto = false) => {
    const currentToken = getToken();
    return `${API_BASE_URL}/collab/qrcode?shareCode=${shareCode}&auto=${auto ? 1 : 0}&token=${currentToken}`;
  }
};

const notifyApi = {
  subscribe: (templateIds) => request({
    url: '/notify/subscribe',
    method: 'POST',
    data: { templateIds }
  }),
  
  schedule: (todoId, notifyTime) => request({
    url: '/notify/schedule',
    method: 'POST',
    data: { todoId, notifyTime }
  }),
  
  getByTodoId: (todoId) => request({
    url: '/notify/by-todo',
    method: 'GET',
    data: { todoId }
  }),
  
  update: (id, notifyTime) => request({
    url: `/notify/${id}`,
    method: 'PUT',
    data: { notifyTime }
  }),
  
  cancel: (id) => request({
    url: `/notify/${id}`,
    method: 'DELETE'
  }),
  
  getList: () => request({
    url: '/notify/list',
    method: 'GET'
  }),
  
  testSend: (notificationId) => request({
    url: '/notify/test-send',
    method: 'POST',
    data: { notificationId }
  }),
  
  scheduleShared: (sharedTodoId, notifyTime) => request({
    url: '/notify/shared/schedule',
    method: 'POST',
    data: { sharedTodoId, notifyTime }
  }),
  
  getSharedByTodoId: (sharedTodoId) => request({
    url: '/notify/shared/by-todo',
    method: 'GET',
    data: { sharedTodoId }
  }),
  
  updateShared: (id, notifyTime) => request({
    url: `/notify/shared/${id}`,
    method: 'PUT',
    data: { notifyTime }
  }),
  
  cancelShared: (id) => request({
    url: `/notify/shared/${id}`,
    method: 'DELETE'
  }),
  
  sendApprovalResult: (data) => request({
    url: '/notify/approval-result',
    method: 'POST',
    data
  })
};

const configApi = {
  getChangelog: () => request({
    url: '/config/updates',
    method: 'GET'
  }),
  
  getNotices: () => request({
    url: '/config/notices',
    method: 'GET'
  }),
  
  getAppConfig: () => request({
    url: '/config/app',
    method: 'GET'
  }),
  
  getGuides: () => request({
    url: '/config/guides',
    method: 'GET'
  }),
  
  getGuideById: (id) => request({
    url: `/config/guides/${id}`,
    method: 'GET'
  })
};

const adminApi = {
  getStats: () => request({
    url: '/admin/stats',
    method: 'GET'
  }),
  
  getStatDetail: (type) => request({
    url: `/admin/stats/${type}`,
    method: 'GET'
  }),
  
  getUsers: (params = {}) => request({
    url: '/admin/users',
    method: 'GET',
    data: params
  }),
  
  getUserDetail: (userId) => request({
    url: `/admin/users/${userId}`,
    method: 'GET'
  }),
  
  updateUserLimits: (userId, limits) => request({
    url: `/admin/users/${userId}/limits`,
    method: 'PUT',
    data: limits
  }),
  
  updateUserNickname: (userId, nickname) => request({
    url: `/admin/users/${userId}/nickname`,
    method: 'PUT',
    data: { nickname }
  }),

  updateUserBadges: (userId, data) => request({
    url: `/admin/users/${userId}/badges`,
    method: 'PUT',
    data
  }),

  getNotices: () => request({
    url: '/admin/notices',

    method: 'GET'
  }),
  
  createNotice: (data) => request({
    url: '/admin/notices',
    method: 'POST',
    data
  }),
  
  updateNotice: (index, data) => request({
    url: `/admin/notices/${index}`,
    method: 'PUT',
    data
  }),
  
  deleteNotice: (index) => request({
    url: `/admin/notices/${index}`,
    method: 'DELETE'
  }),
  
  getChangelog: () => request({
    url: '/admin/updates',
    method: 'GET'
  }),
  
  createChangelog: (data) => request({
    url: '/admin/updates',
    method: 'POST',
    data
  }),
  
  updateChangelog: (index, data) => request({
    url: `/admin/updates/${index}`,
    method: 'PUT',
    data
  }),
  
  deleteChangelog: (index) => request({
    url: `/admin/updates/${index}`,
    method: 'DELETE'
  }),
  
  getComments: (params = {}) => request({
    url: '/admin/comments',
    method: 'GET',
    data: params
  }),
  
  deleteComment: (id) => request({
    url: `/admin/comments/${id}`,
    method: 'DELETE'
  }),
  
  getRetentionStats: () => request({
    url: '/admin/stats/retention',
    method: 'GET'
  }),
  
  getTagUsageStats: () => request({
    url: '/admin/stats/tag-usage',
    method: 'GET'
  }),
  
  getNotificationRateStats: () => request({
    url: '/admin/stats/notification-rate',
    method: 'GET'
  }),
  
  getUserTodoDistribution: () => request({
    url: '/admin/stats/user-todo-distribution',
    method: 'GET'
  }),
  
  getTodoHourlyStats: () => request({
    url: '/admin/stats/todo-hourly',
    method: 'GET'
  }),
  
  getSharedTodoCompletion: () => request({
    url: '/admin/stats/shared-todo-completion',
    method: 'GET'
  }),
  
  getMemberRoleStats: () => request({
    url: '/admin/stats/member-roles',
    method: 'GET'
  }),
  
  getAssignTypeStats: () => request({
    url: '/admin/stats/assign-types',
    method: 'GET'
  }),
  
  getRequestApprovalRate: () => request({
    url: '/admin/stats/request-rate',
    method: 'GET'
  }),
  
  getSyncActionStats: () => request({
    url: '/admin/stats/sync-actions',
    method: 'GET'
  }),
  
  getTagCompletionAnalysis: () => request({
    url: '/admin/stats/cross/tag-completion',
    method: 'GET'
  }),
  
  getNotificationEffectAnalysis: () => request({
    url: '/admin/stats/cross/notification-effect',
    method: 'GET'
  }),

  getTodoDetail: (todoId, userId) => request({
    url: `/admin/todo/${todoId}`,
    method: 'GET',
    data: { userId }
  })
};

const commentsApi = {
  getList: (sharedTodoId, page = 1, size = 20) => request({
    url: `/comments/${sharedTodoId}`,
    method: 'GET',
    data: { page, size }
  }),
  
  create: (sharedTodoId, content, parentId = null, replyToUserId = null) => request({
    url: `/comments/${sharedTodoId}`,
    method: 'POST',
    data: { content, parentId, replyToUserId }
  }),
  
  delete: (commentId) => request({
    url: `/comments/${commentId}`,
    method: 'DELETE'
  })
};

const shareApi = {
  createSnapshot: (todo, subtasks, options = {}) => request({
    url: '/share/snapshot',
    method: 'POST',
    data: { todo, subtasks, options }
  }),

  getSnapshot: (shareId) => request({
    url: `/share/snapshot/${shareId}`,
    method: 'GET'
  }),

  revokeSnapshot: (shareId) => request({
    url: `/share/snapshot/revoke/${shareId}`,
    method: 'POST'
  }),

  verifySharePassword: (shareId, password) => request({
    url: `/share/snapshot/verify-password/${shareId}`,
    method: 'POST',
    data: { password }
  }),

  recordShareAdd: (shareId) => request({
    url: `/share/snapshot/record-add/${shareId}`,
    method: 'POST'
  }),

  getShareVisitors: (shareId) => request({
    url: `/share/snapshot/visitors/${shareId}`,
    method: 'GET'
  }),

  listByTodo: (todoId) => request({
    url: `/share/snapshot/list-by-todo/${todoId}`,
    method: 'GET'
  }),

  batchMetadata: (shareIds) => request({
    url: '/share/snapshot/batch-metadata',
    method: 'POST',
    data: { shareIds }
  }),
};

// 分享撤回检测：删除前调用，如待办有活跃分享则询问用户
function confirmRevokeIfShared(todoId, onProceed) {
  let shareIds;
  try {
    const storedIds = wx.getStorageSync('_sharedSnapshotIds') || {};
    shareIds = storedIds[todoId];
  } catch (e) {}

  if (!shareIds || !Array.isArray(shareIds) || shareIds.length === 0) {
    onProceed && onProceed();
    return;
  }

  wx.showModal({
    title: '待办已分享',
    content: '该待办已分享给他人，是否撤回分享？',
    cancelText: '取消',
    confirmText: '撤回并删除',
    confirmColor: '#ff4d4f',
    success(res) {
      if (res.confirm) {
        // 清理本地分享记录，不阻塞删除流程
        const cleanLocal = () => {
          try {
            const stored = wx.getStorageSync('_sharedSnapshotIds') || {};
            delete stored[todoId];
            wx.setStorageSync('_sharedSnapshotIds', stored);
          } catch (e) {}
        };
        cleanLocal();
        // 从后端获取所有活跃快照，逐个撤回
        shareApi.listByTodo(todoId).then(res => {
          if (res.success && res.data && res.data.length > 0) {
            const promises = res.data.map(s => shareApi.revokeSnapshot(s.share_id).catch(() => {}));
            Promise.all(promises).finally(() => {
              onProceed && onProceed();
            });
          } else {
            onProceed && onProceed();
          }
        }).catch(() => {
          onProceed && onProceed();
        });
      } else if (res.cancel) {
        wx.showModal({
          title: '确认',
          content: '仅删除待办，不撤回分享？',
          cancelText: '取消删除',
          confirmText: '仅删除',
          confirmColor: '#ff4d4f',
          success(res2) {
            if (res2.confirm) {
              // 仅删除，清理本地分享记录
              try {
                const stored = wx.getStorageSync('_sharedSnapshotIds') || {};
                delete stored[todoId];
                wx.setStorageSync('_sharedSnapshotIds', stored);
              } catch (e) {}
              onProceed && onProceed();
            }
          }
        });
      }
    },
    fail() {
      // modal 展示失败，不阻塞删除
      onProceed && onProceed();
    }
  });
}

const userApi = {
  getProfile: (userId) => request({
    url: `/users/${userId}/profile`,
    method: 'GET'
  })
};

const communityApi = {
  // Posts
  createPost: (data) => request({ url: '/posts/create', method: 'POST', data }),
  getPostList: (params) => request({ url: '/posts/list', method: 'GET', data: params }),
  getUserPosts: (userId, params) => request({
    url: `/posts/user/${userId}`,
    method: 'GET',
    data: params
  }),
  getComboPosts: (comboId, params) => request({
    url: `/posts/combo/${comboId}`,
    method: 'GET',
    data: params
  }),
  getPostById: (postId) => request({ url: `/posts/${postId}`, method: 'GET' }),
  updatePost: (postId, data) => request({ url: `/posts/${postId}`, method: 'PUT', data }),
  deletePost: (postId) => request({ url: `/posts/${postId}`, method: 'DELETE' }),
  getVisitors: (postId, params) => request({ url: `/posts/${postId}/visitors`, method: 'GET', data: params }),

  // Polls
  createPoll: (postId, data) => request({ url: `/posts/${postId}/poll`, method: 'POST', data }),
  getPoll: (postId) => request({ url: `/posts/${postId}/poll`, method: 'GET' }),
  votePoll: (postId, data) => request({ url: `/posts/${postId}/poll/vote`, method: 'POST', data }),
  closePoll: (postId) => request({ url: `/posts/${postId}/poll/close`, method: 'POST' }),
  updatePoll: (postId, data) => request({ url: `/posts/${postId}/poll`, method: 'PATCH', data }),
  getPollOtherDetails: (postId) => request({ url: `/posts/${postId}/poll/other-details`, method: 'GET' }),

  // Likes
  toggleLike: (data) => request({ url: '/likes/toggle', method: 'POST', data }),
  getLikeUsers: (postId) => request({ url: `/likes/${postId}/users`, method: 'GET' }),

  // Comments
  getComments: (postId, params) => request({ url: `/post-comments/${postId}`, method: 'GET', data: params }),
  createComment: (postId, data) => request({ url: `/post-comments/${postId}`, method: 'POST', data }),
  deleteComment: (commentId) => request({ url: `/post-comments/${commentId}`, method: 'DELETE' }),
  toggleCommentLike: (commentId) => request({ url: `/post-comments/${commentId}/like`, method: 'POST' }),

  // Users (for @mentions)
  searchUsers: (q) => request({ url: '/users/search', method: 'GET', data: { q } }),
  getUsersBatch: (ids) => request({ url: '/users/batch', method: 'GET', data: { ids: ids.join(',') } }),

  // Reports
  createReport: (data) => request({ url: '/reports/create', method: 'POST', data }),
  getMyReports: () => request({ url: '/reports/my', method: 'GET' }),
  getReportList: (params) => request({ url: '/reports/list', method: 'GET', data: params }),
  getReportDetail: (id) => request({ url: `/reports/${id}`, method: 'GET' }),
  processReport: (id, data) => request({ url: `/reports/${id}/process`, method: 'POST', data }),
};

const checkinApi = {
  checkin: () => request({ url: '/checkin', method: 'POST' }),
  getStatus: (date) => request({ url: `/checkin/status${date ? '?date=' + date : ''}`, method: 'GET' }),
  getMonth: (year, month) => request({ url: `/checkin/month?year=${year}&month=${month}`, method: 'GET' }),
  getLeaderboard: (type) => request({ url: `/checkin/leaderboard?type=${type || 'streak'}`, method: 'GET' }),
  deductPoints: (points) => request({ url: '/checkin/deduct-points', method: 'POST', data: { points } }),
};

const workReportApi = {
  getList: (params) => request({ url: '/work-reports', method: 'GET', data: params }),
  getById: (id) => request({ url: `/work-reports/${id}`, method: 'GET' }),
  create: (data) => request({ url: '/work-reports', method: 'POST', data }),
  update: (id, data) => request({ url: `/work-reports/${id}`, method: 'PUT', data }),
  delete: (id) => request({ url: `/work-reports/${id}`, method: 'DELETE' }),
  getBoard: (params) => request({ url: '/work-reports/board', method: 'GET', data: params })
};

const reportTemplateApi = {
  getList: (params) => request({ url: '/work-reports/templates/list', method: 'GET', data: params }),
  upsert: (data) => request({ url: '/work-reports/templates', method: 'PUT', data }),
  createDefaults: (data) => request({ url: '/work-reports/templates/defaults', method: 'POST', data })
};

module.exports = {
  setToken,
  getToken,
  clearToken,
  isLoggedIn,
  requireLogin,
  request,
  authApi,
  todosApi,
  tagsApi,
  combosApi,
  collabApi,
  notifyApi,
  configApi,
  adminApi,
  commentsApi,
  communityApi,
  shareApi,
  userApi,
  checkinApi,
  workReportApi,
  reportTemplateApi,
  confirmRevokeIfShared
};
