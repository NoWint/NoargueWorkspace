import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { useTodoStore } from '@/stores/todos'
import { Card, Eyebrow, Button } from '@/design/primitives'
import { TodoItem } from '@/features/todo/TodoItem'
import styles from './CalendarView.module.css'

export function CalendarView() {
  const navigate = useNavigate()
  const { todos, fetchTodos, loading } = useTodoStore()
  const [current, setCurrent] = useState(dayjs())
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'))

  useEffect(() => { fetchTodos() }, [fetchTodos])

  const todosByDate = useMemo(() => {
    const map: Record<string, typeof todos> = {}
    todos.filter((t) => !t.isDeleted && t.setDate).forEach((t) => {
      if (!map[t.setDate!]) map[t.setDate!] = []
      map[t.setDate!].push(t)
    })
    return map
  }, [todos])

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

  const selectedTodos = todosByDate[selectedDate] || []

  return (
    <div className={styles.screen}>
      <div className={styles.head}>
        <div>
          <Eyebrow>CALENDAR</Eyebrow>
          <h1 className={styles.title}>{current.format('YYYY 年 M 月')}</h1>
        </div>
        <div className={styles.nav}>
          <Button variant="gh" size="sm" onClick={() => setCurrent(current.subtract(1, 'month'))}>←</Button>
          <Button variant="gh" size="sm" onClick={() => setCurrent(dayjs())}>今天</Button>
          <Button variant="gh" size="sm" onClick={() => setCurrent(current.add(1, 'month'))}>→</Button>
        </div>
      </div>

      <Card>
        <div className={styles.weekHeader}>
          {['一', '二', '三', '四', '五', '六', '日'].map((w) => (
            <div key={w} className={styles.weekCell}>{w}</div>
          ))}
        </div>
        <div className={styles.dayGrid}>
          {days.map((d) => {
            const dateStr = d.format('YYYY-MM-DD')
            const inMonth = d.month() === current.month()
            const isToday = dateStr === dayjs().format('YYYY-MM-DD')
            const isSelected = dateStr === selectedDate
            const hasTodos = (todosByDate[dateStr]?.length || 0) > 0
            return (
              <button
                key={dateStr}
                className={[
                  styles.dayCell,
                  !inMonth && styles.outOfMonth,
                  isToday && styles.today,
                  isSelected && styles.selected,
                ].filter(Boolean).join(' ')}
                onClick={() => setSelectedDate(dateStr)}
                type="button"
              >
                <span className={styles.dayNum}>{d.date()}</span>
                {hasTodos && <span className={styles.dot} />}
              </button>
            )
          })}
        </div>
      </Card>

      <Card>
        <div className={styles.cardHead}>
          <div>
            <Eyebrow>{selectedDate}</Eyebrow>
            <h3 className={styles.cardTitle}>{selectedTodos.length} 项待办</h3>
          </div>
          <Button variant="pri" size="sm" onClick={() => navigate('/todos/new')}>+ 添加</Button>
        </div>
        <div>
          {loading && <div style={{ color: 'var(--mt)', padding: '20px 0' }}>加载中...</div>}
          {!loading && selectedTodos.length === 0 && (
            <div style={{ color: 'var(--mt)', padding: '20px 0' }}>当日无待办</div>
          )}
          {selectedTodos.map((t) => <TodoItem key={t.id} todo={t} />)}
        </div>
      </Card>
    </div>
  )
}
