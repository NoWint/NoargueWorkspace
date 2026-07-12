import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Input, message } from 'antd'
import type { Post } from '@/api/posts'
import { useCommunityStore } from '@/stores/community'
import { useTodoStore } from '@/stores/todos'
import { useComboStore } from '@/stores/combos'
import { Button, Card, Eyebrow } from '@/design/primitives'
import { CheckIcon, LocationIcon, PlusIcon } from '@/design/icons'
import { cn } from '@/lib/utils'
import { ImageUploader } from '@/features/todo/ImageUploader'
import styles from './PostEditView.module.css'

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

  useEffect(() => {
    fetchTodos()
    fetchCombos()
  }, [fetchTodos, fetchCombos])

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
  }, [isEdit, currentPost])

  const availableTodos = useMemo(
    () => todos.filter((t) => !t.isDeleted),
    [todos],
  )

  const handleToggleTodo = (id: string) => {
    const numId = Number(id)
    if (Number.isNaN(numId)) return
    setTodoIds((prev) =>
      prev.includes(numId) ? prev.filter((x) => x !== numId) : [...prev, numId],
    )
  }

  const buildLocation = (): Post['location'] | undefined => {
    if (!locName.trim() && !locAddress.trim()) return undefined
    return {
      name: locName.trim(),
      address: locAddress.trim(),
      latitude: 0,
      longitude: 0,
    }
  }

  const handleSave = async () => {
    if (!title.trim()) {
      message.warning('请输入标题')
      return
    }
    setSaving(true)
    try {
      const location = buildLocation()
      if (isEdit && postId) {
        await update(postId, {
          title: title.trim(),
          body,
          images,
          todoIds,
          location,
        })
        message.success('已更新')
        navigate(`/community/${postId}`)
      } else {
        const newPostId = `post_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 8)}`
        await create({
          postId: newPostId,
          title: title.trim(),
          body,
          images,
          todoIds,
          comboId: comboId ?? undefined,
          location,
        })
        message.success('已发布')
        navigate(`/community/${newPostId}`)
      }
    } catch (e) {
      message.error((e as Error).message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  if (isEdit && !currentPost && !loaded) {
    return (
      <div className={styles.screen}>
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>
            <PlusIcon />
          </div>
          <div>加载中...</div>
        </div>
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
            onChange={(e) => setTitle(e.target.value)}
            placeholder="帖子标题"
            maxLength={100}
            className={styles.input}
          />
        </div>
        <div className={styles.fieldGroup}>
          <div className={styles.fieldLabel}>正文</div>
          <Input.TextArea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            autoSize={{ minRows: 5, maxRows: 20 }}
            placeholder="分享你的想法..."
            className={styles.textarea}
          />
        </div>
      </Card>

      {/* Images */}
      <Card>
        <div className={styles.fieldGroup}>
          <div className={styles.fieldLabel}>图片</div>
          <ImageUploader images={images} onChange={setImages} max={9} />
        </div>
      </Card>

      {/* Location */}
      <Card>
        <div className={styles.fieldGroup}>
          <div className={styles.fieldLabel}>位置（选填）</div>
          <div className={styles.locRow}>
            <Input
              value={locName}
              onChange={(e) => setLocName(e.target.value)}
              placeholder="位置名称"
              className={styles.input}
              prefix={<LocationIcon className={styles.locIcon} />}
            />
            <Input
              value={locAddress}
              onChange={(e) => setLocAddress(e.target.value)}
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
                onClick={() => setComboId(null)}
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
                  onClick={() => setComboId(c.id)}
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
    </div>
  )
}
