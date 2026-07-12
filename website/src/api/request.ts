import axios from 'axios'
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { MessagePlugin } from 'tdesign-vue-next'

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
})

// 请求拦截器：注入 JWT
instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('authToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器：解包 + 401 处理
instance.interceptors.response.use(
  (response: AxiosResponse) => {
    return response.data
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken')
      window.location.href = '/login'
      return Promise.reject(error)
    }
    const msg = error.response?.data?.message || error.message || '网络请求失败'
    MessagePlugin.warning(msg)
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
