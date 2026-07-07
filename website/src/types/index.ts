// ====== 用户 ======
export interface User {
  id: number
  openid: string
  nickname: string
  avatarUrl: string
  todoLimit: number
  comboLimit: number
  collabLimit: number
  isAdmin: boolean
  badgeTitles: string[]
  badgeColors: string[]
  createdAt?: string
}

// ====== 待办 ======
export interface Todo {
  id: number
  todoId?: string
  userId: number
  text: string
  setDate?: string
  setTime?: string
  remarks?: string
  locationText?: string
  completed: number
  isStar: number
  tags?: string
  images?: string
  version: number
  isDeleted: number
  comboId?: number
  createdAt: string
  updatedAt?: string
}

// ====== 组合 ======
export interface Combo {
  id: number
  userId: number
  name: string
  description?: string
  icon: string
  color: string
  isShared: boolean
  memberLimit: number
  sortOrder: number
}

// ====== 标签 ======
export interface Tag {
  id: number
  name: string
  color: string
  icon?: string
  isSystem: number
  userId?: number
  sortOrder: number
}

// ====== 公告 ======
export interface Notice {
  title: string
  content: string
  date?: string
}

// ====== 更新日志 ======
export interface Changelog {
  version: string
  date: string
  content: string[]
}

// ====== API 响应 ======
export interface ApiResponse<T> {
  success: boolean
  message?: string
  data?: T
  total?: number
}

export interface ApiListData<T> {
  list: T[]
  total: number
  page: number
  size: number
}

// 扫码状态查询特殊响应
export interface QrCodeStatusResponse {
  success: boolean
  status: 'waiting' | 'scanned' | 'confirmed' | 'expired'
  message: string
  token?: string
  user?: User
}
