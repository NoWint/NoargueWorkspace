import http from './request'

export interface TodoNotification {
  id: number
  todoId: string
  userId: number
  notifyTime: string
  isSent: boolean
  sentAt: string | null
  templateMsgId: string | null
}

export const notifyApi = {
  subscribe: (templateIds: string[]) =>
    http.post<{ success: boolean }>('/notify/subscribe', { templateIds }),

  schedule: (data: { todoId: string; notifyTime: string }) =>
    http.post<{ success: boolean; message?: string }>('/notify/schedule', data),

  testSend: (todoId: string) =>
    http.post<{ success: boolean; message?: string }>('/notify/test-send', { todoId }),

  getByTodoId: (todoId: string) =>
    http.get<{ success: boolean; notifications: TodoNotification[] }>('/notify/by-todo', { params: { todoId } }),

  getList: () =>
    http.get<{ success: boolean; notifications: TodoNotification[] }>('/notify/list'),

  update: (id: number, data: Partial<TodoNotification>) =>
    http.put<{ success: boolean; message?: string }>(`/notify/${id}`, data),

  cancel: (id: number) =>
    http.delete<{ success: boolean; message?: string }>(`/notify/${id}`),

  scheduleShared: (data: { sharedTodoId: number; comboId: number; notifyTime: string }) =>
    http.post<{ success: boolean; message?: string }>('/notify/shared/schedule', data),

  getSharedByTodoId: (sharedTodoId: number) =>
    http.get<{ success: boolean; notifications: TodoNotification[] }>('/notify/shared/by-todo', { params: { sharedTodoId } }),

  updateShared: (id: number, data: Partial<TodoNotification>) =>
    http.put<{ success: boolean; message?: string }>(`/notify/shared/${id}`, data),

  cancelShared: (id: number) =>
    http.delete<{ success: boolean; message?: string }>(`/notify/shared/${id}`),
}
