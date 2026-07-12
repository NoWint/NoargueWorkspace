import http from './request'

export interface PostComment {
  id: number
  postId: string
  userId: number
  content: string
  images: string[]
  parentId: number | null
  replyToUserId: number | null
  replyToContent: string | null
  likesCount: number
  isLiked: boolean
  isDeleted: boolean
  createdAt: string
  user: {
    id: number
    nickname: string
    avatar: string
    badgeTitles: string[]
    badgeColors: string[]
  }
  replies?: PostComment[]
}

/** 游标分页响应（后端规范：data.list + data.nextCursor + data.hasMore） */
interface CursorPageRes<T> {
  success: boolean
  data?: { list: T[]; nextCursor: string | null; hasMore: boolean }
  comments?: T[]
  list?: T[]
  nextCursor?: string | null
  hasMore?: boolean
}

export const commentsApi = {
  getList: (postId: string, params: { cursor?: string; limit?: number }) =>
    http.get<CursorPageRes<PostComment>>(`/post-comments/${postId}`, { params }),

  create: (postId: string, data: { content: string; images?: string[]; parentId?: number; replyToUserId?: number }) =>
    http.post<{ success: boolean; message?: string; comment: PostComment }>(`/post-comments/${postId}`, data),

  delete: (commentId: number) =>
    http.delete<{ success: boolean; message?: string }>(`/post-comments/${commentId}`),

  toggleLike: (commentId: number) =>
    http.post<{ success: boolean; isLiked: boolean; likesCount: number }>(`/post-comments/${commentId}/like`),
}

export interface SharedTodoComment {
  id: number
  sharedTodoId: number
  userId: number
  content: string
  parentId: number | null
  replyToUserId: number | null
  images: string[]
  isDeleted: boolean
  createdAt: string
  updatedAt: string
  user: {
    id: number
    nickname: string
    avatar: string
    role: string
    badgeTitles: string[]
    badgeColors: string[]
  }
  replies?: SharedTodoComment[]
}

export const sharedCommentsApi = {
  getList: (sharedTodoId: number) =>
    http.get<{ success: boolean; comments: SharedTodoComment[] }>(`/comments/${sharedTodoId}`),

  create: (sharedTodoId: number, data: { content: string; parentId?: number; replyToUserId?: number; images?: string[] }) =>
    http.post<{ success: boolean; message?: string; comment: SharedTodoComment }>(`/comments/${sharedTodoId}`, data),

  delete: (commentId: number) =>
    http.delete<{ success: boolean; message?: string }>(`/comments/${commentId}`),
}
