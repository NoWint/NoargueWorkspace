import { create } from 'zustand'
import { shareApi, type ShareSnapshot, type ShareVisitor } from '@/api/share'

interface ShareState {
  snapshots: ShareSnapshot[]
  visitors: ShareVisitor[]
  currentSnapshot: Record<string, unknown> | null
  loading: boolean
  fetchByTodo: (todoId: string) => Promise<void>
  create: (data: Parameters<typeof shareApi.createSnapshot>[0]) => Promise<string>
  revoke: (shareId: string) => Promise<void>
  getSnapshot: (shareId: string) => Promise<void>
  verifyPassword: (shareId: string, password: string) => Promise<boolean>
  fetchVisitors: (shareId: string) => Promise<void>
}

export const useShareStore = create<ShareState>((set, get) => ({
  snapshots: [],
  visitors: [],
  currentSnapshot: null,
  loading: false,

  fetchByTodo: async (todoId) => {
    const res = await shareApi.listByTodo(todoId)
    set({ snapshots: res.snapshots || [] })
  },

  create: async (data) => {
    const res = await shareApi.createSnapshot(data)
    return res.shareId
  },

  revoke: async (shareId) => {
    await shareApi.revokeSnapshot(shareId)
    set({ snapshots: get().snapshots.filter((s) => s.shareId !== shareId) })
  },

  getSnapshot: async (shareId) => {
    try {
      set({ loading: true })
      const res = await shareApi.getSnapshot(shareId)
      if (!res.needPassword) {
        set({ currentSnapshot: res.data })
      }
    } finally {
      set({ loading: false })
    }
  },

  verifyPassword: async (shareId, password) => {
    const res = await shareApi.verifyPassword(shareId, password)
    if (res.success) {
      set({ currentSnapshot: res.data })
      return true
    }
    return false
  },

  fetchVisitors: async (shareId) => {
    const res = await shareApi.getVisitors(shareId)
    set({ visitors: res.visitors || [] })
  },
}))
