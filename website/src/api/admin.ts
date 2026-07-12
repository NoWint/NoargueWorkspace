import http from './request'

export interface AdminStats {
  userCount: number
  todoCount: number
  comboCount: number
  sharedTodoCount: number
  notificationCount: number
  syncLogCount: number
  postCount: number
  commentCount: number
  checkinCount: number
  reportCount: number
  completionRate: number
  [key: string]: unknown
}

export interface AdminUser {
  id: number
  openid: string
  nickname: string
  avatarUrl: string
  todoLimit: number
  comboLimit: number
  collabLimit: number
  todoCount: number
  comboCount: number
  isAdmin: boolean
  badgeTitles: string[]
  badgeColors: string[]
  createdAt: string
  updatedAt: string
}

export interface AdminUserDetail extends AdminUser {
  todos: unknown[]
  combos: unknown[]
  sharedCombos: unknown[]
  assignedTodos: unknown[]
  assignedTodosFlat: unknown[]
  comments: unknown[]
  stats: Record<string, number>
}

export interface AdminNotice {
  title: string
  date: string
  content: string
  version?: string
}

export interface AdminChangelog {
  version: string
  date: string
  content: string[]
}

export const adminApi = {
  getStats: () =>
    http.get<{ success: boolean; stats: AdminStats }>('/admin/stats'),

  getStatDetail: (type: string) =>
    http.get<{ success: boolean; list: unknown[]; total: number }>(`/admin/stats/${type}`),

  getRetentionStats: () =>
    http.get<{ success: boolean; retention: { day1: number; day7: number; day30: number } }>('/admin/stats/retention'),

  getTagUsageStats: () =>
    http.get<{ success: boolean; tagUsage: { tagId: number; name: string; count: number }[] }>('/admin/stats/tag-usage'),

  getNotificationRateStats: () =>
    http.get<{ success: boolean; rate: { sent: number; failed: number; rate: number } }>('/admin/stats/notification-rate'),

  getUserTodoDistribution: () =>
    http.get<{ success: boolean; distribution: { range: string; count: number }[] }>('/admin/stats/user-todo-distribution'),

  getTodoHourlyStats: () =>
    http.get<{ success: boolean; hourly: { hour: number; count: number }[] }>('/admin/stats/todo-hourly'),

  getSharedTodoCompletion: () =>
    http.get<{ success: boolean; completion: { total: number; completed: number; rate: number } }>('/admin/stats/shared-todo-completion'),

  getMemberRoleStats: () =>
    http.get<{ success: boolean; roles: { role: string; count: number }[] }>('/admin/stats/member-roles'),

  getAssignTypeStats: () =>
    http.get<{ success: boolean; types: { assignType: string; count: number }[] }>('/admin/stats/assign-types'),

  getRequestApprovalRate: () =>
    http.get<{ success: boolean; rate: { total: number; approved: number; rejected: number; pending: number } }>('/admin/stats/request-rate'),

  getSyncActionStats: () =>
    http.get<{ success: boolean; actions: { action: string; count: number }[] }>('/admin/stats/sync-actions'),

  getTagCompletionAnalysis: () =>
    http.get<{ success: boolean; analysis: unknown[] }>('/admin/stats/cross/tag-completion'),

  getNotificationEffectAnalysis: () =>
    http.get<{ success: boolean; analysis: unknown[] }>('/admin/stats/cross/notification-effect'),

  getUsers: (params: { page: number; pageSize: number; search?: string }) =>
    http.get<{ success: boolean; users: AdminUser[]; total: number; page: number; pageSize: number }>('/admin/users', { params }),

  getUserDetail: (userId: number) =>
    http.get<{ success: boolean; user: AdminUserDetail }>(`/admin/users/${userId}`),

  updateUserLimits: (userId: number, data: { todoLimit?: number; comboLimit?: number; collabLimit?: number }) =>
    http.put<{ success: boolean; message?: string }>(`/admin/users/${userId}/limits`, data),

  updateUserNickname: (userId: number, nickname: string) =>
    http.put<{ success: boolean; message?: string }>(`/admin/users/${userId}/nickname`, { nickname }),

  updateUserBadges: (userId: number, data: { badgeTitles: string[]; badgeColors: string[] }) =>
    http.put<{ success: boolean; message?: string }>(`/admin/users/${userId}/badges`, data),

  getNotices: () =>
    http.get<{ success: boolean; notices: AdminNotice[] }>('/admin/notices'),

  createNotice: (data: AdminNotice) =>
    http.post<{ success: boolean; message?: string }>('/admin/notices', data),

  updateNotice: (index: number, data: AdminNotice) =>
    http.put<{ success: boolean; message?: string }>(`/admin/notices/${index}`, data),

  deleteNotice: (index: number) =>
    http.delete<{ success: boolean; message?: string }>(`/admin/notices/${index}`),

  getChangelog: () =>
    http.get<{ success: boolean; changelog: AdminChangelog[] }>('/admin/updates'),

  createChangelog: (data: AdminChangelog) =>
    http.post<{ success: boolean; message?: string }>('/admin/updates', data),

  updateChangelog: (index: number, data: AdminChangelog) =>
    http.put<{ success: boolean; message?: string }>(`/admin/updates/${index}`, data),

  deleteChangelog: (index: number) =>
    http.delete<{ success: boolean; message?: string }>(`/admin/updates/${index}`),

  deleteComment: (commentId: number) =>
    http.delete<{ success: boolean; message?: string }>(`/admin/comments/${commentId}`),

  getTodoDetail: (todoId: string) =>
    http.get<{ success: boolean; todo: unknown; subtasks: unknown[]; combo: unknown; creator: unknown }>(`/admin/todo/${todoId}`),
}
