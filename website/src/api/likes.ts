import http from './request'

export const likesApi = {
  toggle: (postId: string) =>
    http.post<{ success: boolean; isLiked: boolean; likesCount: number }>('/likes/toggle', { postId }),

  getUsers: (postId: string) =>
    http.get<{ success: boolean; users: { id: number; nickname: string; avatarUrl: string }[] }>(`/likes/${postId}/users`),
}
