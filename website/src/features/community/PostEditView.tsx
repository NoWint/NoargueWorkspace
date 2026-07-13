import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Input, message } from 'antd'
import type { CreatePollRequest, Post } from '@/api/posts'
import { postsApi } from '@/api/posts'
import { useCommunityStore } from '@/stores/community'
import { useTodoStore } from '@/stores/todos'
import { useComboStore } from '@/stores/combos'
import { Button, Card, Eyebrow } from '@/design/primitives'
import { CheckIcon, LocationIcon, PlusIcon } from '@/design/icons'
import { cn } from '@/lib/utils'
import { ImageUploader } from '@/features/todo/ImageUploader'
import { PollEditor } from './PollEditor'
import styles from './PostEditView.module.css'

const TITLE_MAX_LENGTH = 100
const BODY_MAX_LENGTH = 10000

export function PostEditView() {
  const { postId } = useParams()
  const navigate = useNavigate()
  const isEdit = !!postId

  const { create, update, fetchById, currentPost } = useCommunityStore()
  const { todos, fetchTodos } = useTodoStore()
  const { combos, fetchCombos } = useComboStore()

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [todoIds, setTodoIds] = useState<number[]>([])
  const [comboId, setComboId] = useState<number | null>(null)
  const [locName, setLocName] = useState('')
  const [locAddress, setLocAddress] = useState('')
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [showPollEditor, setShowPollEditor] = useState(false)
  const [pollData, setPollData] = useState<CreatePollRequest | null>(null)

  /** 标记是否有未保存的变更（用于离开警告） */
  const dirtyRef = useRef(false)
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
          <ImageUploader images={images} onChange={updateImages} max={9} />
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
