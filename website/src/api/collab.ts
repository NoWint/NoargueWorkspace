import http from './request'

export interface SharedComboItem {
  id: number
  name: string
  icon: string
  color: string
  role: 'owner' | 'admin' | 'member'
  shareCode: string
  todoCount: number
  memberCount: number
}

export const collabApi = {
  getSharedList: (comboId?: number) =>
    http.get<{ success: boolean; sharedCombos: SharedComboItem[] }>('/collab/shared', comboId != null ? { params: { comboId } } : undefined),

  join: (shareCode: string) =>
    http.post<{ success: boolean; message?: string; isMember?: boolean; combo?: any }>('/collab/join', { shareCode }),

  autoJoin: (shareCode: string) =>
    http.post<{ success: boolean; message?: string }>('/collab/auto-join', { shareCode }),

  leave: (comboId: number, transferToUserId?: number) =>
    http.post<{ success: boolean; message?: string }>('/collab/leave', { comboId, transferToUserId }),

  removeMember: (comboId: number, userId: number) =>
    http.delete<{ success: boolean; message?: string }>('/collab/member', { params: { comboId, userId } }),

  sendRequest: (comboId: number) =>
    http.post<{ success: boolean; message?: string }>('/collab/request', { comboId }),

  getRequests: (comboId: number) =>
    http.get<{ success: boolean; requests: { id: number; userId: number; nickname: string; avatarUrl: string; message: string; status: string; createdAt: string }[] }>('/collab/requests', { params: { comboId } }),

  approveRequest: (requestId: number) =>
    http.post<{ success: boolean; message?: string }>(`/collab/requests/${requestId}/approve`),

  rejectRequest: (requestId: number) =>
    http.post<{ success: boolean; message?: string }>(`/collab/requests/${requestId}/reject`),

  createSharedTodo: (comboId: number, data: { text: string; setDate?: string; setTime?: string; remarks?: string; tags?: number[]; assignType?: 'all' | 'any' | 'specific'; assignedUserIds?: number[]; excludeType?: string }) =>
    http.post<{ success: boolean; message?: string; sharedTodo: unknown }>(`/collab/shared/${comboId}/todos`, data),

  updateSharedTodo: (comboId: number, todoId: number, data: Record<string, unknown>) =>
    http.put<{ success: boolean; message?: string }>(`/collab/shared/${comboId}/todos/${todoId}`, data),

  completeSharedTodo: (comboId: number, todoId: number) =>
    http.put<{ success: boolean; message?: string; completed: boolean }>(`/collab/shared/${comboId}/todos/${todoId}/complete`),

  deleteSharedTodo: (comboId: number, todoId: number) =>
    http.delete<{ success: boolean; message?: string }>(`/collab/shared/${comboId}/todos/${todoId}`),

  getQrCode: (shareCode: string, isAuto?: boolean) =>
    http.get<{ success: boolean; qrcode: string }>('/collab/qrcode', { params: { shareCode, auto: isAuto ? 1 : 0 } }),

  getMembers: (comboId: number) =>
    http.get<{ success: boolean; members: { id: number; userId: number; role: 'owner' | 'admin' | 'member'; nickname: string; avatarUrl: string; joinedAt: string }[] }>(`/combos/${comboId}/members`),

  setMemberRole: (comboId: number, userId: number, role: 'owner' | 'admin' | 'member') =>
    http.put<{ success: boolean; message?: string }>(`/combos/${comboId}/members/${userId}/role`, { role }),
}
