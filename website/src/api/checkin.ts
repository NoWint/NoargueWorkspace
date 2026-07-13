import http from './request'

export interface CheckinStatus {
  checkedIn: boolean
  /** 后端字段名 streakDays，前端别名 streak */
  streakDays: number
  /** 后端字段名 totalPoints */
  totalPoints: number
  todayPoints: number
  title: string
  registeredDays: number
  /** 后端字段名 totalCheckins */
  totalCheckins: number
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
    http.get<{ success: boolean; data: { year: number; month: number; dates: string[]; count: number } }>('/checkin/month', { params: { year, month } }),

  getLeaderboard: (type: 'streak' | 'total' = 'streak', limit = 20) =>
    http.get<{ success: boolean; data?: { list: LeaderboardEntry[] }; leaderboard?: LeaderboardEntry[] }>('/checkin/leaderboard', { params: { type, limit } }),

  deductPoints: (points: number) =>
    http.post<{ success: boolean; message?: string }>('/checkin/deduct-points', { points }),
}
