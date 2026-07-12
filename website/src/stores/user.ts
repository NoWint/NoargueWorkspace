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
    set({ searchResults: res.users || [] })
  },

  getProfile: async (userId) => {
    try {
      set({ loading: true })
      const res = await usersApi.getProfile(userId)
      set({ currentProfile: res.user })
    } finally {
      set({ loading: false })
    }
  },
}))
