import { create } from 'zustand'
import { syncApi } from '@/api/sync'
import { useTodoStore } from './todos'

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error'

interface SyncState {
  status: SyncStatus
  lastSyncAt: number | null
  pendingChanges: boolean
  errorMsg: string | null
  syncNow: () => Promise<void>
  fullSync: () => Promise<void>
  markPending: () => void
  clearPending: () => void
  resetStatus: () => void
}

export const useSyncStore = create<SyncState>((set, get) => ({
  status: 'idle',
  lastSyncAt: null,
  pendingChanges: false,
  errorMsg: null,

  syncNow: async () => {
    const { lastSyncAt } = get()
    if (lastSyncAt === null) {
      await get().fullSync()
      return
    }
    set({ status: 'syncing', errorMsg: null })
    try {
      const todos = useTodoStore.getState().todos
      const localChanges = todos.filter(
        (t) => (t.updatedAt || 0) > lastSyncAt,
      )
      const res = await syncApi.incremental({
        localChanges,
        localDeletedIds: [],
        lastSyncAt,
      })
      // Merge cloud changes
      if (res.cloudChanges && res.cloudChanges.length > 0) {
        const existing = useTodoStore.getState().todos
        const cloudMap = new Map(res.cloudChanges.map((t) => [t.id, t]))
        const merged = existing.map((t) => {
          const cloud = cloudMap.get(t.id)
          if (cloud && (cloud.version || 0) >= (t.version || 0)) return cloud
          return t
        })
        // Add new cloud todos not in local
        for (const cloud of res.cloudChanges) {
          if (!existing.find((t) => t.id === cloud.id)) {
            merged.push(cloud)
          }
        }
        useTodoStore.setState({ todos: merged })
      }
      set({
        status: 'success',
        lastSyncAt: res.syncedAt || Date.now(),
        pendingChanges: false,
        errorMsg: null,
      })
      setTimeout(() => get().resetStatus(), 2000)
    } catch (err) {
      set({
        status: 'error',
        errorMsg: err instanceof Error ? err.message : '同步失败',
      })
    }
  },

  fullSync: async () => {
    set({ status: 'syncing', errorMsg: null })
    try {
      const res = await syncApi.full()
      useTodoStore.setState({ todos: res.todos || [] })
      set({
        status: 'success',
        lastSyncAt: res.syncedAt || Date.now(),
        pendingChanges: false,
        errorMsg: null,
      })
      setTimeout(() => get().resetStatus(), 2000)
    } catch (err) {
      set({
        status: 'error',
        errorMsg: err instanceof Error ? err.message : '全量同步失败',
      })
    }
  },

  markPending: () => set({ pendingChanges: true }),
  clearPending: () => set({ pendingChanges: false }),
  resetStatus: () => set({ status: 'idle' }),
}))
