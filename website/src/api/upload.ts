import http from './request'
import type { PostFile } from './posts'

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
  /**
   * 上传社区帖子图片到 img.scdn.io（spec 11.4）
   * 字段名 `image`，响应格式 `{ data: { url } }` 或 `{ url }`
   * 失败自动重试，最多 3 次（间隔递增）
   */
  uploadPostImage: async (file: File, retryCount = 0): Promise<string> => {
    const form = new FormData()
    form.append('image', file)
    try {
      const resp = await fetch('https://img.scdn.io/api/v1.php', {
        method: 'POST',
        body: form,
      })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const data = (await resp.json()) as { data?: { url?: string }; url?: string }
      const url = data?.data?.url ?? data?.url ?? null
      if (!url) throw new Error('上传返回URL异常')
      return url
    } catch (err) {
      if (retryCount < 3) {
        await new Promise((r) => setTimeout(r, 1000 * (retryCount + 1)))
        return uploadApi.uploadPostImage(file, retryCount + 1)
      }
      throw err instanceof Error ? err : new Error('图片上传失败')
    }
  },

  // ===== 文件上传（storage.to，spec 7.4 帖子附件） =====

  /** 生成 visitor token，用于 storage.to 的文件上传/确认 */
  generateVisitorToken: () => {
    return 'visitor_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8)
  },

  /** 第一步：初始化文件上传，向 storage.to 申请预签名 URL */
  initFileUpload: async (params: {
    filename: string
    contentType: string
    size: number
    visitorToken: string
  }): Promise<{ success: boolean; upload_url: string; r2_key: string }> => {
    const resp = await fetch('https://storage.to/api/upload/init', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Visitor-Token': params.visitorToken,
      },
      body: JSON.stringify({
        filename: params.filename,
        content_type: params.contentType,
        size: params.size,
      }),
    })
    const data = (await resp.json()) as { success?: boolean; upload_url?: string; r2_key?: string; error?: string }
    if (!data.success || !data.upload_url || !data.r2_key) {
      throw new Error(data.error || '初始化上传失败')
    }
    return { success: true, upload_url: data.upload_url, r2_key: data.r2_key }
  },

  /** 第二步：通过后端代理 /upload/proxy 上传文件到 R2（避免浏览器 CORS 限制） */
  uploadToR2: async (uploadUrl: string, file: File): Promise<void> => {
    const form = new FormData()
    form.append('file', file)
    form.append('uploadUrl', uploadUrl)
    const resp = await http.post<{ success?: boolean; message?: string }>('/upload/proxy', form)
    if (!resp.success) {
      throw new Error(resp.message || '文件上传到 R2 失败')
    }
  },

  /** 第三步：确认上传完成，获取可分享的文件 URL */
  confirmFileUpload: async (params: {
    filename: string
    size: number
    contentType: string
    r2Key: string
    visitorToken: string
  }): Promise<{
    success: boolean
    file: { id: string; url: string; raw_url: string; human_size: string; expires_at: string }
    owner_token: string
  }> => {
    const resp = await fetch('https://storage.to/api/upload/confirm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Visitor-Token': params.visitorToken,
      },
      body: JSON.stringify({
        filename: params.filename,
        size: params.size,
        content_type: params.contentType,
        r2_key: params.r2Key,
      }),
    })
    const data = (await resp.json()) as {
      success?: boolean
      error?: string
      file?: { id: string; url: string; raw_url: string; human_size: string; expires_at: string }
      owner_token?: string
    }
    if (!data.success || !data.file || !data.owner_token) {
      throw new Error(data.error || '确认上传失败')
    }
    return { success: true, file: data.file, owner_token: data.owner_token }
  },

  /**
   * 完整的帖子文件上传流程：init → upload to R2 → confirm
   * 返回符合 PostFile 结构的对象（可直接传给 postsApi.create/update）
   */
  uploadPostFile: async (file: File, visitorToken: string): Promise<PostFile> => {
    const contentType = file.type || 'application/octet-stream'
    const initResult = await uploadApi.initFileUpload({
      filename: file.name,
      contentType,
      size: file.size,
      visitorToken,
    })
    await uploadApi.uploadToR2(initResult.upload_url, file)
    const confirmResult = await uploadApi.confirmFileUpload({
      filename: file.name,
      size: file.size,
      contentType,
      r2Key: initResult.r2_key,
      visitorToken,
    })
    return {
      id: confirmResult.file.id,
      url: confirmResult.file.url,
      raw_url: confirmResult.file.raw_url,
      filename: file.name,
      size: file.size,
      human_size: confirmResult.file.human_size,
      content_type: contentType,
      expires_at: confirmResult.file.expires_at,
      owner_token: confirmResult.owner_token,
    }
  },
}
