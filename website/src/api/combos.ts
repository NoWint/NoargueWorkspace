import http from './request'
import type { ComboListResponse, ComboCreateResponse, ComboUpdateResponse, Combo } from '@/types'

export const combosApi = {
  getList: () =>
    http.get<ComboListResponse>('/combos/list'),

  getById: (id: number) =>
    http.get<{
      success: boolean
      combo: Combo & {
        shareCode?: string
        todoCount?: number
        memberCount?: number
        userRole?: string | null
        members: Array<{
          id: number
          nickname: string
          avatarUrl: string
          role: string
          joinedAt: string
        }>
        sharedTodos: any[]
        createdAt: string
      }
    }>(`/combos/${id}`),

  create: (data: Partial<Combo>) =>
    http.post<ComboCreateResponse>('/combos/create', data),

  update: (id: number, data: Partial<Combo>) =>
    http.put<ComboUpdateResponse>(`/combos/${id}`, data),

  delete: (id: number) =>
    http.delete<{ success: boolean; message?: string }>(`/combos/${id}`),
}
