import { create } from 'zustand'
import { notifyApi, type TodoNotification } from '@/api/notify'

interface NotifyState {
  notifications: TodoNotification[]
  todoNotifications: Record<string, TodoNotification[]>
  loading: boolean
  fetchList: () => Promise<void>
  fetchByTodoId: (todoId: number) => Promise<void>
  schedule: (todoId: number, notifyAt: string) => Promise<void>
  cancel: (id: number) => Promise<void>
}

export const useNotifyStore = create<NotifyState>((set, get) => ({
  notifications: [],
  todoNotifications: {},
  loading: false,

  fetchList: async () => {
    try {
      set({ loading: true })
      const res = await notifyApi.getList()
      const data = (res as any).data || res
      set({ notifications: data.notifications || [] })
    } finally {
      set({ loading: false })
    }
  },

  fetchByTodoId: async (todoId) => {
    const res = await notifyApi.getByTodoId(todoId)
    const data = (res as any).data || res
    set({
      todoNotifications: {
        ...get().todoNotifications,
        [String(todoId)]: data.notifications || [],
      },
    })
  },

  schedule: async (todoId, notifyAt) => {
    await notifyApi.schedule({ todoId, notifyAt })
    await get().fetchByTodoId(todoId)
  },

  cancel: async (id) => {
    await notifyApi.cancel(id)
  },
}))
