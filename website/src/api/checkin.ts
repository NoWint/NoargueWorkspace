import http from './request'

export interface CheckinStatus {
  checkedInToday: boolean
  streak: number
  totalPoints: number
  title: string
  nextMilestone: number
  nextMilestoneDays: number
}

export interface CheckinRecord {
  checkInDate: string
  points: number
}

export interface LeaderboardEntry {
  userId: number
  nickname: string
  avatarUrl: string
  streak: number
  totalPoints: number
  title: string
}

export const checkinApi = {
  checkin: () =>
    http.post<{ success: boolean; message?: string; points: number; streak: number; milestoneReward?: number }>('/checkin'),

  getStatus: (date?: string) =>
    http.get<{ success: boolean; status: CheckinStatus }>('/checkin/status', { params: date ? { date } : {} }),

  getMonth: (year: number, month: number) =>
    http.get<{ success: boolean; records: CheckinRecord[] }>('/checkin/month', { params: { year, month } }),

  getLeaderboard: (type: 'streak' | 'total' = 'streak') =>
    http.get<{ success: boolean; leaderboard: LeaderboardEntry[] }>('/checkin/leaderboard', { params: { type } }),

  deductPoints: (points: number, note: string) =>
    http.post<{ success: boolean; message?: string; remainingPoints: number }>('/checkin/deduct-points', { points, note }),
}
