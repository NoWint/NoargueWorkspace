import http from './request'

/**
 * 待办通知（spec 15.2）
 * 字段 notifyAt 与后端一致，时间格式 YYYY-MM-DD HH:mm:ss
 */
export interface TodoNotification {
  id: number
  todoId: number
  userId: number
  notifyAt: string
  isSent: boolean
  sentAt: string | null
  templateMsgId: string | null
}

export const notifyApi = {
  /** 订阅通知（spec 15.1） */
  subscribe: (templateId: string, targetMinutes?: number) =>
    http.post<{ success: boolean; message?: string }>('/notify/subscribe', { templateId, targetMinutes }),

  /** 计划通知（spec 15.2） */
  schedule: (data: { todoId: number; notifyAt: string }) =>
    http.post<{ success: boolean; message?: string }>('/notify/schedule', data),

  /** 按待办查询通知（spec 15.3） */
  getByTodoId: (todoId: number) =>
    http.get<{ success: boolean; data?: { notifications: TodoNotification[] }; notifications?: TodoNotification[] }>('/notify/by-todo', { params: { todoId } }),

  /** 通知列表（spec 15.3），可按 todoId 过滤 */
  getList: (todoId?: number) =>
    http.get<{ success: boolean; data?: { notifications: TodoNotification[] }; notifications?: TodoNotification[] }>('/notify/list', todoId ? { params: { todoId } } : undefined),

  /** 更新通知 */
  update: (id: number, data: Partial<TodoNotification>) =>
    http.put<{ success: boolean; message?: string }>(`/notify/${id}`, data),

  /** 取消通知 */
  cancel: (id: number) =>
    http.delete<{ success: boolean; message?: string }>(`/notify/${id}`),

  /** 共享待办通知 - 创建（spec 15.4） */
  scheduleShared: (data: { sharedTodoId: number; comboId: number; notifyAt: string }) =>
    http.post<{ success: boolean; message?: string }>('/notify/shared/schedule', data),

  /** 共享待办通知 - 按待办查询 */
  getSharedByTodoId: (sharedTodoId: number) =>
    http.get<{ success: boolean; data?: { notifications: TodoNotification[] }; notifications?: TodoNotification[] }>('/notify/shared/by-todo', { params: { sharedTodoId } }),

  /** 共享待办通知 - 更新 */
  updateShared: (id: number, data: Partial<TodoNotification>) =>
    http.put<{ success: boolean; message?: string }>(`/notify/shared/${id}`, data),

  /** 共享待办通知 - 取消 */
  cancelShared: (id: number) =>
    http.delete<{ success: boolean; message?: string }>(`/notify/shared/${id}`),
}
