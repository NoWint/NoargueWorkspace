import http from './request'
import type { TagListResponse, TagCreateResponse, Tag } from '@/types'

export const tagsApi = {
  getList: () =>
    http.get<TagListResponse>('/tags/list'),

  create: (data: Partial<Tag>) =>
    http.post<TagCreateResponse>('/tags/create', data),

  update: (id: number, data: Partial<Tag>) =>
    http.put<{ success: boolean; message?: string }>(`/tags/${id}`, data),

  delete: (id: number) =>
    http.delete<{ success: boolean; message?: string }>(`/tags/${id}`),
}
