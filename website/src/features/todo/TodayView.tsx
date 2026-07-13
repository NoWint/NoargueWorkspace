import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { useTodoStore } from '@/stores/todos'
import { useComboStore } from '@/stores/combos'
import { useTagStore } from '@/stores/tags'
import { Button, Card, Eyebrow, Stat, Progress, Tag } from '@/design/primitives'
import {
  CalendarCheckIcon,
  ClockIcon,
  CalendarIcon,
  TagIcon,
  MicIcon,
  BatchIcon,
  PlusIcon,
} from '@/design/icons'
import { TodoItem } from './TodoItem'
import { greeting, formatDate, cn } from '@/lib/utils'
import styles from './TodayView.module.css'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']
const MONTHS_EN = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
]

type FilterKey = 'all' | 'uncompleted' | 'completed'
const FILTER_LABELS: Record<FilterKey, string> = {
  all: '全部',
  uncompleted: '未完成',
  completed: '已完成',
}

interface CalCell {
  day: number
  inMonth: boolean
  dateStr: string
  isToday: boolean
  hasTodo: boolean
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function dateLabel(d: Date): string {
  return `${d.getFullYear()} · ${pad(d.getMonth() + 1)} · ${pad(d.getDate())} · 周${WEEKDAYS[d.getDay()]}`
}

export function TodayView() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { todos, fetchTodos, loading } = useTodoStore()
  const fetchCombos = useComboStore((s) => s.fetchCombos)
  const { systemTags, userTags, fetchTags } = useTagStore()
  const [filter, setFilter] = useState<FilterKey>('all')
  const [activeTagId, setActiveTagId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    Promise.all([fetchTodos(), fetchCombos(), fetchTags()])
      .then(() => { if (mounted) setError(null) })
      .catch(() => { if (mounted) setError('加载失败，请稍后重试') })
    return () => { mounted = false }
  }, [fetchTodos, fetchCombos, fetchTags])

  const now = new Date()
  const today = formatDate(now)

  const activeTodos = useMemo(() => todos.filter((t) => !t.isDeleted), [todos])
  const todayTodos = useMemo(
    () => activeTodos.filter((t) => t.setDate === today),
    [activeTodos, today],
  )
  const completedCount = todayTodos.filter((t) => t.completed).length
  const totalCount = todayTodos.length
  const remaining = totalCount - completedCount

  const filteredTodos = useMemo(() => {
    let result = todayTodos
    if (filter === 'uncompleted') result = result.filter((t) => !t.completed)
    if (filter === 'completed') result = result.filter((t) => t.completed)
    if (activeTagId !== null) {
      result = result.filter((t) => t.tags?.includes(activeTagId))
    }
    return result
  }, [todayTodos, filter, activeTagId])

  // Week progress (Sunday-based, matching existing logic)
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  weekStart.setHours(0, 0, 0, 0)
  const weekTodos = activeTodos.filter(
    (t) => t.setDate && new Date(t.setDate) >= weekStart,
  )
  const weekCompleted = weekTodos.filter((t) => t.completed).length
  const weekPending = weekTodos.length - weekCompleted
  const weekRate = weekTodos.length > 0
    ? Math.round((weekCompleted / weekTodos.length) * 100)
    : 0

  // Week-over-week delta
  const prevWeekStart = new Date(weekStart)
  prevWeekStart.setDate(prevWeekStart.getDate() - 7)
  const prevWeekCompleted = activeTodos.filter((t) => {
    if (!t.setDate || !t.completed) return false
    const d = new Date(t.setDate)
    return d >= prevWeekStart && d < weekStart
  }).length
  const weekDelta = prevWeekCompleted > 0
    ? Math.round(((weekCompleted - prevWeekCompleted) / prevWeekCompleted) * 100)
    : null

  // Overdue
  const overdueCount = activeTodos.filter(
    (t) => t.setDate && t.setDate < today && !t.completed,
  ).length

  // Streak: consecutive days (ending today or yesterday) with a completed todo
  const streak = useMemo(() => {
    const completedDates = new Set(
      activeTodos.filter((t) => t.completed && t.setDate).map((t) => t.setDate),
    )
    let s = 0
    const d = new Date()
    if (!completedDates.has(formatDate(d))) d.setDate(d.getDate() - 1)
    while (completedDates.has(formatDate(d))) {
      s++
      d.setDate(d.getDate() - 1)
    }
    return s
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
    const dailyCounts = days.map((date) =>
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
    const dailyRate = days.map((date) => {
      const dayTodos = activeTodos.filter((t) => t.setDate === date)
      if (dayTodos.length === 0) return 0
      return Math.round(
        (dayTodos.filter((t) => t.completed).length / dayTodos.length) * 100,
      )
    })
    return { dailyCounts, dailyCompleted, dailyOverdue, dailyRate }
  }, [activeTodos])

  // Mini calendar
  const monthLabel = `${MONTHS_EN[now.getMonth()]} ${now.getFullYear()}`
  const calCells = useMemo<CalCell[]>(() => {
    const y = now.getFullYear()
    const m = now.getMonth()
    const first = new Date(y, m, 1)
    const startOffset = (first.getDay() + 6) % 7 // Monday-based
    const daysInMonth = new Date(y, m + 1, 0).getDate()
    const prevMonthDays = new Date(y, m, 0).getDate()
    const todoDates = new Set(
      activeTodos.filter((t) => t.setDate).map((t) => t.setDate),
    )
    const cells: CalCell[] = []
    for (let i = startOffset - 1; i >= 0; i--) {
      const day = prevMonthDays - i
      const pm = m === 0 ? 11 : m - 1
      const py = m === 0 ? y - 1 : y
      const dateStr = `${py}-${pad(pm + 1)}-${pad(day)}`
      cells.push({ day, inMonth: false, dateStr, isToday: false, hasTodo: todoDates.has(dateStr) })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${y}-${pad(m + 1)}-${pad(d)}`
      cells.push({ day: d, inMonth: true, dateStr, isToday: dateStr === today, hasTodo: todoDates.has(dateStr) })
    }
    const trailing = (7 - (cells.length % 7)) % 7
    for (let i = 1; i <= trailing; i++) {
      const nm = m === 11 ? 0 : m + 1
      const ny = m === 11 ? y + 1 : y
      const dateStr = `${ny}-${pad(nm + 1)}-${pad(i)}`
      cells.push({ day: i, inMonth: false, dateStr, isToday: false, hasTodo: todoDates.has(dateStr) })
    }
    return cells
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTodos, today])

  // Tag counts
  const tagCounts = useMemo(() => {
    return [...systemTags, ...userTags]
      .map((t) => ({
        ...t,
        count: activeTodos.filter((todo) => todo.tags?.includes(t.id)).length,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  }, [systemTags, userTags, activeTodos])

  const nickname = user?.nickname || '朋友'
  const titleTail = remaining > 0
    ? `。今日还有 ${remaining} 项待办。`
    : '。今日待办已全部完成。'

  const weekDeltaEl = weekDelta === null ? (
    <span>暂无数据</span>
  ) : (
    <span className={weekDelta >= 0 ? styles.deltaUp : styles.deltaDown}>
      {weekDelta >= 0 ? '↑' : '↓'} {Math.abs(weekDelta)}% vs 上周
    </span>
  )

  return (
    <div className={styles.screen}>
      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <Eyebrow>{dateLabel(now)}</Eyebrow>
          <h1 className={styles.heroTitle}>
            {greeting()}，<span className={styles.song}>{nickname}</span>
            {titleTail}
          </h1>
          <div className={styles.meta}>
            <span className={styles.chip}>完成 {completedCount} / {totalCount}</span>
            <span className={styles.sep}>·</span>
            <span>本周进度 {weekRate}%</span>
            <span className={styles.sep}>·</span>
            <span>连续打卡 {streak} 天</span>
          </div>
        </div>
        <div className={styles.actions}>
          <Button variant="gh" size="sm" icon={<MicIcon className={styles.btnIcon} />}>
            语音添加
          </Button>
          <Button variant="sec" size="sm" icon={<BatchIcon className={styles.btnIcon} />}>
            批量管理
          </Button>
          <Button
            variant="pri"
            size="sm"
            icon={<PlusIcon className={styles.btnIcon} />}
            onClick={() => navigate('/todos/new')}
          >
            新建待办
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <Stat
          label="今日待办"
          value={totalCount}
          delta={`${completedCount} 已完成`}
          spark={sparkData.dailyCounts}
        />
        <Stat
          label="本周完成"
          value={weekCompleted}
          accent
          delta={weekDeltaEl}
          spark={sparkData.dailyCompleted}
        />
        <Stat
          label="逾期"
          value={overdueCount}
          warn
          delta={<span className={styles.deltaDown}>需处理</span>}
          spark={sparkData.dailyOverdue}
        />
        <Stat
          label="完成率"
          value={<>{weekRate}<span className={styles.pctSign}>%</span></>}
          delta="目标 80%"
          spark={sparkData.dailyRate}
        />
      </div>

      {/* Main grid */}
      <div className={styles.grid}>
        {/* Todo list card */}
        <Card>
          <div className={styles.cardHead}>
            <div className={styles.cardHeadL}>
              <div className={styles.hdIc}>
                <CalendarCheckIcon />
              </div>
              <div>
                <Eyebrow>TODAY</Eyebrow>
                <h3 className={styles.cardTitle}>
                  今日 <span className={styles.song}>待办</span>
                </h3>
              </div>
            </div>
            <div className={styles.filters}>
              {(Object.keys(FILTER_LABELS) as FilterKey[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  className={cn(styles.filterBtn, filter === f && styles.filterAct)}
                  onClick={() => setFilter(f)}
                >
                  {FILTER_LABELS[f]}
                </button>
              ))}
              {activeTagId !== null && (
                <div className={styles.filterStatus}>
                  按「{[...systemTags, ...userTags].find((t) => t.id === activeTagId)?.name || ''}」筛选
                  <span
                    className={styles.filterStatusX}
                    onClick={() => setActiveTagId(null)}
                  >
                    ×
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className={styles.todoList}>
            {loading && (
              <div className={styles.skeletonList}>
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={styles.skeletonRow}>
                    <div className={styles.skeletonCheck} />
                    <div className={styles.skeletonBody}>
                      <div className={styles.skeletonTitle} />
                      <div className={styles.skeletonSub} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {error && !loading && (
              <div className={styles.empty}>
                <div className={styles.emptyIcon}>
                  <CalendarCheckIcon />
                </div>
                <div className={styles.emptyTitle}>加载失败</div>
                <div className={styles.emptySub}>{error}</div>
              </div>
            )}
            {!loading && !error && filteredTodos.length === 0 && (
              <div className={styles.empty}>
                <div className={styles.emptyIcon}>
                  <CalendarCheckIcon />
                </div>
                <div className={styles.emptyTitle}>今日暂无待办</div>
                <div className={styles.emptySub}>点击右上角"新建待办"开始</div>
              </div>
            )}
            {!loading && !error && filteredTodos.map((t) => (
              <TodoItem key={t.id} todo={t} />
            ))}
          </div>

          <div className={styles.cardFoot}>
            <span className={styles.footText}>
              显示 {totalCount} 项中的 {filteredTodos.length} 项
            </span>
            <Button variant="gh" size="sm" onClick={() => navigate('/todos')}>
              查看全部 →
            </Button>
          </div>
        </Card>

        {/* Right column */}
        <div className={styles.sideCol}>
          {/* Weekly progress */}
          <Card>
            <div className={styles.cardHead}>
              <div className={styles.cardHeadL}>
                <div className={styles.hdIc}>
                  <ClockIcon />
                </div>
                <div>
                  <Eyebrow>WEEKLY</Eyebrow>
                  <h3 className={styles.cardTitle}>
                    本周 <span className={styles.song}>进度</span>
                  </h3>
                </div>
              </div>
            </div>
            <div>
              <div className={styles.progressRow}>
                <span className={styles.progLabel}>完成率</span>
                <span className={styles.progVal}>{weekRate}%</span>
              </div>
              <Progress value={weekRate} />
            </div>
            <div className={styles.miniStats}>
              <div>
                <div className={styles.miniLab}>已完成</div>
                <div className={styles.miniValOk}>{weekCompleted}</div>
              </div>
              <div>
                <div className={styles.miniLab}>待完成</div>
                <div className={styles.miniVal}>{weekPending}</div>
              </div>
            </div>
          </Card>

          {/* Calendar mini */}
          <Card>
            <div className={styles.cardHead}>
              <div className={styles.cardHeadL}>
                <div className={styles.hdIc}>
                  <CalendarIcon />
                </div>
                <div>
                  <Eyebrow>{monthLabel}</Eyebrow>
                  <h3 className={styles.cardTitle}>
                    日历 <span className={styles.song}>概览</span>
                  </h3>
                </div>
              </div>
              <Button variant="gh" size="sm" onClick={() => navigate('/calendar')}>
                →
              </Button>
            </div>
            <div className={styles.calWeekdays}>
              {['一', '二', '三', '四', '五', '六', '日'].map((w) => (
                <div key={w}>{w}</div>
              ))}
            </div>
            <div className={styles.calGrid}>
              {calCells.map((c, i) => (
                <div
                  key={i}
                  className={cn(
                    styles.calCell,
                    !c.inMonth && styles.calOut,
                    c.isToday && styles.calToday,
                  )}
                >
                  {c.day}
                  {c.hasTodo && !c.isToday && <span className={styles.calDot} />}
                </div>
              ))}
            </div>
          </Card>

          {/* Tags */}
          <Card>
            <div className={styles.cardHead}>
              <div className={styles.cardHeadL}>
                <div className={styles.hdIc}>
                  <TagIcon />
                </div>
                <div>
                  <Eyebrow>TAGS</Eyebrow>
                  <h3 className={styles.cardTitle}>
                    常用 <span className={styles.song}>标签</span>
                  </h3>
                </div>
              </div>
            </div>
            <div className={styles.tags}>
              {tagCounts.map((t) => {
                const isActive = activeTagId === t.id
                return (
                  <button
                    key={t.id}
                    type="button"
                    className={styles.tagActive}
                    onClick={() => setActiveTagId(isActive ? null : t.id)}
                  >
                    <Tag tone={isActive ? 'pri' : 'default'}>
                      {t.name} · {t.count}
                    </Tag>
                  </button>
                )
              })}
              <Tag tone="default">+ 新建</Tag>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
