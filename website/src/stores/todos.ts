import { create } from 'zustand'
import type { Todo } from '@/types'
import { todosApi, type TodoWriteInput } from '@/api/todos'
import { useSyncStore } from './sync'

type Filter = 'all' | 'today' | 'completed' | 'uncompleted' | 'starred'

// fetchTodos 并发保护计数器
let fetchSeq = 0

interface TodoState {
  todos: Todo[]
  loading: boolean
  filter: Filter
  subtaskMap: Record<string, Todo[]>
  setFilter: (f: Filter) => void
  fetchTodos: () => Promise<void>
  fetchSubtodos: (parentId: string) => Promise<void>
  createTodo: (data: TodoWriteInput) => Promise<Todo>
  updateTodo: (id: string, data: TodoWriteInput) => Promise<void>
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
    // 请求序号保护：如果并发调用，只有最后一次的结果会生效
    const seq = ++fetchSeq
    try {
      set({ loading: true })
      const allTodos: Todo[] = []
      let page = 1
      const pageSize = 100
      while (true) {
        const res = await todosApi.getList({ page, pageSize })
        // 如果期间有新的 fetchTodos 被调用，放弃本次结果
        if (seq !== fetchSeq) return
        const batch = res.todos || []
        allTodos.push(...batch)
        const total = res.total || 0
        if (allTodos.length >= total || batch.length < pageSize) break
        page++
        if (page > 20) break
      }
      if (seq === fetchSeq) set({ todos: allTodos })
    } finally {
      if (seq === fetchSeq) set({ loading: false })
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
      const newTodos = [...get().todos, res.todo]
      // Batch-created subtasks are returned as a flat list
      if (res.subtasks && res.subtasks.length > 0) {
        newTodos.push(...res.subtasks)
        // Cache subtasks in subtaskMap
        set({
          subtaskMap: {
            ...get().subtaskMap,
            [res.todo.id]: res.subtasks,
          },
        })
      }
      set({ todos: newTodos })
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
      // If subtasks were updated (full replacement), refresh subtask cache
      if (data.subtasks !== undefined) {
        // newSubtodos contains only newly created subtasks
        // Full refresh from server to get the complete list
        await get().fetchSubtodos(id)
      }
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
    // 乐观更新：立即反映到 UI
    set({
      todos: get().todos.map((t) =>
        t.id === id ? { ...t, completed: newCompleted } : t,
      ),
    })
    try {
      await get().updateTodo(id, { completed: newCompleted })
    } catch (err) {
      // 回滚
      set({
        todos: get().todos.map((t) =>
          t.id === id ? { ...t, completed: todo.completed } : t,
        ),
      })
      throw err
    }
  },

  toggleStar: async (id) => {
    const todo = get().todos.find((t) => t.id === id)
    if (!todo) return
    // 乐观更新
    set({
      todos: get().todos.map((t) =>
        t.id === id ? { ...t, isStar: !todo.isStar } : t,
      ),
    })
    try {
      await get().updateTodo(id, { isStar: !todo.isStar })
    } catch (err) {
      // 回滚
      set({
        todos: get().todos.map((t) =>
          t.id === id ? { ...t, isStar: todo.isStar } : t,
        ),
      })
      throw err
    }
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
