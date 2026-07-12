import { create } from 'zustand'
import { workReportApi, type WorkReport, type ReportTemplate, type ReportBoard } from '@/api/workReports'

interface WorkReportState {
  reports: WorkReport[]
  board: ReportBoard | null
  templates: ReportTemplate[]
  currentReport: WorkReport | null
  loading: boolean
  fetchReports: (params: { type?: 'daily' | 'weekly'; comboId?: number }) => Promise<void>
  fetchBoard: (params: { comboId: number; type: 'daily' | 'weekly'; periodDate: string; userId?: number }) => Promise<void>
  fetchTemplates: (comboId: number) => Promise<void>
  fetchById: (id: number) => Promise<void>
  create: (data: { type: 'daily' | 'weekly'; periodDate: string; comboId: number; content: Record<string, string[]> }) => Promise<WorkReport>
  update: (id: number, data: Partial<WorkReport>) => Promise<void>
  remove: (id: number) => Promise<void>
  upsertTemplate: (data: { comboId: number; type: 'daily' | 'weekly'; sections: ReportTemplate['sections'] }) => Promise<void>
}

export const useWorkReportStore = create<WorkReportState>((set) => ({
  reports: [],
  board: null,
  templates: [],
  currentReport: null,
  loading: false,

  fetchReports: async (params) => {
    try {
      set({ loading: true })
      const res = await workReportApi.getList(params)
      set({ reports: res.reports || [] })
    } finally {
      set({ loading: false })
    }
  },

  fetchBoard: async (params) => {
    try {
      set({ loading: true })
      const res = await workReportApi.getBoard(params)
      set({ board: res.board })
    } finally {
      set({ loading: false })
    }
  },

  fetchTemplates: async (comboId) => {
    const res = await workReportApi.getTemplates(comboId)
    set({ templates: res.templates || [] })
  },

  fetchById: async (id) => {
    try {
      set({ loading: true })
      const res = await workReportApi.getById(id)
      set({ currentReport: res.report })
    } finally {
      set({ loading: false })
    }
  },

  create: async (data) => {
    const res = await workReportApi.create(data)
    return res.report
  },

  update: async (id, data) => {
    await workReportApi.update(id, data)
  },

  remove: async (id) => {
    await workReportApi.delete(id)
  },

  upsertTemplate: async (data) => {
    await workReportApi.upsertTemplate(data)
  },
}))
