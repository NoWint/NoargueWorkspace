import { create } from 'zustand'
import { postsApi, type Post } from '@/api/posts'
import { likesApi } from '@/api/likes'

interface CommunityState {
  posts: Post[]
  currentPost: Post | null
  userPosts: Post[]
  cursor: string | null
  hasMore: boolean
  loading: boolean
  fetchPosts: (reset?: boolean) => Promise<void>
  fetchUserPosts: (userId: number, reset?: boolean) => Promise<void>
  fetchById: (postId: string) => Promise<void>
  create: (data: Parameters<typeof postsApi.create>[0]) => Promise<string>
  update: (postId: string, data: Parameters<typeof postsApi.update>[1]) => Promise<void>
  remove: (postId: string) => Promise<void>
  toggleLike: (postId: string) => Promise<void>
}

export const useCommunityStore = create<CommunityState>((set, get) => ({
  posts: [],
  currentPost: null,
  userPosts: [],
  cursor: null,
  hasMore: true,
  loading: false,

  fetchPosts: async (reset = false) => {
    if (get().loading) return
    if (!reset && !get().hasMore) return
    try {
      set({ loading: true })
      const cursor = reset ? null : get().cursor
      const res = await postsApi.getList({ cursor: cursor || undefined })
      set({
        posts: reset ? res.posts : [...get().posts, ...res.posts],
        cursor: res.nextCursor,
        hasMore: res.hasMore,
      })
    } finally {
      set({ loading: false })
    }
  },

  fetchUserPosts: async (userId, reset = false) => {
    if (get().loading) return
    if (!reset && !get().hasMore) return
    try {
      set({ loading: true })
      const cursor = reset ? null : get().cursor
      const res = await postsApi.getUserPosts(userId, { cursor: cursor || undefined })
      set({
        userPosts: reset ? res.posts : [...get().userPosts, ...res.posts],
        cursor: res.nextCursor,
        hasMore: res.hasMore,
      })
    } finally {
      set({ loading: false })
    }
  },

  fetchById: async (postId) => {
    try {
      set({ loading: true })
      const res = await postsApi.getById(postId)
      set({ currentPost: res.post })
    } finally {
      set({ loading: false })
    }
  },

  create: async (data) => {
    const res = await postsApi.create(data)
    return res.postId
  },

  update: async (postId, data) => {
    await postsApi.update(postId, data)
  },

  remove: async (postId) => {
    await postsApi.delete(postId)
    set({ posts: get().posts.filter((p) => p.postId !== postId) })
  },

  toggleLike: async (postId) => {
    const res = await likesApi.toggle(postId)
    set({
      posts: get().posts.map((p) =>
        p.postId === postId ? { ...p, isLiked: res.isLiked, likesCount: res.likesCount } : p,
      ),
      currentPost: get().currentPost?.postId === postId
        ? { ...get().currentPost!, isLiked: res.isLiked, likesCount: res.likesCount }
        : get().currentPost,
    })
  },
}))
