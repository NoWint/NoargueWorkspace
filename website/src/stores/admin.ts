import { create } from 'zustand'
import { adminApi, type AdminStats, type AdminUser, type AdminUserDetail, type AdminNotice, type AdminChangelog } from '@/api/admin'

interface AdminState {
  stats: AdminStats | null
  users: AdminUser[]
  userDetail: AdminUserDetail | null
  notices: AdminNotice[]
  changelog: AdminChangelog[]
  total: number
  page: number
  loading: boolean
  fetchStats: () => Promise<void>
  fetchUsers: (params: { page: number; pageSize: number; search?: string }) => Promise<void>
  fetchUserDetail: (userId: number) => Promise<void>
  fetchNotices: () => Promise<void>
  fetchChangelog: () => Promise<void>
  updateUserLimits: (userId: number, data: { todoLimit?: number; comboLimit?: number; collabLimit?: number }) => Promise<void>
  updateUserNickname: (userId: number, nickname: string) => Promise<void>
  updateUserBadges: (userId: number, data: { badgeTitles: string[]; badgeColors: string[] }) => Promise<void>
  saveNotice: (data: AdminNotice, index?: number) => Promise<void>
  deleteNotice: (index: number) => Promise<void>
  saveChangelog: (data: AdminChangelog, index?: number) => Promise<void>
  deleteChangelog: (index: number) => Promise<void>
}

/**
 * 兼容两种响应格式：
 * - spec 1.3 通用：{ success, data: {...} }
 * - 旧式扁平：{ success, ...fields }
 */
function unwrap<T extends Record<string, unknown>>(res: Record<string, unknown>): T {
  const data = res.data as Record<string, unknown> | undefined
  return (data || res) as T
}

export const useAdminStore = create<AdminState>((set, get) => ({
  stats: null,
  users: [],
  userDetail: null,
  notices: [],
  changelog: [],
  total: 0,
  page: 1,
  loading: false,

  fetchStats: async () => {
    try {
      set({ loading: true })
      const res = await adminApi.getStats()
      const u = unwrap<{ stats?: AdminStats }>(res as unknown as Record<string, unknown>)
      set({ stats: u.stats || null })
    } finally {
      set({ loading: false })
    }
  },

  fetchUsers: async (params) => {
    try {
      set({ loading: true })
      const res = await adminApi.getUsers(params)
      const u = unwrap<{ users?: AdminUser[]; total?: number; page?: number }>(res as unknown as Record<string, unknown>)
      set({ users: u.users || [], total: u.total || 0, page: u.page || 1 })
    } finally {
      set({ loading: false })
    }
  },

  fetchUserDetail: async (userId) => {
    try {
      set({ loading: true })
      const res = await adminApi.getUserDetail(userId)
      const u = unwrap<{ user?: AdminUserDetail }>(res as unknown as Record<string, unknown>)
      set({ userDetail: u.user || null })
    } finally {
      set({ loading: false })
    }
  },

  fetchNotices: async () => {
    const res = await adminApi.getNotices()
    const u = unwrap<{ notices?: AdminNotice[] }>(res as unknown as Record<string, unknown>)
    set({ notices: u.notices || [] })
  },

  fetchChangelog: async () => {
    const res = await adminApi.getChangelog()
    const u = unwrap<{ changelog?: AdminChangelog[] }>(res as unknown as Record<string, unknown>)
    set({ changelog: u.changelog || [] })
  },

  updateUserLimits: async (userId, data) => {
    await adminApi.updateUserLimits(userId, data)
    await get().fetchUserDetail(userId)
  },

  updateUserNickname: async (userId, nickname) => {
    await adminApi.updateUserNickname(userId, nickname)
    await get().fetchUserDetail(userId)
  },

  updateUserBadges: async (userId, data) => {
    await adminApi.updateUserBadges(userId, data)
    await get().fetchUserDetail(userId)
  },

  saveNotice: async (data, index) => {
    if (index !== undefined) {
      await adminApi.updateNotice(index, data)
    } else {
      await adminApi.createNotice(data)
    }
    await get().fetchNotices()
  },

  deleteNotice: async (index) => {
    await adminApi.deleteNotice(index)
    await get().fetchNotices()
  },

  saveChangelog: async (data, index) => {
    if (index !== undefined) {
      await adminApi.updateChangelog(index, data)
    } else {
      await adminApi.createChangelog(data)
    }
    await get().fetchChangelog()
  },

  deleteChangelog: async (index) => {
    await adminApi.deleteChangelog(index)
    await get().fetchChangelog()
  },
}))
