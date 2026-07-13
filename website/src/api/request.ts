import axios from 'axios'
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { message } from 'antd'

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
})

// 防止重复 401 跳转
let isRedirecting = false

instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('authToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

instance.interceptors.response.use(
  (response: AxiosResponse) => response.data,
  (error) => {
    const status = error.response?.status

    // 401: 清除登录态并跳转（避免重复跳转）
    if (status === 401) {
      localStorage.removeItem('authToken')
      if (!isRedirecting) {
        isRedirecting = true
        // 用 replace 避免回退到需要登录的页面；加 delay 让当前事件循环完成
        setTimeout(() => {
          window.location.replace('/login')
          isRedirecting = false
        }, 0)
      }
      return Promise.reject(error)
    }

    // 网络错误 / 超时：统一提示，但避免被取消的请求也弹 toast
    if (axios.isCancel(error) || error.code === 'ERR_CANCELED') {
      return Promise.reject(error)
    }

    const msg =
      error.response?.data?.message ||
      (error.code === 'ECONNABORTED' ? '请求超时，请稍后重试' : '') ||
      error.message ||
      '网络请求失败'

    // 避免重复 toast：同一条消息 1.5s 内只弹一次
    const cacheKey = '__lastErrMsg'
    const cacheTime = (window as unknown as Record<string, unknown>)[cacheKey + '_t'] as number
    const cacheVal = (window as unknown as Record<string, unknown>)[cacheKey] as string
    const now = Date.now()
    if (cacheVal !== msg || !cacheTime || now - cacheTime > 1500) {
      ;(window as unknown as Record<string, unknown>)[cacheKey] = msg
      ;(window as unknown as Record<string, unknown>)[cacheKey + '_t'] = now
      message.error(msg)
    }

    return Promise.reject(error)
  },
)

export default instance as unknown as {
  get: <T>(url: string, config?: Record<string, unknown>) => Promise<T>
  post: <T>(url: string, data?: unknown, config?: Record<string, unknown>) => Promise<T>
  put: <T>(url: string, data?: unknown, config?: Record<string, unknown>) => Promise<T>
  delete: <T>(url: string, config?: Record<string, unknown>) => Promise<T>
  patch: <T>(url: string, data?: unknown, config?: Record<string, unknown>) => Promise<T>
}
