import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { useTodoStore } from '@/stores/todos'
import { useComboStore } from '@/stores/combos'
import { useTagStore } from '@/stores/tags'
import { Button, Card, Eyebrow, HeroTitle, Stat, Progress, Tag } from '@/design/primitives'
import { TodoItem } from './TodoItem'
import { greeting, todayStr } from '@/lib/utils'
import styles from './TodayView.module.css'

export function TodayView() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { todos, fetchTodos, loading } = useTodoStore()
  const fetchCombos = useComboStore((s) => s.fetchCombos)
  const { systemTags, userTags, fetchTags } = useTagStore()

  useEffect(() => {
    fetchTodos()
    fetchCombos()
    fetchTags()
  }, [fetchTodos, fetchCombos, fetchTags])

  const today = todayStr()
  const todayTodos = useMemo(
    () => todos.filter((t) => !t.isDeleted && t.setDate === today),
    [todos, today],
  )
  const completedCount = todayTodos.filter((t) => t.completed).length
  const totalCount = todayTodos.length
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  const weekTodos = todos.filter(
    (t) => !t.isDeleted && t.setDate && new Date(t.setDate) >= weekStart,
  )
  const weekCompleted = weekTodos.filter((t) => t.completed).length
  const weekRate = weekTodos.length > 0 ? Math.round((weekCompleted / weekTodos.length) * 100) : 0

  return (
    <div className={styles.screen}>
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <Eyebrow>{new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' })}</Eyebrow>
          <HeroTitle accent={user?.nickname || '朋友'}>
            {greeting()}，
          </HeroTitle>
          <div className={styles.meta}>
            <span className={styles.chip}>完成 {completedCount} / {totalCount}</span>
            <span className={styles.sep}>·</span>
            <span>本周进度 {weekRate}%</span>
          </div>
        </div>
        <div className={styles.actions}>
          <Button variant="gh" size="sm" onClick={() => navigate('/todos/new')}>+ 新建</Button>
          <Button variant="pri" size="sm" onClick={() => navigate('/todos/new')}>新建待办</Button>
        </div>
      </div>

      <div className={styles.stats}>
        <Stat label="今日待办" value={totalCount} delta={`${completedCount} 已完成`} />
        <Stat label="本周完成" value={weekCompleted} accent delta={`共 ${weekTodos.length} 项`} />
        <Stat label="完成率" value={`${weekRate}%`} delta="目标 80%" />
      </div>

      <div className={styles.grid}>
        <Card>
          <div className={styles.cardHead}>
            <div>
              <Eyebrow>TODAY</Eyebrow>
              <h3 className={styles.cardTitle}>今日 <span className={styles.song}>待办</span></h3>
            </div>
          </div>
          <div>
            {loading && <div style={{ color: 'var(--mt)', padding: '20px 0' }}>加载中...</div>}
            {!loading && todayTodos.length === 0 && (
              <div style={{ color: 'var(--mt)', padding: '20px 0' }}>今日暂无待办</div>
            )}
            {todayTodos.map((t) => <TodoItem key={t.id} todo={t} />)}
          </div>
        </Card>

        <div className={styles.sideCol}>
          <Card>
            <div className={styles.cardHead}>
              <div>
                <Eyebrow>WEEKLY</Eyebrow>
                <h3 className={styles.cardTitle}>本周 <span className={styles.song}>进度</span></h3>
              </div>
            </div>
            <div className={styles.progressRow}>
              <span className={styles.progLabel}>完成率</span>
              <span className={styles.progVal}>{weekRate}%</span>
            </div>
            <Progress value={weekRate} />
          </Card>

          <Card>
            <div className={styles.cardHead}>
              <div>
                <Eyebrow>TAGS</Eyebrow>
                <h3 className={styles.cardTitle}>常用 <span className={styles.song}>标签</span></h3>
              </div>
            </div>
            <div className={styles.tags}>
              {[...systemTags, ...userTags].slice(0, 8).map((t) => (
                <Tag key={t.id} tone="default">{t.name}</Tag>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
