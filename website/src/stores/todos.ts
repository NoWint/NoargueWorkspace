import { create } from 'zustand'
import type { Todo } from '@/types'
import { todosApi } from '@/api/todos'
import { useSyncStore } from './sync'

type Filter = 'all' | 'today' | 'completed' | 'uncompleted' | 'starred'

interface TodoState {
  todos: Todo[]
  loading: boolean
  filter: Filter
  subtaskMap: Record<string, Todo[]>
  setFilter: (f: Filter) => void
  fetchTodos: () => Promise<void>
  fetchSubtodos: (parentId: string) => Promise<void>
  createTodo: (data: Partial<Todo>) => Promise<Todo>
  updateTodo: (id: string, data: Partial<Todo>) => Promise<void>
  deleteTodo: (id: string) => Promise<void>
  toggleComplete: (id: string) => Promise<void>
  toggleStar: (id: string) => Promise<void>
  restoreTodo: (id: string) => Promise<void>
  permanentDelete: (id: string) => Promise<void>
  batchMove: (todoIds: string[], comboId: number | null) => Promise<void>
}

export const useTodoStore = create<TodoState>((set, get) => ({
  todos: [],
  loading: false,
  filter: 'all',
  subtaskMap: {},

  setFilter: (f) => set({ filter: f }),

  fetchTodos: async () => {
    try {
      set({ loading: true })
      const res = await todosApi.getList()
      set({ todos: res.todos || [] })
    } finally {
      set({ loading: false })
    }
  },

  fetchSubtodos: async (parentId) => {
    const res = await todosApi.getList({ parent_id: parentId })
    set({
      subtaskMap: {
        ...get().subtaskMap,
        [parentId]: res.todos || [],
      },
    })
  },

  createTodo: async (data) => {
    const res = await todosApi.create(data)
    if (res.success && res.todo) {
      set({ todos: [...get().todos, res.todo] })
      useSyncStore.getState().markPending()
      return res.todo
    }
    throw new Error(res.message || '创建失败')
  },

  updateTodo: async (id, data) => {
    const res = await todosApi.update(id, {
      ...data,
      version: (get().todos.find((t) => t.id === id)?.version || 1) + 1,
      updatedAt: Date.now(),
    })
    if (res.success && res.todo) {
      set({
        todos: get().todos.map((t) => (t.id === id ? res.todo! : t)),
      })
      useSyncStore.getState().markPending()
    }
  },

  deleteTodo: async (id) => {
    await todosApi.delete(id)
    set({
      todos: get().todos.map((t) =>
        t.id === id ? { ...t, isDeleted: true, updatedAt: Date.now() } : t,
      ),
    })
    useSyncStore.getState().markPending()
  },

  toggleComplete: async (id) => {
    const todo = get().todos.find((t) => t.id === id)
    if (!todo) return
    const newCompleted = todo.completed ? 0 : Date.now()
    await get().updateTodo(id, { completed: newCompleted })
  },

  toggleStar: async (id) => {
    const todo = get().todos.find((t) => t.id === id)
    if (!todo) return
    await get().updateTodo(id, { isStar: !todo.isStar })
  },

  restoreTodo: async (id) => {
    const res = await todosApi.restore(id)
    if (res.success) {
      set({
        todos: get().todos.map((t) =>
          t.id === id ? { ...t, isDeleted: false, updatedAt: Date.now() } : t,
        ),
      })
      useSyncStore.getState().markPending()
    }
  },

  permanentDelete: async (id) => {
    await todosApi.permanentDelete(id)
    set({ todos: get().todos.filter((t) => t.id !== id) })
  },

  batchMove: async (todoIds, comboId) => {
    await todosApi.batchMove(todoIds, comboId)
    set({
      todos: get().todos.map((t) =>
        todoIds.includes(t.id)
          ? { ...t, comboId: comboId || undefined, updatedAt: Date.now() }
          : t,
      ),
    })
    useSyncStore.getState().markPending()
  },
}))
