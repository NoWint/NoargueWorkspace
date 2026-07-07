import http from './request'
import type { Notice, Changelog } from '@/types'

interface NoticesResponse {
  success: boolean
  notices: Notice[]
}

interface ChangelogResponse {
  success: boolean
  changelogList: Changelog[]
}

export const configApi = {
  getNotices: () =>
    http.get<NoticesResponse>('/config/notices'),

  getChangelog: () =>
    http.get<ChangelogResponse>('/config/updates'),
}
