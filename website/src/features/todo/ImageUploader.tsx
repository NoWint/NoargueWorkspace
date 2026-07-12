import { useRef, useState } from 'react'
import { message } from 'antd'
import { uploadApi } from '@/api/upload'
import { UploadIcon } from '@/design/icons'
import styles from './ImageUploader.module.css'

interface ImageUploaderProps {
  images: string[]
  onChange: (images: string[]) => void
  max?: number
}

export function ImageUploader({ images, onChange, max = 9 }: ImageUploaderProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null)

  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const remaining = max - images.length
    if (remaining <= 0) {
      message.warning(`最多上传 ${max} 张图片`)
      return
    }

    const toUpload = files.slice(0, remaining)
    e.target.value = '' // reset for re-select

    for (let i = 0; i < toUpload.length; i++) {
      setUploadingIdx(i)
      try {
        const url = await uploadApi.uploadTodoImage(toUpload[i])
        onChange([...images, url])
      } catch (err) {
        message.error(err instanceof Error ? err.message : '图片上传失败')
      }
    }
    setUploadingIdx(null)
  }

  const handleRemove = (idx: number) => {
    const next = images.filter((_, i) => i !== idx)
    onChange(next)
  }

  const canAdd = images.length < max

  return (
    <div>
      <div className={styles.uploader}>
        {images.map((url, idx) => (
          <div key={idx} className={styles.thumb}>
            <img src={url} alt="" className={styles.thumbImg} />
            <button
              type="button"
              className={styles.thumbRemove}
              onClick={() => handleRemove(idx)}
            >
              ×
            </button>
          </div>
        ))}
        {uploadingIdx !== null && (
          <div className={styles.thumb}>
            <div className={styles.thumbUploading}>
              <UploadIcon />
            </div>
          </div>
        )}
        {canAdd && (
          <button
            type="button"
            className={styles.uploadBtn}
            onClick={() => fileRef.current?.click()}
            disabled={uploadingIdx !== null}
          >
            <UploadIcon />
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={handleSelect}
        />
      </div>
      <div className={styles.hint}>
        {images.length} / {max} 张图片
      </div>
    </div>
  )
}
