import http from './request'

export interface Post {
  postId: string
  userId: number
  comboId: number | null
  title: string
  body: string
  images: string[]
  files: PostFile[]
  todoIds: number[]
  shareCode: string
  location: { name: string; latitude: number; longitude: number; address?: string } | null
  ipAddress: string
  ipProvince: string
  likesCount: number
  commentsCount: number
  viewsCount: number
  viewerIds: number[]
  isLiked: boolean
  isEdited: boolean
  isDeleted: boolean
  user: {
    id: number
    nickname: string
    avatar: string
    badgeTitles: string[]
    badgeColors: string[]
  }
  createdAt: string
  updatedAt: string
}

export interface PostFile {
  id: string
  url: string
  raw_url: string
  filename: string
  size: number
  human_size: string
  content_type: string
  expires_at: string
  owner_token: string
}

export interface PostVisitor {
  id: number
  userId: number | null
  visitorIp: string
  viewedAt: string
  user?: { id: number; nickname: string; avatarUrl: string }
}

/** 游标分页响应（后端规范：data.list + data.nextCursor + data.hasMore） */
interface CursorPageRes<T> {
  success: boolean
  data?: { list: T[]; nextCursor: string | null; hasMore: boolean }
  /** 兼容扁平结构 */
  posts?: T[]
  list?: T[]
  nextCursor?: string | null
  hasMore?: boolean
}

export const postsApi = {
  create: (data: {
    postId: string
    title: string
    body: string
    images?: string[]
    todoIds?: number[]
    shareCode?: string
    comboId?: number
    files?: PostFile[]
    location?: Post['location']
  }) =>
    http.post<{ success: boolean; message?: string; postId: string }>('/posts/create', data),

  getList: (params: { cursor?: string; limit?: number }) =>
    http.get<CursorPageRes<Post>>('/posts/list', { params }),

  getUserPosts: (userId: number, params: { cursor?: string; limit?: number }) =>
    http.get<CursorPageRes<Post>>(`/posts/user/${userId}`, { params }),

  getComboPosts: (comboId: number, params: { cursor?: string; limit?: number }) =>
    http.get<CursorPageRes<Post>>(`/posts/combo/${comboId}`, { params }),

  getById: (postId: string) =>
    http.get<{ success: boolean; data?: Post; post?: Post }>(`/posts/${postId}`),

  update: (postId: string, data: Partial<Pick<Post, 'title' | 'body' | 'images' | 'todoIds' | 'files' | 'location'>>) =>
    http.put<{ success: boolean; message?: string }>(`/posts/${postId}`, data),

  delete: (postId: string) =>
    http.delete<{ success: boolean; message?: string }>(`/posts/${postId}`),

  getVisitors: (postId: string) =>
    http.get<{ success: boolean; data?: { visitors: PostVisitor[] }; visitors?: PostVisitor[] }>(`/posts/${postId}/visitors`),
}
