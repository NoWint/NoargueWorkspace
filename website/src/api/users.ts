import http from './request'

export interface UserProfile {
  id: number
  nickname: string
  avatarUrl: string
  badgeTitles: string[]
  badgeColors: string[]
  postCount: number
  createdAt: string
  registeredDays: number
}

export const usersApi = {
  search: (keyword: string) =>
    http.get<{ success: boolean; users: { id: number; nickname: string; avatarUrl: string }[] }>('/users/search', { params: { keyword } }),

  getBatch: (ids: number[]) =>
    http.get<{ success: boolean; users: { id: number; nickname: string; avatarUrl: string }[] }>('/users/batch', { params: { ids: ids.join(',') } }),

  getProfile: (userId: number) =>
    http.get<{ success: boolean; user: UserProfile }>(`/users/${userId}/profile`),
}
