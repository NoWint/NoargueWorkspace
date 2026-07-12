import { create } from 'zustand'
import { notifyApi, type TodoNotification } from '@/api/notify'

interface NotifyState {
  notifications: TodoNotification[]
  todoNotifications: Record<string, TodoNotification[]>
  loading: boolean
  fetchList: () => Promise<void>
  fetchByTodoId: (todoId: string) => Promise<void>
  schedule: (todoId: string, notifyTime: string) => Promise<void>
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
      set({ notifications: res.notifications || [] })
    } finally {
      set({ loading: false })
    }
  },

  fetchByTodoId: async (todoId) => {
    const res = await notifyApi.getByTodoId(todoId)
    set({
      todoNotifications: {
        ...get().todoNotifications,
        [todoId]: res.notifications || [],
      },
    })
  },

  schedule: async (todoId, notifyTime) => {
    await notifyApi.schedule({ todoId, notifyTime })
    await get().fetchByTodoId(todoId)
  },

  cancel: async (id) => {
    await notifyApi.cancel(id)
  },
}))
