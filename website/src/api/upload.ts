import http from './request'

export const uploadApi = {
  /** 上传头像到后端 /upload/avatar（spec 11.1，最大 2MB） */
  uploadAvatar: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return http.post<{ success: boolean; url?: string; avatarUrl?: string; message?: string }>('/upload/avatar', form)
  },
  /**
   * 上传待办图片到后端 /upload/image（spec 11.2，最大 10MB）
   * 返回可直接使用的图片 URL
   */
  uploadTodoImage: async (file: File): Promise<string> => {
    const form = new FormData()
    form.append('file', file)
    const res = await http.post<{ success: boolean; url?: string; message?: string }>('/upload/image', form)
    if (!res.url) throw new Error(res.message || '图片上传失败')
    return res.url
  },
}
