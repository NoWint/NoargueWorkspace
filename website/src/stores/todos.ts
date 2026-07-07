import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import type { Todo } from '@/types'
import { todosApi } from '@/api/todos'

export const useTodosStore = defineStore('todos', () => {
  const items = ref<Todo[]>([])
  const deletedItems = ref<Todo[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const filter = reactive({
    comboId: null as number | null,
    tagIds: [] as number[],
    search: '',
    showCompleted: true,
  })

  async function fetchTodos() {
    try {
      loading.value = true
      error.value = null
      const params: Record<string, string | number | boolean> = {}
      if (filter.comboId) params.comboId = filter.comboId
      if (filter.tagIds.length) params.tagIds = filter.tagIds.join(',')
      if (filter.search) params.search = filter.search
      params.showCompleted = filter.showCompleted
      const res = await todosApi.getList(params)
      if (res.success && res.todos) {
        items.value = res.todos
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载待办失败'
    } finally {
      loading.value = false
    }
  }

  async function createTodo(data: Partial<Todo>) {
    const res = await todosApi.create(data)
    if (res.success && res.todo) {
      items.value.unshift(res.todo)
    }
    return res
  }

  async function updateTodo(id: number, data: Partial<Todo>) {
    const res = await todosApi.update(id, data)
    if (res.success) {
      const idx = items.value.findIndex((t) => t.id === id)
      if (idx !== -1 && res.todo) {
        items.value[idx] = res.todo
      }
    }
    return res
  }

  async function deleteTodo(id: number) {
    const res = await todosApi.delete(id)
    if (res.success) {
      items.value = items.value.filter((t) => t.id !== id)
    }
    return res
  }

  async function toggleComplete(id: number) {
    const idx = items.value.findIndex((t) => t.id === id)
    if (idx === -1) return
    const original = items.value[idx].completed
    items.value[idx].completed = original ? 0 : 1
    try {
      await todosApi.update(id, { completed: items.value[idx].completed })
    } catch {
      items.value[idx].completed = original
    }
  }

  async function toggleStar(id: number) {
    const idx = items.value.findIndex((t) => t.id === id)
    if (idx === -1) return
    const original = items.value[idx].isStar
    items.value[idx].isStar = original ? 0 : 1
    try {
      await todosApi.update(id, { isStar: items.value[idx].isStar })
    } catch {
      items.value[idx].isStar = original
    }
  }

  async function fetchTodoById(id: number): Promise<Todo | null> {
    try {
      const res = await todosApi.getById(id)
      if (res.success && res.todo) return res.todo
      return null
    } catch {
      return null
    }
  }

  async function fetchDeletedTodos() {
    const res = await todosApi.getDeleted()
    if (res.success && res.todos) {
      deletedItems.value = res.todos
    }
    return res
  }

  async function restoreTodo(todoId: number) {
    const res = await todosApi.restore(todoId)
    if (res.success) {
      deletedItems.value = deletedItems.value.filter((t) => t.id !== todoId)
    }
    return res
  }

  async function permanentDeleteTodo(todoId: number) {
    const res = await todosApi.permanentDelete(todoId)
    if (res.success) {
      deletedItems.value = deletedItems.value.filter((t) => t.id !== todoId)
    }
    return res
  }

  return {
    items,
    deletedItems,
    loading,
    error,
    filter,
    fetchTodos,
    fetchTodoById,
    createTodo,
    updateTodo,
    deleteTodo,
    toggleComplete,
    toggleStar,
    fetchDeletedTodos,
    restoreTodo,
    permanentDeleteTodo,
  }
})
