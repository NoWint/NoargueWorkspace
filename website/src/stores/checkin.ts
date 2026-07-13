import { create } from 'zustand'
import { checkinApi, type CheckinStatus, type LeaderboardEntry } from '@/api/checkin'

interface CheckinState {
  status: CheckinStatus | null
  monthDates: string[]
  leaderboard: LeaderboardEntry[]
  loading: boolean
  checkinLoading: boolean
  fetchStatus: () => Promise<void>
  fetchMonth: (year: number, month: number) => Promise<void>
  fetchLeaderboard: (type?: 'streak' | 'total') => Promise<void>
  checkin: () => Promise<{ points: number; streak: number; newBadges: string[] }>
}

export const useCheckinStore = create<CheckinState>((set) => ({
  status: null,
  monthDates: [],
  leaderboard: [],
  loading: false,
  checkinLoading: false,

  fetchStatus: async () => {
    try {
      set({ loading: true })
      const res = await checkinApi.getStatus()
      const data = (res as any).data || null
      set({ status: data as CheckinStatus | null })
    } finally {
      set({ loading: false })
    }
  },

  fetchMonth: async (year, month) => {
    const res = await checkinApi.getMonth(year, month)
    const data = (res as any).data || {}
    set({ monthDates: (data.dates || []) as string[] })
  },

  fetchLeaderboard: async (type = 'streak') => {
    const res = await checkinApi.getLeaderboard(type)
    const data = (res as any).data || res
    const list = data.list || data.leaderboard || data.records || []
    set({ leaderboard: list as LeaderboardEntry[] })
  },

  checkin: async () => {
    set({ checkinLoading: true })
    try {
      const res = await checkinApi.checkin()
      await useCheckinStore.getState().fetchStatus()
      const data = (res as any).data || res
      return {
        points: data.points || 0,
        streak: data.streak || data.streakDays || 0,
        newBadges: (data.newBadges || []) as string[],
      }
    } finally {
      set({ checkinLoading: false })
    }
  },
}))
