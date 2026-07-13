import http from './request'
import type { TodoListResponse, TodoItemResponse, TodoCreateResponse, TodoDeletedResponse, Todo, SubtaskInput } from '@/types'

/** 创建/更新待办时的请求体（比 Todo 多了 tagIds 和 subtasks） */
export type TodoWriteInput = Partial<Omit<Todo, 'tags' | 'parentId'>> & {
  tagIds?: number[]
  subtasks?: SubtaskInput[]
  location?: { name: string; address: string; latitude: number; longitude: number } | null
  /** 后端用 snake_case parent_id（唯一不一致的字段） */
  parent_id?: string | null
}

export const todosApi = {
  getList: (params?: {
    page?: number
    size?: number
    pageSize?: number
    comboId?: number | string
    tagIds?: string
    search?: string
    /** 0=未完成 1=已完成（spec 用 completed，不是 showCompleted） */
    completed?: 0 | 1
    date?: string
    /** spec 用 parent_id（snake_case），null=仅根待办 */
    parent_id?: string | null
    includeDeleted?: boolean
  }) =>
    http.get<TodoListResponse>('/todos/list', { params }),

  getById: (id: number | string) => {
    if (id === undefined || id === null || id === 'undefined') {
      console.warn('[todosApi.getById] invalid id:', id)
      return Promise.reject(new Error('无效的待办ID'))
    }
    return http.get<TodoItemResponse>(`/todos/${id}`)
  },

  create: (data: TodoWriteInput) =>
    http.post<TodoCreateResponse>('/todos/create', data),

  update: (id: number | string, data: TodoWriteInput) =>
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
