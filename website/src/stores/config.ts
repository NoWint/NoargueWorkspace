import { create } from 'zustand'
import type { Notice, Changelog } from '@/types'
import { configApi } from '@/api/config'

interface ConfigState {
  notices: Notice[]
  changelogs: Changelog[]
  loaded: boolean
  fetchConfig: () => Promise<void>
}

export const useConfigStore = create<ConfigState>((set) => ({
  notices: [],
  changelogs: [],
  loaded: false,

  fetchConfig: async () => {
    try {
      const [noticesRes, changelogRes] = await Promise.all([
        configApi.getNotices(),
        configApi.getChangelog(),
      ])
      set({
        notices: noticesRes.notices || [],
        changelogs: changelogRes.changelogList || [],
        loaded: true,
      })
    } catch {
      set({ loaded: true })
    }
  },
}))
