import http from './request'
import type { TodoListResponse, TodoItemResponse, TodoCreateResponse, TodoDeletedResponse, Todo } from '@/types'

export const todosApi = {
  getList: (params?: {
    page?: number
    size?: number
    pageSize?: number
    comboId?: number | string
    tagIds?: string
    search?: string
    showCompleted?: boolean
    date?: string
    parentId?: string
  }) =>
    http.get<TodoListResponse>('/todos/list', { params }),

  getById: (id: number | string) => {
    if (id === undefined || id === null || id === 'undefined') {
      console.warn('[todosApi.getById] invalid id:', id)
      return Promise.reject(new Error('无效的待办ID'))
    }
    return http.get<TodoItemResponse>(`/todos/${id}`)
  },

  create: (data: Partial<Todo>) =>
    http.post<TodoCreateResponse>('/todos/create', data),

  update: (id: number | string, data: Partial<Todo>) =>
    http.put<TodoCreateResponse>(`/todos/${id}`, data),

  delete: (id: number | string) =>
    http.delete<{ success: boolean; message?: string }>(`/todos/${id}`),

  getDeleted: () =>
    http.get<TodoDeletedResponse>('/todos/deleted'),

  restore: (todoId: number | string) =>
    http.post<{ success: boolean; todo: Todo }>(`/todos/restore/${todoId}`),

  permanentDelete: (todoId: number | string) =>
    http.delete<{ success: boolean; message?: string }>(`/todos/permanent/${todoId}`),

  batchMove: (todoIds: string[], comboId: number | null) =>
    http.post<{ success: boolean; message?: string }>('/todos/batch-move', { todoIds, comboId }),
}
