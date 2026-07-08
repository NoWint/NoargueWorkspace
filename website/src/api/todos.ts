import http from './request'
import type { TodoListResponse, TodoItemResponse, TodoCreateResponse, TodoDeletedResponse, Todo } from '@/types'

export const todosApi = {
  getList: (params?: {
    page?: number
    size?: number
    comboId?: number
    tagIds?: string
    search?: string
    showCompleted?: boolean
    date?: string
  }) =>
    http.get<TodoListResponse>('/todos/list', { params }),

  getById: (id: number | string) =>
    http.get<TodoItemResponse>(`/todos/${id}`),

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
}
