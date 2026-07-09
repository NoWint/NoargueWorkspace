import http from './api/request'

export const uploadApi = {
  uploadImage: (file: File) => {
    const formData = new FormData()
    formData.append('image', file)
    return http.post<{ success: boolean; message?: string; url: string }>('/upload/image', formData)
  },
}
