import { useEffect, useMemo } from 'react'
import { Card, Eyebrow } from '@/design/primitives'
import { StarIcon } from '@/design/icons'
import { useTodoStore } from '@/stores/todos'
import { TodoItem } from '@/features/todo/TodoItem'
import styles from './StarView.module.css'

export function StarView() {
  const { todos, fetchTodos } = useTodoStore()

  useEffect(() => {
    fetchTodos()
  }, [fetchTodos])

  const starred = useMemo(
    () => todos.filter((t) => t.isStar && !t.isDeleted),
    [todos],
  )

  return (
    <div className={styles.screen}>
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.hdRow}>
            <div className={styles.hdIc}><StarIcon /></div>
            <div>
              <Eyebrow>STARRED</Eyebrow>
              <h1 className={styles.title}>收藏待办 <span className={styles.song}>星标</span></h1>
            </div>
          </div>
          <div className={styles.meta}>
            <span>{starred.length} 项收藏</span>
          </div>
        </div>
      </div>

      <Card>
        <div className={styles.cardHead}>
          <div className={styles.cardHeadL}>
            <div className={styles.hdIc}><StarIcon /></div>
            <div>
              <Eyebrow>STARRED</Eyebrow>
              <h3 className={styles.cardTitle}>星标 <span className={styles.song}>待办</span></h3>
            </div>
          </div>
        </div>

        <div className={styles.list}>
          {starred.length === 0 && (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}><StarIcon /></div>
              <div className={styles.emptyTitle}>暂无收藏</div>
              <div className={styles.emptySub}>在待办上点击星标，即可收藏到此处</div>
            </div>
          )}
          {starred.map((t) => (
            <TodoItem key={t.id} todo={t} />
          ))}
        </div>

        {starred.length > 0 && (
          <div className={styles.cardFoot}>
            <span className={styles.footText}>共 {starred.length} 项收藏</span>
          </div>
        )}
      </Card>
    </div>
  )
}
