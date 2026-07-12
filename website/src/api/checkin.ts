import http from './request'

export interface CheckinStatus {
  checkedIn: boolean
  streak: number
  totalDays: number
  points: number
  todayPoints: number
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

export interface CheckinResult {
  points: number
  streak: number
  newBadges: string[]
}

export const checkinApi = {
  checkin: () =>
    http.post<{ success: boolean; message?: string; data: CheckinResult }>('/checkin'),

  getStatus: (date?: string) =>
    http.get<{ success: boolean; data: CheckinStatus }>('/checkin/status', { params: date ? { date } : {} }),

  getMonth: (year: number, month: number) =>
    http.get<{ success: boolean; data?: { records: CheckinRecord[] }; records?: CheckinRecord[] }>('/checkin/month', { params: { year, month } }),

  getLeaderboard: (type: 'streak' | 'total' = 'streak', limit = 20) =>
    http.get<{ success: boolean; data?: { list: LeaderboardEntry[] }; leaderboard?: LeaderboardEntry[] }>('/checkin/leaderboard', { params: { type, limit } }),

  deductPoints: (points: number) =>
    http.post<{ success: boolean; message?: string }>('/checkin/deduct-points', { points }),
}
