import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Popconfirm, message } from 'antd'
import type { Todo } from '@/types'
import { todosApi } from '@/api/todos'
import { useTodoStore } from '@/stores/todos'
import { useComboStore } from '@/stores/combos'
import { useTagStore } from '@/stores/tags'
import {
  Button,
  Card,
  Eyebrow,
  ListLine,
  StatusChip,
  Tag,
} from '@/design/primitives'
import {
  CheckIcon,
  StarIcon,
  TrashIcon,
  ClockIcon,
  TagIcon,
} from '@/design/icons'
import { cn } from '@/lib/utils'
import styles from './TodoDetail.module.css'

function comboBorder(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return 'var(--border)'
  const n = parseInt(m[1], 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, 0.3)`
}

function formatTimestamp(ts?: number): string {
  if (!ts) return '—'
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${hh}:${mm}`
}

export function TodoDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [todo, setTodo] = useState<Todo | null>(null)
  const [loading, setLoading] = useState(true)
  const toggleComplete = useTodoStore((s) => s.toggleComplete)
  const toggleStar = useTodoStore((s) => s.toggleStar)
  const deleteTodo = useTodoStore((s) => s.deleteTodo)
  const combos = useComboStore((s) => s.combos)
  const { systemTags, userTags, fetchTags } = useTagStore()

  useEffect(() => {
    fetchTags()
    if (!id) return
    todosApi
      .getById(id)
      .then((res) => {
        if (res.success && res.todo) setTodo(res.todo)
      })
      .finally(() => setLoading(false))
  }, [id, fetchTags])

  const combo = useMemo(
    () => (todo ? combos.find((c) => c.id === todo.comboId) : undefined),
    [todo, combos],
  )

  const tagObjs = useMemo(() => {
    if (!todo?.tags || todo.tags.length === 0) return []
    const all = [...systemTags, ...userTags]
    return todo.tags
      .map((tid) => all.find((t) => t.id === tid))
      .filter((t): t is NonNullable<typeof t> => Boolean(t))
  }, [todo, systemTags, userTags])

  if (loading) {
    return (
      <div className={styles.screen}>
        <div className={styles.loading}>
          <div className={styles.loadingIcon}>
            <CheckIcon />
          </div>
          <div>加载中...</div>
        </div>
      </div>
    )
  }
  if (!todo) {
    return (
      <div className={styles.screen}>
        <div className={styles.loading}>
          <div className={styles.loadingIcon}>
            <CheckIcon />
          </div>
          <div className={styles.loadingTitle}>未找到该待办</div>
          <div className={styles.loadingSub}>可能已被删除或不存在</div>
        </div>
      </div>
    )
  }

  const isDone = !!todo.completed
  const isOverdue = (() => {
    if (!todo.setDate || isDone) return false
    const today = new Date()
    const y = today.getFullYear()
    const m = String(today.getMonth() + 1).padStart(2, '0')
    const d = String(today.getDate()).padStart(2, '0')
    return todo.setDate < `${y}-${m}-${d}`
  })()

  const statusTone: 'ok' | 'warn' | 'default' = isDone
    ? 'ok'
    : isOverdue
      ? 'warn'
      : 'default'
  const statusLabel = isDone ? '已完成' : isOverdue ? '已逾期' : '待开始'

  return (
    <div className={styles.screen}>
      {/* Header */}
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.hdRow}>
            <div className={styles.hdIc}>
              <CheckIcon />
            </div>
            <div className={styles.titleWrap}>
              <Eyebrow>DETAIL</Eyebrow>
              <h1 className={styles.title}>{todo.text}</h1>
            </div>
          </div>
        </div>
        <div className={styles.actions}>
          <Button variant="gh" size="sm" onClick={() => navigate(-1)}>
            ← 返回
          </Button>
        </div>
      </div>

      {/* Detail card */}
      <Card>
        <div className={styles.cardHead}>
          <div className={styles.cardHeadL}>
            <div className={styles.hdIc}>
              <CheckIcon />
            </div>
            <div>
              <Eyebrow>OVERVIEW</Eyebrow>
              <h3 className={styles.cardTitle}>
                待办 <span className={styles.song}>详情</span>
              </h3>
            </div>
          </div>
          <StatusChip tone={statusTone}>{statusLabel}</StatusChip>
        </div>

        <div className={styles.lines}>
          <ListLine
            left={<span className={styles.lineLabel}>状态</span>}
            right={<StatusChip tone={statusTone}>{statusLabel}</StatusChip>}
          />
          <ListLine
            left={<span className={styles.lineLabel}>日期</span>}
            right={
              <span className={styles.lineVal}>
                {todo.setDate || '未设置'}
              </span>
            }
          />
          <ListLine
            left={<span className={styles.lineLabel}>时间</span>}
            right={
              <span className={styles.lineVal}>
                {todo.setTime || '未设置'}
              </span>
            }
          />
          {combo && (
            <ListLine
              left={<span className={styles.lineLabel}>组合</span>}
              right={
                <span
                  className={styles.comboTag}
                  style={{
                    color: combo.color,
                    borderColor: comboBorder(combo.color),
                  }}
                >
                  {combo.name}
                </span>
              }
            />
          )}
          {todo.isStar && (
            <ListLine
              left={<span className={styles.lineLabel}>收藏</span>}
              right={
                <span className={styles.starVal}>
                  <StarIcon className={styles.starIcon} /> 已收藏
                </span>
              }
            />
          )}
          {todo.priority && (
            <ListLine
              left={<span className={styles.lineLabel}>优先级</span>}
              right={<Tag tone="warn">{todo.priority}</Tag>}
            />
          )}
          {tagObjs.length > 0 && (
            <ListLine
              left={<span className={styles.lineLabel}>标签</span>}
              right={
                <div className={styles.tagList}>
                  {tagObjs.map((t) => (
                    <Tag key={t.id} tone="default">
                      {t.name}
                    </Tag>
                  ))}
                </div>
              }
            />
          )}
          {todo.locationText && (
            <ListLine
              left={<span className={styles.lineLabel}>位置</span>}
              right={
                <span className={styles.lineVal}>{todo.locationText}</span>
              }
            />
          )}
          {todo.remarks && (
            <ListLine
              left={<span className={styles.lineLabel}>备注</span>}
              right={
                <span className={styles.remarks}>{todo.remarks}</span>
              }
            />
          )}
        </div>
      </Card>

      {/* Metadata card */}
      <Card>
        <div className={styles.cardHead}>
          <div className={styles.cardHeadL}>
            <div className={styles.hdIc}>
              <ClockIcon />
            </div>
            <div>
              <Eyebrow>METADATA</Eyebrow>
              <h3 className={styles.cardTitle}>
                元 <span className={styles.song}>数据</span>
              </h3>
            </div>
          </div>
        </div>
        <div className={styles.metaLines}>
          <ListLine
            left={<span className={styles.lineLabel}>创建时间</span>}
            right={
              <span className={styles.monoVal}>
                {todo.createdAt || formatTimestamp(todo.time)}
              </span>
            }
          />
          <ListLine
            left={<span className={styles.lineLabel}>更新时间</span>}
            right={
              <span className={styles.monoVal}>
                {formatTimestamp(todo.updatedAt)}
              </span>
            }
          />
          <ListLine
            left={<span className={styles.lineLabel}>版本号</span>}
            right={
              <span className={styles.monoVal}>v{todo.version || 1}</span>
            }
          />
          <ListLine
            left={<span className={styles.lineLabel}>ID</span>}
            right={<span className={styles.monoVal}>{todo.id}</span>}
          />
        </div>
      </Card>

      {/* Tags card (if any) */}
      {tagObjs.length > 0 && (
        <Card>
          <div className={styles.cardHead}>
            <div className={styles.cardHeadL}>
              <div className={styles.hdIc}>
                <TagIcon />
              </div>
              <div>
                <Eyebrow>TAGS</Eyebrow>
                <h3 className={styles.cardTitle}>
                  关联 <span className={styles.song}>标签</span>
                </h3>
              </div>
            </div>
          </div>
          <div className={styles.tagList}>
            {tagObjs.map((t) => (
              <Tag key={t.id} tone="default">
                {t.name}
              </Tag>
            ))}
          </div>
        </Card>
      )}

      {/* Action footer card */}
      <Card>
        <div className={styles.actionFooter}>
          <div className={styles.actionLeft}>
            <Button
              variant="pri"
              onClick={() => toggleComplete(todo.id).then(() => navigate('/'))}
              icon={<CheckIcon className={styles.btnIcon} />}
            >
              {isDone ? '标记未完成' : '标记完成'}
            </Button>
            <Button
              variant="sec"
              onClick={() => navigate(`/todos/${todo.id}/edit`)}
            >
              编辑
            </Button>
            <Button
              variant="gh"
              onClick={() => toggleStar(todo.id)}
              icon={<StarIcon className={cn(styles.btnIcon, styles.starBtnIcon, todo.isStar && styles.starBtnIconOn)} />}
            >
              {todo.isStar ? '取消收藏' : '收藏'}
            </Button>
          </div>
          <Popconfirm
            title="确定删除此待办吗？"
            description="删除后将进入回收站，30 天后自动清理"
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={async () => {
              await deleteTodo(todo.id)
              message.success('已删除')
              navigate('/')
            }}
          >
            <Button
              variant="gh"
              className={styles.deleteBtn}
              icon={<TrashIcon className={styles.btnIcon} />}
            >
              删除
            </Button>
          </Popconfirm>
        </div>
      </Card>
    </div>
  )
}
