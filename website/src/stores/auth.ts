import { create } from 'zustand'
import type { User } from '@/types'
import { authApi } from '@/api/auth'

interface AuthState {
  token: string | null
  user: User | null
  loading: boolean
  isLoggedIn: boolean
  saveToken: (t: string) => void
  clearAuth: () => void
  fetchUserInfo: () => Promise<void>
  loginByQrCode: () => Promise<{ sceneId: string; qrcodeUrl: string; expiresAt: number }>
  pollQrCodeStatus: (
    sceneId: string,
    onStatusChange?: (status: string) => void,
  ) => { stop: () => void; promise: Promise<void> }
  logout: () => void
  updateProfile: (data: { nickname?: string; avatarUrl?: string }) => Promise<unknown>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem('authToken'),
  user: null,
  loading: false,
  isLoggedIn: !!localStorage.getItem('authToken'),

  saveToken: (t) => {
    localStorage.setItem('authToken', t)
    set({ token: t, isLoggedIn: true })
  },

  clearAuth: () => {
    localStorage.removeItem('authToken')
    set({ token: null, user: null, isLoggedIn: false })
  },

  fetchUserInfo: async () => {
    if (!get().token) return
    try {
      set({ loading: true })
      const res = await authApi.getUserInfo()
      if (res.success && res.user) {
        set({ user: res.user })
      }
    } finally {
      set({ loading: false })
    }
  },

  loginByQrCode: async () => {
    const res = await authApi.generateQrCode()
    if (!res.success || !res.data) throw new Error('生成二维码失败')
    return res.data
  },

  pollQrCodeStatus: (sceneId, onStatusChange) => {
    let stopped = false
    let timerId: ReturnType<typeof setTimeout> | null = null
    const POLL_INTERVAL = 2000
    const MAX_DURATION = 5 * 60 * 1000
    const startTime = Date.now()

    const promise = new Promise<void>((resolve, reject) => {
      const poll = async () => {
        if (stopped) return
        if (Date.now() - startTime > MAX_DURATION) {
          reject(new Error('expired'))
          return
        }
        try {
          const res = await authApi.getQrCodeStatus(sceneId)
          if (!res.success) {
            timerId = setTimeout(poll, POLL_INTERVAL)
            return
          }
          switch (res.status) {
            case 'waiting':
              timerId = setTimeout(poll, POLL_INTERVAL)
              break
            case 'scanned':
              onStatusChange?.('scanned')
              timerId = setTimeout(poll, POLL_INTERVAL)
              break
            case 'confirmed':
              if (res.token && res.user) {
                get().saveToken(res.token)
                set({ user: res.user })
                resolve()
              } else {
                reject(new Error('登录失败：未获取到用户信息'))
              }
              break
            case 'expired':
              reject(new Error('expired'))
              break
            default:
              timerId = setTimeout(poll, POLL_INTERVAL)
          }
        } catch {
          timerId = setTimeout(poll, POLL_INTERVAL)
        }
      }
      poll()
    })

    return {
      stop: () => {
        stopped = true
        if (timerId !== null) clearTimeout(timerId)
      },
      promise,
    }
  },

  logout: () => {
    get().clearAuth()
    window.location.href = '/login'
  },

  updateProfile: async (data) => {
    const res = await authApi.updateUserInfo(data)
    if (res.success && get().user) {
      set({
        user: {
          ...get().user!,
          nickname: data.nickname ?? get().user!.nickname,
          avatarUrl: data.avatarUrl ?? get().user!.avatarUrl,
        },
      })
    }
    return res
  },
}))

// Auto-fetch user info if token exists (call once on app init)
if (localStorage.getItem('authToken')) {
  useAuthStore.getState().fetchUserInfo()
}
