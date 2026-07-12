import http from './request'
import type { ApiResponse, LoginResponse, UserInfoResponse, QrCodeStatusResponse } from '@/types'

export const authApi = {
  login: (code: string) =>
    http.post<LoginResponse>('/auth/login', { code }),

  getUserInfo: () =>
    http.get<UserInfoResponse>('/auth/userInfo'),

  updateUserInfo: (data: { nickname?: string; avatarUrl?: string }) =>
    http.post<{ success: boolean; message?: string }>('/auth/updateUserInfo', data),

  generateQrCode: () =>
    http.post<ApiResponse<{ sceneId: string; qrcodeUrl: string; expiresAt: number }>>('/auth/qrcode/generate'),

  getQrCodeStatus: (sceneId: string) =>
    http.get<QrCodeStatusResponse>('/auth/qrcode/status', { params: { sceneId } }),

  confirmQrCodeLogin: (sceneId: string) =>
    http.post<{ success: boolean; message?: string }>('/auth/qrcode/confirm', { sceneId }),
}
