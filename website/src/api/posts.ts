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
  poll: PollSummary | null
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

/** 投票摘要（帖子列表/详情中的 poll 字段，不含 otherDetails） */
export interface PollSummary {
  pollId: number
  title: string
  type: number
  isAnonymous: boolean
  allowOther: boolean
  totalVotes: number
  endTime: string | null
  isEnded: boolean
  isVoted: boolean
  userVotedOptionIds: number[]
  options: PollOption[]
}

export interface PollOption {
  optionId: number
  text: string
  voteCount: number
  isOther: boolean
}

/** 投票详情（GET /posts/:postId/poll 响应） */
export interface PollDetail {
  poll: PollSummary
  otherDetails: PollOtherDetail[]
}

export interface PollOtherDetail {
  userId: number
  nickname: string
  avatar: string
  customText: string
  createdAt: string
}

/** 创建投票请求 */
export interface CreatePollRequest {
  title: string
  type?: number
  allowOther?: boolean
  isAnonymous?: boolean
  endTime?: string
  options: { text: string; isOther: boolean }[]
}

/** 投票请求 */
export interface VotePollRequest {
  optionIds: number[]
  otherTexts?: Record<string, string>
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

  /** 7.9 创建投票（仅帖主） */
  createPoll: (postId: string, data: CreatePollRequest) =>
    http.post<{ success: boolean; data: { pollId: number } }>(`/posts/${postId}/poll`, data),

  /** 7.10 获取投票详情 */
  getPoll: (postId: string) =>
    http.get<{ success: boolean; data: PollDetail }>(`/posts/${postId}/poll`),

  /** 7.11 投票 / 改票 */
  votePoll: (postId: string, data: VotePollRequest) =>
    http.post<{ success: boolean; data: { poll: PollSummary } }>(`/posts/${postId}/poll/vote`, data),

  /** 7.12 关闭投票（帖主或管理员） */
  closePoll: (postId: string) =>
    http.post<{ success: boolean; data: { poll: PollSummary } }>(`/posts/${postId}/poll/close`),
}
