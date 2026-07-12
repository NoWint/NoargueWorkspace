import http from './request'

export interface Report {
  id: number
  userId: number
  targetType: 'post' | 'comment'
  targetId: string
  targetContent: string
  reason: string
  detail: string
  status: 0 | 1 | 2 // 0待处理 1已处理 2已驳回
  resultNote: string
  processedBy: number | null
  createdAt: string
  processedAt: string | null
}

export const reportsApi = {
  create: (data: { targetType: 'post' | 'comment'; targetId: string; targetContent: string; reason: string; detail?: string }) =>
    http.post<{ success: boolean; message?: string }>('/reports/create', data),

  getMy: () =>
    http.get<{ success: boolean; reports: Report[] }>('/reports/my'),

  getList: (params: { status?: number; page?: number; pageSize?: number }) =>
    http.get<{ success: boolean; reports: Report[]; total: number; hasMore: boolean }>('/reports/list', { params }),

  getDetail: (id: number) =>
    http.get<{ success: boolean; report: Report }>(`/reports/${id}`),

  process: (id: number, data: { action: 'delete' | 'reject'; resultNote: string }) =>
    http.post<{ success: boolean; message?: string }>(`/reports/${id}/process`, data),
}
