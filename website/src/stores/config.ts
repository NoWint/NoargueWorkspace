import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Notice, Changelog } from '@/types'
import { configApi } from '@/api/config'

export const useConfigStore = defineStore('config', () => {
  const notices = ref<Notice[]>([])
  const changelog = ref<Changelog[]>([])
  const loading = ref(false)

  async function fetchNotices() {
    loading.value = true
    try {
      const res = await configApi.getNotices()
      if (res.success && res.notices) {
        notices.value = Array.isArray(res.notices) ? res.notices : []
      }
    } finally {
      loading.value = false
    }
  }

  async function fetchChangelog() {
    loading.value = true
    try {
      const res = await configApi.getChangelog()
      if (res.success && res.changelogList) {
        changelog.value = Array.isArray(res.changelogList) ? res.changelogList : []
      }
    } finally {
      loading.value = false
    }
  }

  return {
    notices,
    changelog,
    loading,
    fetchNotices,
    fetchChangelog,
  }
})
