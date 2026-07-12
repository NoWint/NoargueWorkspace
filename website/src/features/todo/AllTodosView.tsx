import { useEffect, useMemo, useState } from 'react'
import { useTodoStore } from '@/stores/todos'
import { useComboStore } from '@/stores/combos'
import { Segmented } from 'antd'
import { Card, Eyebrow } from '@/design/primitives'
import { TodoItem } from './TodoItem'
import styles from './AllTodosView.module.css'

type Filter = 'all' | 'uncompleted' | 'completed'

export function AllTodosView() {
  const { todos, fetchTodos, loading } = useTodoStore()
  const { combos, fetchCombos } = useComboStore()
  const [filter, setFilter] = useState<Filter>('all')
  const [comboFilter, setComboFilter] = useState<number | null>(null)

  useEffect(() => {
    fetchTodos()
    fetchCombos()
  }, [fetchTodos, fetchCombos])

  const filtered = useMemo(() => {
    let list = todos.filter((t) => !t.isDeleted)
    if (comboFilter !== null) list = list.filter((t) => t.comboId === comboFilter)
    if (filter === 'completed') list = list.filter((t) => t.completed)
    if (filter === 'uncompleted') list = list.filter((t) => !t.completed)
    return list.sort((a, b) => (b.time || 0) - (a.time || 0))
  }, [todos, filter, comboFilter])

  return (
    <div className={styles.screen}>
      <div className={styles.head}>
        <div>
          <Eyebrow>ALL</Eyebrow>
          <h1 className={styles.title}>全部 <span className={styles.song}>待办</span></h1>
        </div>
        <Segmented
          size="small"
          options={[
            { label: '全部', value: 'all' },
            { label: '未完成', value: 'uncompleted' },
            { label: '已完成', value: 'completed' },
          ]}
          value={filter}
          onChange={(v) => setFilter(v as Filter)}
        />
      </div>

      <div className={styles.comboFilters}>
        <button
          className={[styles.comboBtn, comboFilter === null && styles.comboAct].filter(Boolean).join(' ')}
          onClick={() => setComboFilter(null)}
          type="button"
        >
          全部
        </button>
        {combos.map((c) => (
          <button
            key={c.id}
            className={[styles.comboBtn, comboFilter === c.id && styles.comboAct].filter(Boolean).join(' ')}
            onClick={() => setComboFilter(c.id)}
            type="button"
          >
            <span className={styles.dot} style={{ background: c.color }} />
            {c.name}
          </button>
        ))}
      </div>

      <Card>
        {loading && <div style={{ color: 'var(--mt)', padding: '20px 0' }}>加载中...</div>}
        {!loading && filtered.length === 0 && (
          <div style={{ color: 'var(--mt)', padding: '20px 0' }}>暂无待办</div>
        )}
        {filtered.map((t) => <TodoItem key={t.id} todo={t} />)}
      </Card>
    </div>
  )
}
