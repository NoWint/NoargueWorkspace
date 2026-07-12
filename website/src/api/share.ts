import http from './request'

export interface ShareSnapshot {
  shareId: string
  todoId: string
  data: Record<string, unknown>
  expiresAt: string
  password: string | null
  maxViews: number
  currentViews: number
  remark: string
  allowCopy: boolean
  trackVisitors: boolean
  revoked: boolean
  createdAt: string
}

export interface ShareVisitor {
  id: number
  shareId: string
  visitorIp: string
  visitorUserId: number | null
  action: 'view' | 'add'
  createdAt: string
}

export const shareApi = {
  createSnapshot: (data: {
    todoId: string
    expiresAt: string
    password?: string
    maxViews?: number
    fieldVisibility?: Record<string, boolean>
    allowCopy?: boolean
    trackVisitors?: boolean
    remark?: string
  }) =>
    http.post<{ success: boolean; shareId: string; message?: string }>('/share/snapshot', data),

  getSnapshot: (shareId: string) =>
    http.get<{ success: boolean; data: Record<string, unknown>; expiresAt: string; currentViews: number; maxViews: number; revoked: boolean; needPassword: boolean }>(`/share/snapshot/${shareId}`),

  revokeSnapshot: (shareId: string) =>
    http.post<{ success: boolean; message?: string }>(`/share/snapshot/revoke/${shareId}`),

  listByTodo: (todoId: string) =>
    http.get<{ success: boolean; snapshots: ShareSnapshot[] }>(`/share/snapshot/list-by-todo/${todoId}`),

  batchMetadata: (shareIds: string[]) =>
    http.post<{ success: boolean; metadata: Record<string, { views: number; expiresAt: string; revoked: boolean }> }>('/share/snapshot/batch-metadata', { shareIds }),

  verifyPassword: (shareId: string, password: string) =>
    http.post<{ success: boolean; data: Record<string, unknown> }>(`/share/snapshot/verify-password/${shareId}`, { password }),

  recordAddAction: (shareId: string) =>
    http.post<{ success: boolean }>(`/share/snapshot/record-add/${shareId}`),

  getVisitors: (shareId: string) =>
    http.get<{ success: boolean; visitors: ShareVisitor[] }>(`/share/snapshot/visitors/${shareId}`),
}
