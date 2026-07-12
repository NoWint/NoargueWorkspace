import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { useTodoStore } from '@/stores/todos'
import { Card, Eyebrow, Button, Stat } from '@/design/primitives'
import {
  CalendarIcon,
  PlusIcon,
  ListIcon,
  ClockIcon,
} from '@/design/icons'
import { TodoItem } from '@/features/todo/TodoItem'
import { cn, todayStr } from '@/lib/utils'
import styles from './CalendarView.module.css'

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

export function CalendarView() {
  const navigate = useNavigate()
  const { todos, fetchTodos, loading } = useTodoStore()
  const [current, setCurrent] = useState(dayjs())
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'))

  useEffect(() => {
    fetchTodos()
  }, [fetchTodos])

  const activeTodos = useMemo(
    () => todos.filter((t) => !t.isDeleted),
    [todos],
  )

  const todosByDate = useMemo(() => {
    const map: Record<string, typeof todos> = {}
    activeTodos.filter((t) => t.setDate).forEach((t) => {
      if (!map[t.setDate!]) map[t.setDate!] = []
      map[t.setDate!].push(t)
    })
    return map
  }, [activeTodos])

  const days = useMemo(() => {
    const start = current.startOf('month').startOf('week')
    const end = current.endOf('month').endOf('week')
    const arr: dayjs.Dayjs[] = []
    let d = start
    while (d.isBefore(end) || d.isSame(end)) {
      arr.push(d)
      d = d.add(1, 'day')
    }
    return arr
  }, [current])

  const todayStrVal = todayStr()
  const selectedTodos = todosByDate[selectedDate] || []

  // Month stats
  const monthStats = useMemo(() => {
    const monthPrefix = current.format('YYYY-MM')
    const monthTodos = activeTodos.filter(
      (t) => t.setDate && t.setDate.startsWith(monthPrefix),
    )
    const total = monthTodos.length
    const completed = monthTodos.filter((t) => t.completed).length
    const upcoming = monthTodos.filter(
      (t) => !t.completed && t.setDate && t.setDate >= todayStrVal,
    ).length
    const overdue = monthTodos.filter(
      (t) => !t.completed && t.setDate && t.setDate < todayStrVal,
    ).length
    return { total, completed, upcoming, overdue }
  }, [activeTodos, current, todayStrVal])

  // Upcoming todos (next 7 days, including today)
  const upcomingTodos = useMemo(() => {
    const today = dayjs()
    const limit = today.add(7, 'day').format('YYYY-MM-DD')
    return activeTodos
      .filter(
        (t) =>
          !t.completed &&
          t.setDate &&
          t.setDate >= todayStrVal &&
          t.setDate <= limit,
      )
      .sort((a, b) => (a.setDate! < b.setDate! ? -1 : 1))
      .slice(0, 6)
  }, [activeTodos, todayStrVal])

  const monthLabel = current.format('YYYY 年 M 月')
  const selectedLabel = dayjs(selectedDate).format('M 月 D 日')

  return (
    <div className={styles.screen}>
      {/* Header */}
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.hdRow}>
            <div className={styles.hdIc}>
              <CalendarIcon />
            </div>
            <div>
              <Eyebrow>CALENDAR</Eyebrow>
              <h1 className={styles.title}>{monthLabel}</h1>
            </div>
          </div>
        </div>
        <div className={styles.nav}>
          <Button
            variant="gh"
            size="sm"
            onClick={() => setCurrent(current.subtract(1, 'month'))}
          >
            ←
          </Button>
          <Button variant="sec" size="sm" onClick={() => setCurrent(dayjs())}>
            今天
          </Button>
          <Button
            variant="gh"
            size="sm"
            onClick={() => setCurrent(current.add(1, 'month'))}
          >
            →
          </Button>
        </div>
      </div>

      {/* Two-column grid: calendar + sidebar */}
      <div className={styles.grid}>
        <div className={styles.mainCol}>
          {/* Calendar grid card */}
          <Card>
            <div className={styles.cardHead}>
              <div className={styles.cardHeadL}>
                <div className={styles.hdIc}>
                  <CalendarIcon />
                </div>
                <div>
                  <Eyebrow>{current.format('MMMM YYYY').toUpperCase()}</Eyebrow>
                  <h3 className={styles.cardTitle}>
                    日历 <span className={styles.song}>视图</span>
                  </h3>
                </div>
              </div>
            </div>
            <div className={styles.weekHeader}>
              {WEEKDAYS.map((w) => (
                <div key={w} className={styles.weekCell}>
                  {w}
                </div>
              ))}
            </div>
            <div className={styles.dayGrid}>
              {days.map((d) => {
                const dateStr = d.format('YYYY-MM-DD')
                const inMonth = d.month() === current.month()
                const isToday = dateStr === todayStrVal
                const isSelected = dateStr === selectedDate
                const dayTodos = todosByDate[dateStr] || []
                const hasTodos = dayTodos.length > 0
                const visibleTodos = dayTodos.slice(0, 3)
                const remainingCount = dayTodos.length - visibleTodos.length
                return (
                  <button
                    key={dateStr}
                    type="button"
                    className={cn(
                      styles.dayCell,
                      !inMonth && styles.outOfMonth,
                      isToday && styles.today,
                      isSelected && !isToday && styles.selected,
                    )}
                    onClick={() => setSelectedDate(dateStr)}
                  >
                    <span className={styles.dayNum}>{d.date()}</span>
                    {hasTodos && (
                      <div className={styles.cellTodos}>
                        {visibleTodos.map((t) => {
                          const isDone = !!t.completed
                          const isOver = !isDone && t.setDate && t.setDate < todayStrVal
                          const priClass =
                            t.priority === 'high' ? styles.cellTodoHigh
                            : t.priority === 'medium' ? styles.cellTodoMed
                            : ''
                          return (
                            <div
                              key={t.id}
                              className={cn(
                                styles.cellTodo,
                                priClass,
                                isOver && styles.cellTodoOver,
                                isDone && styles.cellTodoDone,
                              )}
                            >
                              {t.text}
                            </div>
                          )
                        })}
                        {remainingCount > 0 && (
                          <div className={styles.cellMore}>+{remainingCount} 更多</div>
                        )}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </Card>

          {/* Selected date detail card */}
          <Card>
            <div className={styles.cardHead}>
              <div className={styles.cardHeadL}>
                <div className={styles.hdIc}>
                  <ListIcon />
                </div>
                <div>
                  <Eyebrow>{selectedLabel}</Eyebrow>
                  <h3 className={styles.cardTitle}>
                    {selectedTodos.length} 项{' '}
                    <span className={styles.song}>待办</span>
                  </h3>
                </div>
              </div>
              <Button
                variant="pri"
                size="sm"
                icon={<PlusIcon className={styles.btnIcon} />}
                onClick={() => navigate('/todos/new')}
              >
                添加
              </Button>
            </div>

            <div className={styles.todoList}>
              {loading && (
                <div className={styles.empty}>
                  <div className={styles.emptyIcon}>
                    <CalendarIcon />
                  </div>
                  <div>加载中...</div>
                </div>
              )}
              {!loading && selectedTodos.length === 0 && (
                <div className={styles.empty}>
                  <div className={styles.emptyIcon}>
                    <CalendarIcon />
                  </div>
                  <div className={styles.emptyTitle}>当日无待办</div>
                  <div className={styles.emptySub}>
                    点击右上角"添加"为该日期创建待办
                  </div>
                </div>
              )}
              {selectedTodos.map((t) => (
                <TodoItem key={t.id} todo={t} />
              ))}
            </div>

            {selectedTodos.length > 0 && (
              <div className={styles.cardFoot}>
                <span className={styles.footText}>
                  共 {selectedTodos.length} 项 ·{' '}
                  {selectedTodos.filter((t) => t.completed).length} 已完成
                </span>
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className={styles.sideCol}>
          {/* Month stats */}
          <Card>
            <div className={styles.cardHead}>
              <div className={styles.cardHeadL}>
                <div className={styles.hdIc}>
                  <ClockIcon />
                </div>
                <div>
                  <Eyebrow>{current.format('MMM').toUpperCase()} STATS</Eyebrow>
                  <h3 className={styles.cardTitle}>
                    本月 <span className={styles.song}>概览</span>
                  </h3>
                </div>
              </div>
            </div>
            <div className={styles.miniStats}>
              <Stat label="本月总数" value={monthStats.total} delta="全部待办" />
              <Stat
                label="已完成"
                value={monthStats.completed}
                accent
                delta={
                  <span className={styles.deltaUp}>已完成</span>
                }
              />
              <Stat
                label="待完成"
                value={monthStats.upcoming}
                delta="即将到来"
              />
              <Stat
                label="逾期"
                value={monthStats.overdue}
                delta={
                  <span className={styles.deltaDown}>需处理</span>
                }
              />
            </div>
          </Card>

          {/* Upcoming todos (next 7 days) */}
          <Card>
            <div className={styles.cardHead}>
              <div className={styles.cardHeadL}>
                <div className={styles.hdIc}>
                  <ListIcon />
                </div>
                <div>
                  <Eyebrow>UPCOMING · 7 DAYS</Eyebrow>
                  <h3 className={styles.cardTitle}>
                    即将 <span className={styles.song}>到来</span>
                  </h3>
                </div>
              </div>
            </div>
            {upcomingTodos.length === 0 ? (
              <div className={styles.sideEmpty}>
                <div className={styles.sideEmptyIcon}>
                  <ListIcon />
                </div>
                <div>未来 7 天暂无待办</div>
              </div>
            ) : (
              <div className={styles.upcomingList}>
                {upcomingTodos.map((t) => (
                  <div
                    key={t.id}
                    className={styles.upcomingItem}
                    onClick={() => navigate(`/todos/${t.id}`)}
                  >
                    <div className={styles.upcomingDate}>
                      <span className={styles.upcomingDay}>
                        {dayjs(t.setDate).format('DD')
                          .replace(/^0/, '')}
                      </span>
                      <span className={styles.upcomingMonth}>
                        {dayjs(t.setDate).format('MMM').toUpperCase()}
                      </span>
                    </div>
                    <div className={styles.upcomingMain}>
                      <div className={styles.upcomingTitle}>{t.text}</div>
                      <div className={styles.upcomingSub}>
                        {t.setTime && (
                          <span className={styles.upcomingTime}>
                            {t.setTime}
                          </span>
                        )}
                        <span className={styles.upcomingDateStr}>
                          {t.setDate}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
