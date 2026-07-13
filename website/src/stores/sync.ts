import { create } from 'zustand'
import type { Todo } from '@/types'
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
      // spec 3.7: localTodos 以 id 为键的对象，需包含所有变更字段
      type LocalTodo = Omit<Partial<Todo>, 'updatedAt'> & { updatedAt: string }
      const localTodos: Record<string, LocalTodo> = {}
      for (const t of todos) {
        if ((t.updatedAt || 0) > lastSyncAt) {
          localTodos[String(t.id)] = {
            text: t.text,
            setDate: t.setDate,
            setTime: t.setTime,
            remarks: t.remarks,
            completed: t.completed,
            isStar: t.isStar,
            priority: t.priority,
            comboId: t.comboId,
            tags: t.tags,
            images: t.images,
            isDeleted: t.isDeleted,
            version: t.version,
            updatedAt: new Date(t.updatedAt || 0).toISOString(),
          }
        }
      }
      const res = await syncApi.incremental({
        syncType: 'incremental',
        lastSyncTime: new Date(lastSyncAt).toISOString(),
        localTodos,
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
      // Remove cloud-deleted todos
      if (res.cloudDeletedIds && res.cloudDeletedIds.length > 0) {
        const deletedSet = new Set(res.cloudDeletedIds)
        useTodoStore.setState({
          todos: useTodoStore.getState().todos.filter((t) => !deletedSet.has(String(t.id))),
        })
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
      // spec 3.9: 分页拉取，合并所有页
      const pageSize = 500
      let page = 1
      let allTodos: unknown[] = []
      let syncedAt = Date.now()
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const res = await syncApi.full(page, pageSize)
        const batch = res.todos || []
        allTodos = allTodos.concat(batch)
        syncedAt = res.syncedAt || syncedAt
        if (batch.length < pageSize) break
        page++
        if (page > 50) break // 安全上限
      }
      useTodoStore.setState({ todos: allTodos as never[] })
      set({
        status: 'success',
        lastSyncAt: syncedAt,
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
