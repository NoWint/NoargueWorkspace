import http from './request'

export interface WorkReport {
  id: number
  userId: number
  type: 'daily' | 'weekly'
  reportDate: string
  periodLabel: string
  comboId: number
  content: Record<string, string>
  isDeleted: boolean
  createdAt: string
  updatedAt: string
}

export interface ReportTemplate {
  id: number
  comboId: number
  userId: number
  type: 'daily' | 'weekly'
  sections: { key: string; title: string; sort_order: number; max_lines: number }[]
  createdAt: string
  updatedAt: string
}

export interface ReportBoard {
  members: {
    userId: number
    nickname: string
    avatarUrl: string
    reports: WorkReport[]
  }[]
}

export const workReportApi = {
  getTemplates: (comboId: number) =>
    http.get<{ success: boolean; templates: ReportTemplate[] }>('/work-reports/templates/list', { params: { combo_id: comboId } }),

  upsertTemplate: (data: { comboId: number; type: 'daily' | 'weekly'; sections: ReportTemplate['sections'] }) =>
    http.put<{ success: boolean; message?: string }>('/work-reports/templates', data),

  createDefaults: (comboId: number) =>
    http.post<{ success: boolean; message?: string }>('/work-reports/templates/defaults', { comboId }),

  getList: (params: { type?: 'daily' | 'weekly'; comboId?: number; page?: number; pageSize?: number }) =>
    http.get<{ success: boolean; reports: WorkReport[]; total: number }>('/work-reports', { params }),

  getBoard: (params: { comboId: number; type: 'daily' | 'weekly'; reportDate: string; userId?: number; dateFrom?: string; dateTo?: string }) =>
    http.get<{ success: boolean; board: ReportBoard }>('/work-reports/board', { params }),

  getById: (id: number) =>
    http.get<{ success: boolean; report: WorkReport }>(`/work-reports/${id}`),

  create: (data: { type: 'daily' | 'weekly'; reportDate: string; comboId: number; content: Record<string, string> }) =>
    http.post<{ success: boolean; message?: string; report: WorkReport }>('/work-reports', data),

  update: (id: number, data: Partial<WorkReport>) =>
    http.put<{ success: boolean; message?: string; report: WorkReport }>(`/work-reports/${id}`, data),

  delete: (id: number) =>
    http.delete<{ success: boolean; message?: string }>(`/work-reports/${id}`),
}
