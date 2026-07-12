import { create } from 'zustand'
import type { Tag } from '@/types'
import { tagsApi } from '@/api/tags'

interface TagState {
  systemTags: Tag[]
  userTags: Tag[]
  loading: boolean
  fetchTags: () => Promise<void>
  createTag: (data: Partial<Tag>) => Promise<Tag>
  updateTag: (id: number, data: Partial<Tag>) => Promise<void>
  deleteTag: (id: number) => Promise<void>
}

export const useTagStore = create<TagState>((set, get) => ({
  systemTags: [],
  userTags: [],
  loading: false,

  fetchTags: async () => {
    try {
      set({ loading: true })
      const res = await tagsApi.getList()
      const all = res.tags || []
      set({
        systemTags: all.filter((t) => t.isSystem === 1),
        userTags: all.filter((t) => t.isSystem === 0),
      })
    } finally {
      set({ loading: false })
    }
  },

  createTag: async (data) => {
    const res = await tagsApi.create(data)
    if (res.success && res.tag) {
      set({ userTags: [...get().userTags, res.tag] })
      return res.tag
    }
    throw new Error(res.message || '创建失败')
  },

  updateTag: async (id, data) => {
    await tagsApi.update(id, data)
    set({
      userTags: get().userTags.map((t) => (t.id === id ? { ...t, ...data } : t)),
    })
  },

  deleteTag: async (id) => {
    await tagsApi.delete(id)
    set({ userTags: get().userTags.filter((t) => t.id !== id) })
  },
}))
