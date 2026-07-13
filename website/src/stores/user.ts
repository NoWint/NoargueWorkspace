import { create } from 'zustand'
import { usersApi, type UserProfile } from '@/api/users'

interface UserState {
  searchResults: { id: number; nickname: string; avatarUrl: string }[]
  currentProfile: UserProfile | null
  loading: boolean
  search: (keyword: string) => Promise<void>
  getProfile: (userId: number) => Promise<void>
}

export const useUserStore = create<UserState>((set) => ({
  searchResults: [],
  currentProfile: null,
  loading: false,

  search: async (keyword) => {
    if (!keyword.trim()) {
      set({ searchResults: [] })
      return
    }
    const res = await usersApi.search(keyword)
    const r = res as unknown as { data?: { users?: { id: number; nickname: string; avatarUrl: string }[] }; users?: { id: number; nickname: string; avatarUrl: string }[] }
    const data = r.data || r
    set({ searchResults: data.users || [] })
  },

  getProfile: async (userId) => {
    try {
      set({ loading: true })
      const res = await usersApi.getProfile(userId)
      const r = res as unknown as { data?: { user?: Record<string, unknown>; stats?: Record<string, unknown> }; user?: Record<string, unknown>; stats?: Record<string, unknown> }
      const data = r.data || r
      const user = (data.user || {}) as Record<string, unknown>
      const stats = (data.stats || {}) as Record<string, unknown>
      const profile: UserProfile = {
        id: user.id as number,
        nickname: user.nickname as string,
        avatarUrl: (user.avatarUrl as string) || (user.avatar as string) || '',
        badgeTitles: (user.badgeTitles as string[]) || [],
        badgeColors: (user.badgeColors as string[]) || [],
        postCount: (stats.postCount as number) ?? (user.postCount as number) ?? 0,
        createdAt: (user.createdAt as string) || '',
        registeredDays: (user.registeredDays as number) ?? 0,
      }
      set({ currentProfile: profile })
    } finally {
      set({ loading: false })
    }
  },
}))
