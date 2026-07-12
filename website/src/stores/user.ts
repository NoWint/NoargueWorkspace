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
    const data = (res as any).data || res
    set({ searchResults: data.users || [] })
  },

  getProfile: async (userId) => {
    try {
      set({ loading: true })
      const res = await usersApi.getProfile(userId)
      const data = (res as any).data || res
      const user = data.user || {}
      const stats = data.stats || {}
      const profile: UserProfile = {
        id: user.id,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl || user.avatar || '',
        badgeTitles: user.badgeTitles || [],
        badgeColors: user.badgeColors || [],
        postCount: stats.postCount ?? user.postCount ?? 0,
        createdAt: user.createdAt || '',
        registeredDays: user.registeredDays ?? 0,
      }
      set({ currentProfile: profile })
    } finally {
      set({ loading: false })
    }
  },
}))
