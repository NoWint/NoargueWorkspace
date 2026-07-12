import { useEffect, useMemo, useState } from 'react'
import { useTodoStore } from '@/stores/todos'
import { useComboStore } from '@/stores/combos'
import { Card, Eyebrow, Stat } from '@/design/primitives'
import { ListIcon, PlusIcon } from '@/design/icons'
import { useNavigate } from 'react-router-dom'
import { todayStr, formatDate, cn } from '@/lib/utils'
import { TodoItem } from './TodoItem'
import styles from './AllTodosView.module.css'

type Filter = 'all' | 'uncompleted' | 'completed'
type Sort = 'newest' | 'oldest'

const FILTER_LABELS: Record<Filter, string> = {
  all: '全部',
  uncompleted: '未完成',
  completed: '已完成',
}

const SORT_LABELS: Record<Sort, string> = {
  newest: '最新优先',
  oldest: '最早优先',
}

export function AllTodosView() {
  const navigate = useNavigate()
  const { todos, fetchTodos, loading } = useTodoStore()
  const { combos, fetchCombos } = useComboStore()
  const [filter, setFilter] = useState<Filter>('all')
  const [comboFilter, setComboFilter] = useState<number | null>(null)
  const [sort, setSort] = useState<Sort>('newest')

  useEffect(() => {
    fetchTodos()
    fetchCombos()
  }, [fetchTodos, fetchCombos])

  const activeTodos = useMemo(() => todos.filter((t) => !t.isDeleted), [todos])

  const stats = useMemo(() => {
    const today = todayStr()
    const total = activeTodos.length
    const completed = activeTodos.filter((t) => t.completed).length
    const uncompleted = total - completed
    const overdue = activeTodos.filter(
      (t) => !t.completed && t.setDate && t.setDate < today,
    ).length
    return { total, completed, uncompleted, overdue }
  }, [activeTodos])

  // Sparkline data: last 7 days
  const sparkData = useMemo(() => {
    const days: string[] = []
    const d = new Date()
    for (let i = 6; i >= 0; i--) {
      const cur = new Date(d)
      cur.setDate(d.getDate() - i)
      days.push(formatDate(cur))
    }
    const dailyTotal = days.map((date) =>
      activeTodos.filter((t) => t.setDate === date).length,
    )
    const dailyCompleted = days.map((date) =>
      activeTodos.filter((t) => t.setDate === date && t.completed).length,
    )
    const dailyOverdue = days.map((date) =>
      activeTodos.filter(
        (t) => !t.completed && t.setDate && t.setDate < date,
      ).length,
    )
    return { dailyTotal, dailyCompleted, dailyOverdue }
  }, [activeTodos])

  // Combo counts (based on all active todos)
  const comboCounts = useMemo(() => {
    const map = new Map<number, number>()
    activeTodos.forEach((t) => {
      if (t.comboId != null) map.set(t.comboId, (map.get(t.comboId) || 0) + 1)
    })
    return map
  }, [activeTodos])

  const filtered = useMemo(() => {
    let list = activeTodos
    if (comboFilter !== null) list = list.filter((t) => t.comboId === comboFilter)
    if (filter === 'completed') list = list.filter((t) => t.completed)
    if (filter === 'uncompleted') list = list.filter((t) => !t.completed)
    const sorted = [...list].sort((a, b) => (b.time || 0) - (a.time || 0))
    return sort === 'newest' ? sorted : sorted.reverse()
  }, [activeTodos, filter, comboFilter, sort])

  return (
    <div className={styles.screen}>
      {/* Header */}
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.hdRow}>
            <div className={styles.hdIc}>
              <ListIcon />
            </div>
            <div>
              <Eyebrow>ALL</Eyebrow>
              <h1 className={styles.title}>
                全部 <span className={styles.song}>待办</span>
              </h1>
            </div>
          </div>
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={cn(styles.btn, styles.btnPri, styles.btnSm)}
            onClick={() => navigate('/todos/new')}
          >
            <PlusIcon className={styles.btnIcon} />
            新建待办
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <Stat
          label="总数"
          value={stats.total}
          delta="全部待办"
          spark={sparkData.dailyTotal}
        />
        <Stat
          label="已完成"
          value={stats.completed}
          accent
          delta={<span className={styles.deltaUp}>已完成</span>}
          spark={sparkData.dailyCompleted}
        />
        <Stat label="未完成" value={stats.uncompleted} delta="进行中" />
        <Stat
          label="逾期"
          value={stats.overdue}
          warn
          delta={<span className={styles.deltaDown}>需处理</span>}
          spark={sparkData.dailyOverdue}
        />
      </div>

      {/* Main grid */}
      <div className={styles.grid}>
        {/* Todo list card */}
        <Card>
          <div className={styles.cardHead}>
            <div className={styles.cardHeadL}>
              <div className={styles.hdIc}>
                <ListIcon />
              </div>
              <div>
                <Eyebrow>LIST</Eyebrow>
                <h3 className={styles.cardTitle}>
                  待办 <span className={styles.song}>列表</span>
                </h3>
              </div>
            </div>
            <div className={styles.seg}>
              {(Object.keys(FILTER_LABELS) as Filter[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  className={cn(styles.pill, filter === f && styles.pillAct)}
                  onClick={() => setFilter(f)}
                >
                  {FILTER_LABELS[f]}
                </button>
              ))}
            </div>
          </div>

          {/* Combo filter chips */}
          <div className={styles.comboFilters}>
            <button
              type="button"
              className={cn(
                styles.comboBtn,
                comboFilter === null && styles.comboAct,
              )}
              onClick={() => setComboFilter(null)}
            >
              <span className={styles.comboDotAll} />
              全部
              <span className={styles.comboCount}>{activeTodos.length}</span>
            </button>
            {combos.map((c) => (
              <button
                key={c.id}
                type="button"
                className={cn(
                  styles.comboBtn,
                  comboFilter === c.id && styles.comboAct,
                )}
                onClick={() => setComboFilter(c.id)}
              >
                <span
                  className={styles.comboDot}
                  style={{ background: c.color }}
                />
                {c.name}
                <span className={styles.comboCount}>
                  {comboCounts.get(c.id) || 0}
                </span>
              </button>
            ))}
          </div>

          <div className={styles.todoList}>
            {loading && (
              <div className={styles.empty}>
                <div className={styles.emptyIcon}>
                  <ListIcon />
                </div>
                <div>加载中...</div>
              </div>
            )}
            {!loading && filtered.length === 0 && (
              <div className={styles.empty}>
                <div className={styles.emptyIcon}>
                  <ListIcon />
                </div>
                <div className={styles.emptyTitle}>暂无待办</div>
                <div className={styles.emptySub}>
                  {comboFilter !== null
                    ? '该组合下还没有待办事项'
                    : filter === 'completed'
                      ? '还没有已完成的待办'
                      : filter === 'uncompleted'
                        ? '所有待办都已完成'
                        : '点击右上角"新建待办"开始'}
                </div>
              </div>
            )}
            {filtered.map((t) => (
              <TodoItem key={t.id} todo={t} />
            ))}
          </div>

          <div className={styles.cardFoot}>
            <span className={styles.footText}>共 {filtered.length} 项</span>
            <button
              type="button"
              className={styles.sortBtn}
              onClick={() =>
                setSort((s) => (s === 'newest' ? 'oldest' : 'newest'))
              }
            >
              <span className={styles.sortLabel}>{SORT_LABELS[sort]}</span>
              <span className={styles.sortArrow}>
                {sort === 'newest' ? '↓' : '↑'}
              </span>
            </button>
          </div>
        </Card>
      </div>
    </div>
  )
}
