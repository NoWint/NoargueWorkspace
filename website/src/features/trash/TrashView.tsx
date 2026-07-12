import { useEffect, useMemo, useState } from 'react'
import { Popconfirm, message } from 'antd'
import type { Todo } from '@/types'
import { useTodoStore } from '@/stores/todos'
import { Card, Eyebrow, Stat, StatusChip } from '@/design/primitives'
import {
  TrashIcon,
  CheckIcon,
  ClockIcon,
} from '@/design/icons'
import { cn, formatDate } from '@/lib/utils'
import styles from './TrashView.module.css'

const RETENTION_DAYS = 30

type Sort = 'deleted' | 'created'
const SORT_LABELS: Record<Sort, string> = {
  deleted: '删除时间',
  created: '原创建时间',
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

export function TrashView() {
  const { todos, fetchTodos, restoreTodo, permanentDelete } = useTodoStore()
  const [sort, setSort] = useState<Sort>('deleted')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetchTodos()
  }, [fetchTodos])

  const deletedTodos = useMemo(
    () => todos.filter((t) => t.isDeleted),
    [todos],
  )

  const sorted = useMemo(() => {
    const list = [...deletedTodos]
    if (sort === 'deleted') {
      list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    } else {
      list.sort((a, b) => (b.time || 0) - (a.time || 0))
    }
    return list
  }, [deletedTodos, sort])

  const daysRemaining = (t: Todo): number => {
    const deletedAt = t.updatedAt || t.time || Date.now()
    const elapsed = Math.floor((Date.now() - deletedAt) / (1000 * 60 * 60 * 24))
    return Math.max(0, RETENTION_DAYS - elapsed)
  }

  const expiringCount = useMemo(
    () => deletedTodos.filter((t) => daysRemaining(t) < 7).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deletedTodos],
  )

  const allSelected = sorted.length > 0 && selected.size === sorted.length

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(sorted.map((t) => t.id)))
    }
  }

  const handleRestore = async (id: string) => {
    try {
      await restoreTodo(id)
      message.success('已恢复')
      setSelected((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    } catch (e) {
      message.error((e as Error).message || '恢复失败')
    }
  }

  const handlePermanentDelete = async (id: string) => {
    try {
      await permanentDelete(id)
      message.success('已永久删除')
      setSelected((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    } catch (e) {
      message.error((e as Error).message || '删除失败')
    }
  }

  const handleBulkRestore = async () => {
    if (selected.size === 0) return
    setBusy(true)
    let ok = 0
    for (const id of selected) {
      try {
        await restoreTodo(id)
        ok++
      } catch {
        // continue
      }
    }
    setBusy(false)
    setSelected(new Set())
    message.success(`已恢复 ${ok} 项`)
  }

  const handleClearAll = async () => {
    setBusy(true)
    let ok = 0
    for (const t of sorted) {
      try {
        await permanentDelete(t.id)
        ok++
      } catch {
        // continue
      }
    }
    setBusy(false)
    setSelected(new Set())
    message.success(`已清空 ${ok} 项`)
  }

  return (
    <div className={styles.screen}>
      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.hdRow}>
            <div className={styles.hdIc}>
              <TrashIcon />
            </div>
            <div>
              <Eyebrow>TRASH</Eyebrow>
              <h1 className={styles.title}>
                回收站 <span className={styles.song}>暂存</span>
              </h1>
            </div>
          </div>
          <div className={styles.meta}>
            <span>{deletedTodos.length} 项已删除</span>
            <span className={styles.sep}>·</span>
            <span>保留 {RETENTION_DAYS} 天</span>
            {expiringCount > 0 && (
              <>
                <span className={styles.sep}>·</span>
                <span>{expiringCount} 项即将清除</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div className={styles.banner}>
        <ClockIcon className={styles.bannerIcon} />
        <span>已删除的待办将保留 {RETENTION_DAYS} 天，之后永久清除。可在此期间恢复或提前永久删除。</span>
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <Stat label="回收站总数" value={deletedTodos.length} delta="已删除" />
        <Stat label="已选中" value={selected.size} delta="可批量操作" />
        <Stat
          label="即将清除"
          value={expiringCount}
          delta={<span className={styles.deltaDown}>不足 7 天</span>}
        />
        <Stat label="保留期限" value={`${RETENTION_DAYS} 天`} delta="自动清理" />
      </div>

      {/* List */}
      <Card>
        <div className={styles.cardHead}>
          <div className={styles.cardHeadL}>
            <div className={styles.hdIc}>
              <TrashIcon />
            </div>
            <div>
              <Eyebrow>DELETED</Eyebrow>
              <h3 className={styles.cardTitle}>
                已删除 <span className={styles.song}>待办</span>
              </h3>
            </div>
          </div>
          {/* Sort */}
          <button
            type="button"
            className={styles.sortBtn}
            onClick={() => setSort((s) => (s === 'deleted' ? 'created' : 'deleted'))}
          >
            <span>{SORT_LABELS[sort]}</span>
            <span className={styles.sortArrow}>{sort === 'deleted' ? '↓' : '↑'}</span>
          </button>
        </div>

        {/* Toolbar */}
        {sorted.length > 0 && (
          <div className={styles.toolbar}>
            <button
              type="button"
              className={styles.selectAll}
              onClick={toggleSelectAll}
            >
              {allSelected ? '取消全选' : '全选'}
            </button>
            <button
              type="button"
              className={styles.bulkBtn}
              onClick={handleBulkRestore}
              disabled={selected.size === 0 || busy}
            >
              恢复选中 ({selected.size})
            </button>
            <Popconfirm
              title="清空回收站"
              description="此操作将永久删除回收站中的所有待办，不可恢复"
              okText="清空"
              cancelText="取消"
              okButtonProps={{ danger: true }}
              onConfirm={handleClearAll}
              disabled={sorted.length === 0 || busy}
            >
              <button
                type="button"
                className={cn(styles.bulkBtn, styles.bulkDel)}
                disabled={sorted.length === 0 || busy}
              >
                清空回收站
              </button>
            </Popconfirm>
          </div>
        )}

        <div className={styles.trashList}>
          {sorted.length === 0 && (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>
                <TrashIcon />
              </div>
              <div className={styles.emptyTitle}>回收站为空</div>
              <div className={styles.emptySub}>
                删除的待办将出现在这里，可随时恢复
              </div>
            </div>
          )}

          {sorted.map((t) => {
            const remaining = daysRemaining(t)
            const isExpiring = remaining < 7
            return (
              <div key={t.id} className={styles.trashItem}>
                <button
                  type="button"
                  className={cn(styles.checkbox, selected.has(t.id) && styles.checkboxChecked)}
                  onClick={() => toggleSelect(t.id)}
                >
                  {selected.has(t.id) && <CheckIcon strokeWidth={2.5} />}
                </button>

                <div className={styles.itemMain}>
                  <div className={styles.itemTitle}>{t.text}</div>
                  <div className={styles.itemSub}>
                    <span>删除于 {formatTimestamp(t.updatedAt)}</span>
                    <span className={styles.itemSep}>·</span>
                    <span>原创建 {t.setDate || formatDate(t.time || Date.now())}</span>
                  </div>
                </div>

                <StatusChip tone={isExpiring ? 'warn' : 'default'}>
                  剩余 {remaining} 天
                </StatusChip>

                <div className={styles.itemActions}>
                  <button
                    type="button"
                    className={cn(styles.actBtn, styles.actRestore)}
                    onClick={() => handleRestore(t.id)}
                  >
                    <CheckIcon className={styles.actIcon} />
                    恢复
                  </button>
                  <Popconfirm
                    title="永久删除"
                    description="此操作不可恢复，待办将被彻底清除"
                    okText="永久删除"
                    cancelText="取消"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => handlePermanentDelete(t.id)}
                  >
                    <button
                      type="button"
                      className={cn(styles.actBtn, styles.actDel)}
                    >
                      <TrashIcon className={styles.actIcon} />
                      永久删除
                    </button>
                  </Popconfirm>
                </div>
              </div>
            )
          })}
        </div>

        {sorted.length > 0 && (
          <div className={styles.cardFoot}>
            <span className={styles.footText}>共 {sorted.length} 项 · 选中 {selected.size} 项</span>
          </div>
        )}
      </Card>
    </div>
  )
}
