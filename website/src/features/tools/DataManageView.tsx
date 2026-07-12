import { useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { message, Popconfirm } from 'antd'
import type { Todo } from '@/types'
import { Card, Eyebrow } from '@/design/primitives'
import { UploadIcon, CheckIcon } from '@/design/icons'
import { useTodoStore } from '@/stores/todos'
import styles from './DataManageView.module.css'

interface ExportPayload {
  version: number
  exportedAt: number
  todos: Todo[]
}

export function DataManageView() {
  const { todos, createTodo } = useTodoStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<Todo[] | null>(null)
  const [previewName, setPreviewName] = useState('')
  const [importing, setImporting] = useState(false)

  const activeTodos = useMemo(() => todos.filter((t) => !t.isDeleted), [todos])

  const handleExport = () => {
    const payload: ExportPayload = {
      version: 1,
      exportedAt: Date.now(),
      todos: activeTodos,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `todos-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    message.success(`已导出 ${activeTodos.length} 条待办`)
  }

  const handleFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result)) as ExportPayload
        if (!data || typeof data !== 'object' || !Array.isArray(data.todos)) {
          message.error('文件格式不正确：缺少 todos 数组')
          return
        }
        setPreview(data.todos)
        setPreviewName(file.name)
        message.success(`已读取 ${data.todos.length} 条待办，请确认导入`)
      } catch {
        message.error('JSON 解析失败，请检查文件')
      }
    }
    reader.onerror = () => message.error('文件读取失败')
    reader.readAsText(file)
  }

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
    e.target.value = ''
  }

  const handleImport = async () => {
    if (!preview) return
    setImporting(true)
    let ok = 0
    for (const t of preview) {
      try {
        await createTodo({
          text: t.text || '导入的待办',
          setDate: t.setDate,
          setTime: t.setTime,
          remarks: t.remarks,
          isStar: !!t.isStar,
          tags: t.tags,
        })
        ok++
      } catch {
        // continue
      }
    }
    setImporting(false)
    setPreview(null)
    setPreviewName('')
    message.success(`已导入 ${ok} 条待办`)
  }

  const cancelPreview = () => {
    setPreview(null)
    setPreviewName('')
  }

  return (
    <div className={styles.screen}>
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.hdRow}>
            <div className={styles.hdIc}><UploadIcon /></div>
            <div>
              <Eyebrow>TOOLS</Eyebrow>
              <h1 className={styles.title}>数据管理 <span className={styles.song}>备份</span></h1>
            </div>
          </div>
          <div className={styles.meta}>
            <span>当前 {activeTodos.length} 条待办</span>
          </div>
        </div>
      </div>

      <Card>
        <div className={styles.secHead}>
          <div className={styles.secHeadL}>
            <div className={styles.hdIc}><UploadIcon /></div>
            <div>
              <Eyebrow>EXPORT</Eyebrow>
              <h3 className={styles.secTitle}>导出待办</h3>
            </div>
          </div>
        </div>
        <p className={styles.desc}>将全部未删除的待办导出为 JSON 文件，可用于备份或迁移。</p>
        <button type="button" className={styles.exportBtn} onClick={handleExport}>
          <UploadIcon className={styles.btnIcon} />
          导出全部 ({activeTodos.length})
        </button>
      </Card>

      <Card>
        <div className={styles.secHead}>
          <div className={styles.secHeadL}>
            <div className={styles.hdIc}><UploadIcon /></div>
            <div>
              <Eyebrow>IMPORT</Eyebrow>
              <h3 className={styles.secTitle}>导入待办</h3>
            </div>
          </div>
        </div>
        <p className={styles.desc}>上传 JSON 文件导入待办。导入时会创建新待办，不会覆盖现有数据。</p>

        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className={styles.fileInput}
          onChange={onInputChange}
        />
        <button
          type="button"
          className={styles.importBtn}
          onClick={() => fileRef.current?.click()}
        >
          选择 JSON 文件
        </button>

        {preview && (
          <div className={styles.preview}>
            <div className={styles.previewHead}>
              <div className={styles.previewInfo}>
                <CheckIcon className={styles.previewIcon} />
                <span className={styles.previewName}>{previewName}</span>
                <span className={styles.previewCount}>将导入 {preview.length} 条</span>
              </div>
            </div>
            <div className={styles.previewList}>
              {preview.slice(0, 8).map((t, i) => (
                <div key={i} className={styles.previewItem}>
                  <span className={styles.previewText}>{t.text || '（无标题）'}</span>
                  {t.setDate && <span className={styles.previewDate}>{t.setDate}</span>}
                </div>
              ))}
              {preview.length > 8 && (
                <div className={styles.previewMore}>还有 {preview.length - 8} 条…</div>
              )}
            </div>
            <div className={styles.previewActions}>
              <button type="button" className={styles.cancelBtn} onClick={cancelPreview} disabled={importing}>
                取消
              </button>
              <Popconfirm
                title="确认导入"
                description={`将创建 ${preview.length} 条新待办，是否继续？`}
                okText="确认导入"
                cancelText="取消"
                onConfirm={handleImport}
                disabled={importing}
              >
                <button type="button" className={styles.confirmBtn} disabled={importing}>
                  {importing ? '导入中…' : '确认导入'}
                </button>
              </Popconfirm>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
