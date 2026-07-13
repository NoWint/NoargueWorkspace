import http from './request'
import type { Todo } from '@/types'

/**
 * 同步响应（spec 3.7）
 * 后端返回云端变更与已删除列表
 */
export interface SyncResponse {
  cloudChanges?: Todo[]
  cloudDeletedIds?: string[]
  syncedAt: number
}

export interface SyncRequestBody {
  /** 同步类型：incremental 增量 / full 全量 */
  syncType: 'incremental' | 'full'
  /** 上次同步时间（ISO 8601 字符串），首次同步传 null */
  lastSyncTime: string | null
  /** 本地待办（按 id 索引），需包含所有变更字段 */
  localTodos: Record<string, Omit<Partial<Todo>, 'updatedAt'> & { updatedAt: string }>
}

export const syncApi = {
  /** 增量同步（spec 3.7） */
  incremental: (data: SyncRequestBody) =>
    http.post<SyncResponse>('/todos/sync', data),

  /** 全量同步（spec 3.9） */
  full: (page: number = 1, pageSize: number = 500) =>
    http.get<{ success: boolean; todos: Todo[]; syncedAt: number; total?: number; page?: number; pageSize?: number }>(
      '/todos/full-sync',
      { params: { page, pageSize } },
    ),
}
