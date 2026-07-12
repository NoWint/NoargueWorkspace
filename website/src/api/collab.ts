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
  getSharedList: () =>
    http.get<{ success: boolean; sharedCombos: SharedComboItem[] }>('/collab/shared'),

  join: (shareCode: string) =>
    http.post<{ success: boolean; message?: string; isMember?: boolean; combo?: any }>('/collab/join', { shareCode }),

  autoJoin: (shareCode: string) =>
    http.post<{ success: boolean; message?: string }>('/collab/auto-join', { shareCode }),

  leave: (comboId: number, transferToUserId?: number) =>
    http.post<{ success: boolean; message?: string }>('/collab/leave', { comboId, transferToUserId }),

  removeMember: (comboId: number, userId: number) =>
    http.delete<{ success: boolean; message?: string }>('/collab/member', { data: { comboId, userId } }),
}
