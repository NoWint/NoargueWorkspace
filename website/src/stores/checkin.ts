import { create } from 'zustand'
import { checkinApi, type CheckinStatus, type CheckinRecord, type LeaderboardEntry } from '@/api/checkin'

interface CheckinState {
  status: CheckinStatus | null
  monthRecords: CheckinRecord[]
  leaderboard: LeaderboardEntry[]
  loading: boolean
  checkinLoading: boolean
  fetchStatus: () => Promise<void>
  fetchMonth: (year: number, month: number) => Promise<void>
  fetchLeaderboard: (type?: 'streak' | 'total') => Promise<void>
  checkin: () => Promise<{ points: number; streak: number; milestoneReward?: number }>
}

export const useCheckinStore = create<CheckinState>((set) => ({
  status: null,
  monthRecords: [],
  leaderboard: [],
  loading: false,
  checkinLoading: false,

  fetchStatus: async () => {
    try {
      set({ loading: true })
      const res = await checkinApi.getStatus()
      set({ status: res.status })
    } finally {
      set({ loading: false })
    }
  },

  fetchMonth: async (year, month) => {
    const res = await checkinApi.getMonth(year, month)
    set({ monthRecords: res.records || [] })
  },

  fetchLeaderboard: async (type = 'streak') => {
    const res = await checkinApi.getLeaderboard(type)
    set({ leaderboard: res.leaderboard || [] })
  },

  checkin: async () => {
    set({ checkinLoading: true })
    try {
      const res = await checkinApi.checkin()
      await useCheckinStore.getState().fetchStatus()
      return { points: res.points, streak: res.streak, milestoneReward: res.milestoneReward }
    } finally {
      set({ checkinLoading: false })
    }
  },
}))
