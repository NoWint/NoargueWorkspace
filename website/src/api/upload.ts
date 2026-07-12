import http from './request'

export const uploadApi = {
  /** 上传头像到后端 /upload/avatar */
  uploadAvatar: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return http.post<{ url: string }>('/upload/avatar', form)
  },
  /** 上传待办图片到第三方图床 img.scdn.io */
  uploadTodoImage: async (file: File): Promise<string> => {
    const form = new FormData()
    form.append('image', file)
    const res = await fetch('https://img.scdn.io/api/v1.php', {
      method: 'POST',
      body: form,
    })
    const data = await res.json()
    if (!data.url) throw new Error(data.error || '图片上传失败')
    return data.url as string
  },
}
