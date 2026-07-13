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

/**
 * 兼容 { success, data: {...} } 与扁平 { success, ...fields } 两种格式（spec 1.3）
 */
function unwrap<T extends Record<string, unknown>>(res: Record<string, unknown>): T {
  const data = res.data as Record<string, unknown> | undefined
  return (data || res) as T
}

export const useShareStore = create<ShareState>((set, get) => ({
  snapshots: [],
  visitors: [],
  currentSnapshot: null,
  loading: false,

  fetchByTodo: async (todoId) => {
    const res = await shareApi.listByTodo(todoId)
    const u = unwrap<{ snapshots?: ShareSnapshot[] }>(res as unknown as Record<string, unknown>)
    set({ snapshots: u.snapshots || [] })
  },

  create: async (data) => {
    const res = await shareApi.createSnapshot(data)
    const u = unwrap<{ shareId?: string }>(res as unknown as Record<string, unknown>)
    return u.shareId || ''
  },

  revoke: async (shareId) => {
    await shareApi.revokeSnapshot(shareId)
    set({ snapshots: get().snapshots.filter((s) => s.shareId !== shareId) })
  },

  getSnapshot: async (shareId) => {
    try {
      set({ loading: true })
      const res = await shareApi.getSnapshot(shareId)
      const u = unwrap<{ data?: Record<string, unknown>; needPassword?: boolean; currentViews?: number; maxViews?: number; revoked?: boolean }>(res as unknown as Record<string, unknown>)
      if (!u.needPassword) {
        set({ currentSnapshot: u.data || null })
      }
    } finally {
      set({ loading: false })
    }
  },

  verifyPassword: async (shareId, password) => {
    const res = await shareApi.verifyPassword(shareId, password)
    const u = unwrap<{ data?: Record<string, unknown> }>(res as unknown as Record<string, unknown>)
    if (res.success) {
      set({ currentSnapshot: u.data || null })
      return true
    }
    return false
  },

  fetchVisitors: async (shareId) => {
    const res = await shareApi.getVisitors(shareId)
    const u = unwrap<{ visitors?: ShareVisitor[] }>(res as unknown as Record<string, unknown>)
    set({ visitors: u.visitors || [] })
  },
}))
