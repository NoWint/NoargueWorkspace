import http from './request'
import type { Todo } from '@/types'

export interface SyncResponse {
  cloudChanges: Todo[]
  cloudDeletedIds: string[]
  syncedAt: number
}

export const syncApi = {
  /** 增量同步 */
  incremental: (data: {
    localChanges: Todo[]
    localDeletedIds: string[]
    lastSyncAt: number | null
  }) => http.post<SyncResponse>('/todos/sync', data),

  /** 全量同步 */
  full: () =>
    http.get<{ todos: Todo[]; syncedAt: number }>('/todos/full-sync'),
}
