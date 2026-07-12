import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/types'
import { authApi } from '@/api/auth'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('authToken'))
  const user = ref<User | null>(null)
  const loading = ref(false)

  const isLoggedIn = computed(() => !!token.value)

  function saveToken(t: string) {
    token.value = t
    localStorage.setItem('authToken', t)
  }

  function clearAuth() {
    token.value = null
    user.value = null
    localStorage.removeItem('authToken')
  }

  async function loginByQrCode() {
    const res = await authApi.generateQrCode()
    if (!res.success || !res.data) {
      throw new Error('生成二维码失败')
    }
    return res.data
  }

  function pollQrCodeStatus(
    sceneId: string,
    onStatusChange?: (status: string) => void,
  ): { stop: () => void; promise: Promise<void> } {
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
                saveToken(res.token)
                user.value = res.user
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

    function stop() {
      stopped = true
      if (timerId !== null) clearTimeout(timerId)
    }

    return { stop, promise }
  }

  async function logout() {
    clearAuth()
    window.location.href = '/login'
  }

  async function fetchUserInfo() {
    if (!token.value) return
    try {
      loading.value = true
      const res = await authApi.getUserInfo()
      if (res.success && res.user) {
        user.value = res.user
      }
    } finally {
      loading.value = false
    }
  }

  // Token 存在时自动拉取用户信息（解决刷新后显示"未登录"）
  if (token.value) {
    fetchUserInfo()
  }

  async function updateProfile(data: { nickname?: string; avatarUrl?: string }) {
    const res = await authApi.updateUserInfo(data)
    if (res.success && user.value) {
      if (data.nickname) user.value.nickname = data.nickname
      if (data.avatarUrl) user.value.avatarUrl = data.avatarUrl
    }
    return res
  }

  return {
    token,
    user,
    loading,
    isLoggedIn,
    saveToken,
    clearAuth,
    loginByQrCode,
    pollQrCodeStatus,
    logout,
    fetchUserInfo,
    updateProfile,
  }
})
