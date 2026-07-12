import { useNavigate } from 'react-router-dom'
import type { Todo } from '@/types'
import { useTodoStore } from '@/stores/todos'
import { useComboStore } from '@/stores/combos'
import { Tag, StatusChip } from '@/design/primitives'
import styles from './TodoItem.module.css'

interface TodoItemProps {
  todo: Todo
}

export function TodoItem({ todo }: TodoItemProps) {
  const navigate = useNavigate()
  const toggleComplete = useTodoStore((s) => s.toggleComplete)
  const toggleStar = useTodoStore((s) => s.toggleStar)
  const combos = useComboStore((s) => s.combos)

  const combo = combos.find((c) => c.id === todo.comboId)
  const isDone = !!todo.completed

  return (
    <div
      className={[styles.item, isDone && styles.done].filter(Boolean).join(' ')}
      onClick={() => navigate(`/todos/${todo.id}`)}
    >
      <button
        className={styles.check}
        onClick={(e) => { e.stopPropagation(); toggleComplete(todo.id) }}
        type="button"
      >
        {isDone && (
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M3 8l3 3 6-7" />
          </svg>
        )}
      </button>

      <div className={styles.main}>
        <div className={styles.title}>{todo.text}</div>
        <div className={styles.sub}>
          {combo && <Tag tone="pri">{combo.name}</Tag>}
          {todo.setTime && <span className={styles.time}>{todo.setTime}</span>}
        </div>
      </div>

      <StatusChip tone={isDone ? 'ok' : 'default'}>
        {isDone ? '已完成' : '待办'}
      </StatusChip>

      <button
        className={[styles.star, todo.isStar && styles.starOn].filter(Boolean).join(' ')}
        onClick={(e) => { e.stopPropagation(); toggleStar(todo.id) }}
        type="button"
      >
        {todo.isStar ? '★' : '☆'}
      </button>
    </div>
  )
}
