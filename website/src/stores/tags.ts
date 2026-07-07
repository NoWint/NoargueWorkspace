import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import type { Tag } from '@/types'
import { tagsApi } from '@/api/tags'

export const useTagsStore = defineStore('tags', () => {
  const items = ref<Tag[]>([])
  const loading = ref(false)
  const selectedIds = reactive<number[]>([])

  async function fetchTags() {
    loading.value = true
    try {
      const res = await tagsApi.getList()
      if (res.success && res.tags) {
        items.value = Array.isArray(res.tags) ? res.tags : []
      }
    } finally {
      loading.value = false
    }
  }

  function toggleTag(id: number) {
    const idx = selectedIds.indexOf(id)
    if (idx === -1) {
      selectedIds.push(id)
    } else {
      selectedIds.splice(idx, 1)
    }
  }

  async function createTag(data: Partial<Tag>) {
    const res = await tagsApi.create(data)
    if (res.success && res.tag) {
      items.value.push(res.tag)
    }
    return res
  }

  async function updateTag(id: number, data: Partial<Tag>) {
    const res = await tagsApi.update(id, data)
    if (res.success) {
      const idx = items.value.findIndex((t) => t.id === id)
      if (idx !== -1) {
        items.value[idx] = { ...items.value[idx], ...data }
      }
    }
    return res
  }

  async function deleteTag(id: number) {
    const res = await tagsApi.delete(id)
    if (res.success) {
      items.value = items.value.filter((t) => t.id !== id)
    }
    return res
  }

  return {
    items,
    loading,
    selectedIds,
    fetchTags,
    toggleTag,
    createTag,
    updateTag,
    deleteTag,
  }
})
