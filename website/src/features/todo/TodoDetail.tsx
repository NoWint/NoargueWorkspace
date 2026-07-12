import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Popconfirm, message, Image as AntImage, Modal, Input, DatePicker } from 'antd'
import dayjs from 'dayjs'
import type { Todo } from '@/types'
import { todosApi } from '@/api/todos'
import { useTodoStore } from '@/stores/todos'
import { useComboStore } from '@/stores/combos'
import { useTagStore } from '@/stores/tags'
import { useShareStore } from '@/stores/share'
import { useNotifyStore } from '@/stores/notify'
import {
  Button,
  Card,
  Eyebrow,
  ListLine,
  StatusChip,
  Tag,
  Toggle,
} from '@/design/primitives'
import {
  CheckIcon,
  StarIcon,
  TrashIcon,
  ClockIcon,
  TagIcon,
  ImageIcon,
  ShareIcon,
  BellIcon,
} from '@/design/icons'
import { cn } from '@/lib/utils'
import { SubtaskList } from './SubtaskList'
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
  const fetchSubtodos = useTodoStore((s) => s.fetchSubtodos)
  const combos = useComboStore((s) => s.combos)
  const { systemTags, userTags, fetchTags } = useTagStore()

  // Share store
  const snapshots = useShareStore((s) => s.snapshots)
  const visitors = useShareStore((s) => s.visitors)
  const fetchByTodo = useShareStore((s) => s.fetchByTodo)
  const createShare = useShareStore((s) => s.create)
  const revokeShare = useShareStore((s) => s.revoke)
  const fetchVisitors = useShareStore((s) => s.fetchVisitors)

  // Notify store
  const todoNotifications = useNotifyStore((s) => s.todoNotifications)
  const fetchByTodoId = useNotifyStore((s) => s.fetchByTodoId)
  const scheduleNotify = useNotifyStore((s) => s.schedule)
  const cancelNotify = useNotifyStore((s) => s.cancel)

  // Share modal state
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [visitorsModalOpen, setVisitorsModalOpen] = useState(false)
  const [creatingShare, setCreatingShare] = useState(false)
  const [shareForm, setShareForm] = useState({
    expiresAt: dayjs().add(7, 'day'),
    maxViews: 100,
    password: '',
    remark: '',
    allowCopy: false,
    trackVisitors: false,
  })

  // Notify state
  const [newNotifyTime, setNewNotifyTime] = useState<dayjs.Dayjs | null>(null)

  useEffect(() => {
    fetchTags()
    if (!id) return
    todosApi
      .getById(id)
      .then((res) => {
        if (res.success && res.todo) setTodo(res.todo)
      })
      .finally(() => setLoading(false))
    fetchSubtodos(id)
    fetchByTodo(id)
    fetchByTodoId(id)
  }, [id, fetchTags, fetchSubtodos, fetchByTodo, fetchByTodoId])

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

      {/* Subtasks card */}
      <Card>
        <div className={styles.cardHead}>
          <div className={styles.cardHeadL}>
            <div className={styles.hdIc}>
              <CheckIcon />
            </div>
            <div>
              <Eyebrow>SUBTASKS</Eyebrow>
              <h3 className={styles.cardTitle}>
                子 <span className={styles.song}>任务</span>
              </h3>
            </div>
          </div>
        </div>
        {id && <SubtaskList parentId={id} />}
      </Card>

      {/* Share snapshots card */}
      <Card>
        <div className={styles.cardHead}>
          <div className={styles.cardHeadL}>
            <div className={styles.hdIc}>
              <ShareIcon />
            </div>
            <div>
              <Eyebrow>SHARE</Eyebrow>
              <h3 className={styles.cardTitle}>
                分享 <span className={styles.song}>快照</span>
              </h3>
            </div>
          </div>
          <Button variant="gh" size="sm" onClick={() => setShareModalOpen(true)}>
            创建分享
          </Button>
        </div>
        <div className={styles.shareList}>
          {snapshots.length === 0 && (
            <div className={styles.emptyHint}>暂无分享快照</div>
          )}
          {snapshots.map((s) => (
            <div key={s.shareId} className={styles.shareItem}>
              <div className={styles.shareInfo}>
                <div className={styles.shareId}>{s.shareId.slice(0, 16)}</div>
                <div className={styles.shareMeta}>
                  过期: {dayjs(s.expiresAt).format('YYYY-MM-DD HH:mm')} · 浏览: {s.currentViews}/{s.maxViews}
                </div>
                {s.remark && <div className={styles.shareRemark}>{s.remark}</div>}
                <div className={styles.shareStatus}>
                  {s.revoked ? (
                    <StatusChip tone="warn">已撤销</StatusChip>
                  ) : (
                    <StatusChip tone="ok">活跃</StatusChip>
                  )}
                </div>
              </div>
              <div className={styles.shareActions}>
                {!s.revoked && (
                  <Popconfirm
                    title="确定撤销此分享吗？"
                    okText="撤销"
                    cancelText="取消"
                    onConfirm={async () => {
                      await revokeShare(s.shareId)
                      message.success('已撤销')
                    }}
                  >
                    <Button variant="gh" size="sm">撤销</Button>
                  </Popconfirm>
                )}
                <Button
                  variant="gh"
                  size="sm"
                  onClick={async () => {
                    await fetchVisitors(s.shareId)
                    setVisitorsModalOpen(true)
                  }}
                >
                  查看访客
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Notification card */}
      <Card>
        <div className={styles.cardHead}>
          <div className={styles.cardHeadL}>
            <div className={styles.hdIc}>
              <BellIcon />
            </div>
            <div>
              <Eyebrow>NOTIFY</Eyebrow>
              <h3 className={styles.cardTitle}>
                通知 <span className={styles.song}>设置</span>
              </h3>
            </div>
          </div>
        </div>
        <div className={styles.notifyList}>
          {(id ? todoNotifications[id] || [] : []).length === 0 && (
            <div className={styles.emptyHint}>暂无通知</div>
          )}
          {(id ? todoNotifications[id] || [] : []).map((n) => (
            <div key={n.id} className={styles.notifyItem}>
              <div className={styles.notifyInfo}>
                <span className={styles.notifyTime}>
                  {dayjs(n.notifyTime).format('YYYY-MM-DD HH:mm')}
                </span>
                <StatusChip tone={n.isSent ? 'ok' : 'default'}>
                  {n.isSent ? '已发送' : '待发送'}
                </StatusChip>
                {n.sentAt && (
                  <span className={styles.notifySent}>
                    发送于 {dayjs(n.sentAt).format('YYYY-MM-DD HH:mm')}
                  </span>
                )}
              </div>
              {!n.isSent && (
                <Popconfirm
                  title="确定取消此通知吗？"
                  okText="取消通知"
                  cancelText="保留"
                  onConfirm={async () => {
                    await cancelNotify(n.id)
                    if (id) await fetchByTodoId(id)
                    message.success('已取消')
                  }}
                >
                  <Button variant="gh" size="sm">取消</Button>
                </Popconfirm>
              )}
            </div>
          ))}
        </div>
        <div className={styles.notifyAdd}>
          <DatePicker
            showTime
            format="YYYY-MM-DD HH:mm"
            value={newNotifyTime}
            onChange={(v) => setNewNotifyTime(v)}
            className={styles.picker}
            placeholder="选择通知时间"
          />
          <Button
            variant="pri"
            size="sm"
            disabled={!newNotifyTime || !id}
            onClick={async () => {
              if (!newNotifyTime || !id) return
              await scheduleNotify(id, newNotifyTime.format('YYYY-MM-DD HH:mm'))
              setNewNotifyTime(null)
              message.success('通知已设置')
            }}
          >
            设置通知
          </Button>
        </div>
      </Card>

      {/* Image gallery card */}
      {todo.images && todo.images.length > 0 && (
        <Card>
          <div className={styles.cardHead}>
            <div className={styles.cardHeadL}>
              <div className={styles.hdIc}>
                <ImageIcon />
              </div>
              <div>
                <Eyebrow>IMAGES</Eyebrow>
                <h3 className={styles.cardTitle}>
                  图片 <span className={styles.song}>附件</span>
                </h3>
              </div>
            </div>
          </div>
          <AntImage.PreviewGroup>
            <div className={styles.gallery}>
              {todo.images.map((url, i) => (
                <AntImage
                  key={i}
                  src={url}
                  className={styles.galleryImg}
                  width="100%"
                  height="100%"
                />
              ))}
            </div>
          </AntImage.PreviewGroup>
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

      {/* Create share modal */}
      <Modal
        title="创建分享快照"
        open={shareModalOpen}
        onCancel={() => setShareModalOpen(false)}
        confirmLoading={creatingShare}
        okText="创建"
        cancelText="取消"
        onOk={async () => {
          if (!id) return
          setCreatingShare(true)
          try {
            await createShare({
              todoId: id,
              expiresAt: shareForm.expiresAt.toISOString(),
              maxViews: shareForm.maxViews,
              password: shareForm.password || undefined,
              remark: shareForm.remark || undefined,
              allowCopy: shareForm.allowCopy,
              trackVisitors: shareForm.trackVisitors,
            })
            message.success('分享已创建')
            setShareModalOpen(false)
            await fetchByTodo(id)
          } catch {
            message.error('创建失败')
          } finally {
            setCreatingShare(false)
          }
        }}
      >
        <div className={styles.shareForm}>
          <div className={styles.formRow}>
            <label className={styles.formLabel}>过期时间</label>
            <DatePicker
              showTime
              format="YYYY-MM-DD HH:mm"
              value={shareForm.expiresAt}
              onChange={(v) => v && setShareForm({ ...shareForm, expiresAt: v })}
              style={{ width: '100%' }}
              className={styles.picker}
            />
          </div>
          <div className={styles.formRow}>
            <label className={styles.formLabel}>最大浏览次数</label>
            <Input
              type="number"
              value={shareForm.maxViews}
              onChange={(e) => setShareForm({ ...shareForm, maxViews: Number(e.target.value) })}
              className={styles.input}
            />
          </div>
          <div className={styles.formRow}>
            <label className={styles.formLabel}>密码保护（可选）</label>
            <Input
              value={shareForm.password}
              onChange={(e) => setShareForm({ ...shareForm, password: e.target.value })}
              placeholder="留空则无密码"
              className={styles.input}
            />
          </div>
          <div className={styles.formRow}>
            <label className={styles.formLabel}>备注</label>
            <Input
              value={shareForm.remark}
              onChange={(e) => setShareForm({ ...shareForm, remark: e.target.value })}
              className={styles.input}
            />
          </div>
          <div className={styles.formRow}>
            <label className={styles.formLabel}>允许复制</label>
            <Toggle on={shareForm.allowCopy} onChange={(v) => setShareForm({ ...shareForm, allowCopy: v })} />
          </div>
          <div className={styles.formRow}>
            <label className={styles.formLabel}>访客追踪</label>
            <Toggle on={shareForm.trackVisitors} onChange={(v) => setShareForm({ ...shareForm, trackVisitors: v })} />
          </div>
        </div>
      </Modal>

      {/* Visitors modal */}
      <Modal
        title="访客列表"
        open={visitorsModalOpen}
        onCancel={() => setVisitorsModalOpen(false)}
        footer={null}
      >
        <div className={styles.visitorList}>
          {visitors.length === 0 && (
            <div className={styles.emptyHint}>暂无访客记录</div>
          )}
          {visitors.map((v) => (
            <div key={v.id} className={styles.visitorItem}>
              <span className={styles.visitorIp}>{v.visitorIp}</span>
              <span className={styles.visitorAction}>{v.action === 'view' ? '查看' : '添加'}</span>
              <span className={styles.visitorTime}>{dayjs(v.createdAt).format('YYYY-MM-DD HH:mm')}</span>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  )
}
