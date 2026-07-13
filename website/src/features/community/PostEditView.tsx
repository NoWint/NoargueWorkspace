import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Input, message } from 'antd'
import type { CreatePollRequest, Post, PostFile } from '@/api/posts'
import { postsApi } from '@/api/posts'
import { uploadApi } from '@/api/upload'
import { useCommunityStore } from '@/stores/community'
import { useTodoStore } from '@/stores/todos'
import { useComboStore } from '@/stores/combos'
import { Button, Card, Eyebrow } from '@/design/primitives'
import { CheckIcon, LocationIcon, PlusIcon, TrashIcon, UploadIcon } from '@/design/icons'
import { cn } from '@/lib/utils'
import { ImageUploader } from '@/features/todo/ImageUploader'
import { PollEditor } from './PollEditor'
import styles from './PostEditView.module.css'

const TITLE_MAX_LENGTH = 100
const BODY_MAX_LENGTH = 10000
const FILE_MAX_COUNT = 9

/** 根据文件名/MIME 推断文件类型短标签（用于列表展示） */
function getFileTypeLabel(contentType: string, filename: string): string {
  const ct = (contentType || '').toLowerCase()
  const ext = filename ? filename.split('.').pop()?.toLowerCase() || '' : ''
  if (ct.includes('pdf') || ext === 'pdf') return 'PDF'
  if (ct.includes('word') || ['doc', 'docx'].includes(ext)) return 'DOC'
  if (ct.includes('excel') || ct.includes('spreadsheet') || ['xls', 'xlsx', 'csv'].includes(ext)) return 'XLS'
  if (ct.includes('powerpoint') || ct.includes('presentation') || ['ppt', 'pptx'].includes(ext)) return 'PPT'
  if (ct.includes('zip') || ['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'ZIP'
  if (ct.includes('image') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) return 'IMG'
  if (ct.includes('video') || ['mp4', 'avi', 'mov', 'mkv', 'flv', 'wmv'].includes(ext)) return 'VID'
  if (ct.includes('audio') || ['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(ext)) return 'AUD'
  if (ct.includes('json') || ext === 'json') return 'JSON'
  if (ct.includes('text/plain') || ext === 'txt') return 'TXT'
  if (ct.includes('text/html') || ext === 'html') return 'HTML'
  return ext ? ext.toUpperCase().slice(0, 4) : 'FILE'
}

export function PostEditView() {
  const { postId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isEdit = !!postId

  const { create, update, fetchById, currentPost } = useCommunityStore()
  const { todos, fetchTodos } = useTodoStore()
  const { combos, fetchCombos } = useComboStore()

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [files, setFiles] = useState<PostFile[]>([])
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [todoIds, setTodoIds] = useState<number[]>([])
  // Read comboId from URL query param (e.g. /community/new?comboId=5)
  const [comboId, setComboId] = useState<number | null>(() => {
    const param = searchParams.get('comboId')
    return param ? Number(param) : null
  })
  const [locName, setLocName] = useState('')
  const [locAddress, setLocAddress] = useState('')
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [showPollEditor, setShowPollEditor] = useState(false)
  const [pollData, setPollData] = useState<CreatePollRequest | null>(null)

  /** storage.to 文件上传所需的 visitor token（每个编辑会话生成一次） */
  const visitorTokenRef = useRef<string>('')
  useEffect(() => {
    visitorTokenRef.current = uploadApi.generateVisitorToken()
  }, [])

  /** 标记是否有未保存的变更（用于离开警告） */
  const dirtyRef = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const setDirty = (v: boolean) => {
    dirtyRef.current = v
  }

  useEffect(() => {
    fetchTodos()
    fetchCombos()
  }, [fetchTodos, fetchCombos])

  /** 离开页面时如果有未保存变更，提示用户 */
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  useEffect(() => {
    if (!isEdit || !postId) return
    fetchById(postId)
      .then(() => setLoaded(true))
      .catch((e) => {
        message.error((e as Error).message || '加载失败')
        setLoaded(true)
      })
  }, [isEdit, postId, fetchById])

  useEffect(() => {
    if (!isEdit || !currentPost) return
    setTitle(currentPost.title || '')
    setBody(currentPost.body || '')
    setImages(currentPost.images || [])
    setFiles(currentPost.files || [])
    setTodoIds(currentPost.todoIds || [])
    setComboId(currentPost.comboId ?? null)
    if (currentPost.location) {
      setLocName(currentPost.location.name || '')
      setLocAddress(currentPost.location.address || '')
    }
    setDirty(false)
  }, [isEdit, currentPost])

  /** 包装 setter，自动标记 dirty */
  const updateTitle = (v: string) => { setTitle(v); setDirty(true) }
  const updateBody = (v: string) => { setBody(v); setDirty(true) }
  const updateLocName = (v: string) => { setLocName(v); setDirty(true) }
  const updateLocAddress = (v: string) => { setLocAddress(v); setDirty(true) }
  const updateImages = (v: string[]) => { setImages(v); setDirty(true) }
  const updateFiles = (next: PostFile[]) => { setFiles(next); setDirty(true) }
  const updateTodoIds = (next: number[]) => { setTodoIds(next); setDirty(true) }
  const updateComboId = (v: number | null) => { setComboId(v); setDirty(true) }

  const availableTodos = useMemo(
    () => todos.filter((t) => !t.isDeleted),
    [todos],
  )

  const handleToggleTodo = (id: string) => {
    const numId = Number(id)
    if (Number.isNaN(numId)) return
    const next = todoIds.includes(numId)
      ? todoIds.filter((x) => x !== numId)
      : [...todoIds, numId]
    updateTodoIds(next)
  }

  const buildLocation = (): Post['location'] | undefined => {
    if (!locName.trim() && !locAddress.trim()) return undefined
    const loc: NonNullable<Post['location']> = {
      name: locName.trim(),
    }
    if (locAddress.trim()) {
      loc.address = locAddress.trim()
    }
    return loc
  }

  /** 选择文件并依次上传到 storage.to */
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])
    e.target.value = '' // reset for re-select
    if (selected.length === 0) return

    const remaining = FILE_MAX_COUNT - files.length
    if (remaining <= 0) {
      message.warning(`最多上传 ${FILE_MAX_COUNT} 个文件`)
      return
    }
    const toUpload = selected.slice(0, remaining)
    setUploadingFiles(true)
    const uploaded: PostFile[] = []
    for (let i = 0; i < toUpload.length; i++) {
      try {
        const fileMeta = await uploadApi.uploadPostFile(
          toUpload[i],
          visitorTokenRef.current || uploadApi.generateVisitorToken(),
        )
        uploaded.push(fileMeta)
        updateFiles([...files, ...uploaded])
      } catch (err) {
        message.error(`"${toUpload[i].name}" 上传失败：${err instanceof Error ? err.message : '未知错误'}`)
      }
    }
    setUploadingFiles(false)
  }

  /** 删除已上传文件（仅从列表移除，不调用 storage.to 删除接口） */
  const handleFileRemove = (idx: number) => {
    const next = files.filter((_, i) => i !== idx)
    updateFiles(next)
  }

  /** 打开已上传文件（图片直接新窗口预览，其他下载 raw_url） */
  const handleFileOpen = (file: PostFile) => {
    const url = file.raw_url || file.url
    if (url) window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleSave = async () => {
    if (!title.trim()) {
      message.warning('请输入标题')
      return
    }
    if (body.length > BODY_MAX_LENGTH) {
      message.warning(`正文不能超过 ${BODY_MAX_LENGTH} 字`)
      return
    }
    if (showPollEditor && !pollData) {
      message.warning('请完善投票信息（标题 + 至少 2 个选项）')
      return
    }
    setSaving(true)
    try {
      const location = buildLocation()
      let targetPostId = ''
      if (isEdit && postId) {
        await update(postId, {
          title: title.trim(),
          body,
          images,
          files,
          todoIds,
          location,
        })
        targetPostId = postId
        message.success('已更新')
      } else {
        targetPostId = `post_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 8)}`
        await create({
          postId: targetPostId,
          title: title.trim(),
          body,
          images,
          files,
          todoIds,
          comboId: comboId ?? undefined,
          location,
        })
        message.success('已发布')
      }
      // 创建投票（仅当原本没有投票且用户填写了投票数据）
      if (pollData && !currentPost?.poll) {
        try {
          await postsApi.createPoll(targetPostId, pollData)
        } catch (e) {
          message.error((e as Error).message || '投票创建失败')
        }
      }
      setDirty(false)
      navigate(`/community/${targetPostId}`)
    } catch (e) {
      message.error((e as Error).message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  if (isEdit && !currentPost && !loaded) {
    return (
      <div className={styles.screen}>
        <Card>
          <div className={styles.skeleton}>
            <div className={styles.skLine} style={{ width: '40%', height: '12px' }} />
            <div className={styles.skLine} style={{ width: '90%', height: '20px' }} />
            <div className={styles.skLine} style={{ width: '95%' }} />
            <div className={styles.skLine} style={{ width: '80%' }} />
            <div className={styles.skLine} style={{ width: '60%' }} />
          </div>
        </Card>
      </div>
    )
  }

  if (isEdit && !currentPost && loaded) {
    return (
      <div className={styles.screen}>
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>
            <PlusIcon />
          </div>
          <div className={styles.emptyTitle}>未找到该帖子</div>
          <div className={styles.emptySub}>可能已被删除或不存在</div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.screen}>
      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.hdRow}>
            <div className={styles.hdIc}>
              <PlusIcon />
            </div>
            <div>
              <Eyebrow>{isEdit ? 'EDIT' : 'NEW'}</Eyebrow>
              <h1 className={styles.title}>
                {isEdit ? '编辑' : '发布'}
                <span className={styles.song}> 动态</span>
              </h1>
            </div>
          </div>
        </div>
        <div className={styles.actions}>
          <Button variant="gh" size="sm" onClick={() => navigate(-1)}>
            ← 返回
          </Button>
          <Button
            variant="pri"
            size="sm"
            icon={<CheckIcon className={styles.btnIcon} />}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? '保存中' : isEdit ? '保存' : '发布'}
          </Button>
        </div>
      </div>

      {/* Title + body */}
      <Card>
        <div className={styles.fieldGroup}>
          <div className={styles.fieldLabel}>标题</div>
          <Input
            value={title}
            onChange={(e) => updateTitle(e.target.value)}
            placeholder="帖子标题"
            maxLength={TITLE_MAX_LENGTH}
            showCount
            className={styles.input}
          />
        </div>
        <div className={styles.fieldGroup}>
          <div className={styles.fieldLabel}>正文</div>
          <Input.TextArea
            value={body}
            onChange={(e) => updateBody(e.target.value)}
            autoSize={{ minRows: 5, maxRows: 20 }}
            placeholder="分享你的想法..."
            maxLength={BODY_MAX_LENGTH}
            showCount
            className={styles.textarea}
          />
        </div>
      </Card>

      {/* Images */}
      <Card>
        <div className={styles.fieldGroup}>
          <div className={styles.fieldLabel}>图片</div>
          <ImageUploader images={images} onChange={updateImages} max={9} mode="post" />
        </div>
      </Card>

      {/* Files */}
      <Card>
        <div className={styles.fieldGroup}>
          <div className={styles.fieldLabel}>附件文件（选填，最多 {FILE_MAX_COUNT} 个）</div>
          {files.length > 0 && (
            <div className={styles.fileList}>
              {files.map((f, idx) => (
                <div key={f.id || idx} className={styles.fileItem}>
                  <button
                    type="button"
                    className={styles.fileIcon}
                    onClick={() => handleFileOpen(f)}
                    title="打开文件"
                  >
                    {getFileTypeLabel(f.content_type, f.filename)}
                  </button>
                  <div className={styles.fileMeta}>
                    <button
                      type="button"
                      className={styles.fileName}
                      onClick={() => handleFileOpen(f)}
                      title={f.filename}
                    >
                      {f.filename}
                    </button>
                    <div className={styles.fileSub}>
                      <span>{f.human_size || `${(f.size / 1024).toFixed(1)} KB`}</span>
                      {f.expires_at && (
                        <span className={styles.fileExpires}>
                          · 有效期至 {new Date(f.expires_at).toLocaleDateString('zh-CN')}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className={styles.fileRemove}
                    onClick={() => handleFileRemove(idx)}
                    title="移除文件"
                  >
                    <TrashIcon />
                  </button>
                </div>
              ))}
            </div>
          )}
          {uploadingFiles && (
            <div className={styles.fileUploading}>
              <UploadIcon className={styles.fileUploadingIcon} />
              <span>正在上传文件...</span>
            </div>
          )}
          {files.length < FILE_MAX_COUNT && (
            <button
              type="button"
              className={styles.fileAddBtn}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFiles}
            >
              <PlusIcon className={styles.fileAddIcon} />
              添加文件
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className={styles.fileInputHidden}
            onChange={handleFileSelect}
          />
        </div>
      </Card>

      {/* Location */}
      <Card>
        <div className={styles.fieldGroup}>
          <div className={styles.fieldLabel}>位置（选填）</div>
          <div className={styles.locRow}>
            <Input
              value={locName}
              onChange={(e) => updateLocName(e.target.value)}
              placeholder="位置名称"
              className={styles.input}
              prefix={<LocationIcon className={styles.locIcon} />}
            />
            <Input
              value={locAddress}
              onChange={(e) => updateLocAddress(e.target.value)}
              placeholder="详细地址"
              className={styles.input}
            />
          </div>
        </div>
      </Card>

      {/* Combo (create mode only) */}
      {!isEdit && (
        <Card>
          <div className={styles.fieldGroup}>
            <div className={styles.fieldLabel}>关联组合（选填）</div>
            <div className={styles.chips}>
              <button
                type="button"
                className={cn(styles.chipBtn, !comboId && styles.chipAct)}
                onClick={() => updateComboId(null)}
              >
                无
              </button>
              {combos.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={cn(
                    styles.chipBtn,
                    comboId === c.id && styles.chipAct,
                  )}
                  onClick={() => updateComboId(c.id)}
                >
                  <span
                    className={styles.chipDot}
                    style={{ background: c.color }}
                  />
                  {c.name}
                </button>
              ))}
              {combos.length === 0 && (
                <span className={styles.emptyHint}>暂无组合</span>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Related todos */}
      <Card>
        <div className={styles.fieldGroup}>
          <div className={styles.fieldLabel}>关联待办（选填）</div>
          <div className={styles.todoList}>
            {availableTodos.length === 0 && (
              <span className={styles.emptyHint}>暂无待办</span>
            )}
            {availableTodos.map((t) => {
              const active = todoIds.includes(Number(t.id))
              return (
                <button
                  key={t.id}
                  type="button"
                  className={cn(styles.todoItem, active && styles.todoAct)}
                  onClick={() => handleToggleTodo(t.id)}
                  title={t.text}
                >
                  <span className={styles.todoCheck}>
                    {active && <CheckIcon className={styles.todoCheckIcon} />}
                  </span>
                  <span className={styles.todoText}>{t.text}</span>
                </button>
              )
            })}
          </div>
        </div>
      </Card>

      {/* Poll */}
      <Card>
        {isEdit && currentPost?.poll ? (
          <div className={styles.fieldGroup}>
            <div className={styles.pollReadOnlyHead}>
              <span className={styles.fieldLabel}>投票（已创建，不可编辑）</span>
            </div>
            <div className={styles.pollROTitle}>{currentPost.poll.title}</div>
            <div className={styles.pollROMeta}>
              {currentPost.poll.type === 1 ? '单选' : '多选'}
              {currentPost.poll.isAnonymous ? ' · 匿名' : ''}
              {currentPost.poll.allowOther ? ' · 允许其他' : ''}
              {` · ${currentPost.poll.options.length} 个选项`}
              {currentPost.poll.totalVotes > 0
                ? ` · ${currentPost.poll.totalVotes} 人参与`
                : ''}
              {currentPost.poll.isEnded ? ' · 已结束' : ''}
            </div>
          </div>
        ) : showPollEditor ? (
          <div className={styles.fieldGroup}>
            <div className={styles.pollEditorHead}>
              <span className={styles.fieldLabel}>投票</span>
              <button
                type="button"
                className={styles.pollRemoveBtn}
                onClick={() => {
                  setShowPollEditor(false)
                  setPollData(null)
                }}
              >
                移除投票
              </button>
            </div>
            <PollEditor onChange={setPollData} />
          </div>
        ) : (
          <div className={styles.fieldGroup}>
            <div className={styles.fieldLabel}>投票（选填）</div>
            <button
              type="button"
              className={styles.addPollBtn}
              onClick={() => setShowPollEditor(true)}
            >
              <PlusIcon className={styles.addPollIcon} />
              添加投票
            </button>
          </div>
        )}
      </Card>
    </div>
  )
}
