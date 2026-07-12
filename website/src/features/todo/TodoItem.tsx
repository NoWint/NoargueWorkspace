import { useNavigate } from 'react-router-dom'
import type { Todo } from '@/types'
import { useTodoStore } from '@/stores/todos'
import { useComboStore } from '@/stores/combos'
import { Tag, StatusChip } from '@/design/primitives'
import { CheckIcon } from '@/design/icons'
import { cn } from '@/lib/utils'
import styles from './TodoItem.module.css'

interface TodoItemProps {
  todo: Todo
}

function comboBorderColor(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return 'var(--border)'
  const n = parseInt(m[1], 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, 0.3)`
}

function priorityLabel(p?: string): string | null {
  if (!p) return null
  const map: Record<string, string> = {
    high: '高优先',
    medium: '中优先',
    low: '低优先',
  }
  return map[p] ?? p
}

export function TodoItem({ todo }: TodoItemProps) {
  const navigate = useNavigate()
  const toggleComplete = useTodoStore((s) => s.toggleComplete)
  const toggleStar = useTodoStore((s) => s.toggleStar)
  const combos = useComboStore((s) => s.combos)

  const combo = combos.find((c) => c.id === todo.comboId)
  const isDone = !!todo.completed
  const pri = priorityLabel(todo.priority)

  return (
    <div
      className={cn(styles.item, isDone && styles.done)}
      onClick={() => navigate(`/todos/${todo.id}`)}
    >
      <button
        className={styles.check}
        onClick={(e) => { e.stopPropagation(); toggleComplete(todo.id) }}
        type="button"
      >
        {isDone && <CheckIcon strokeWidth={2.5} />}
      </button>

      <div className={styles.main}>
        <div className={styles.title}>{todo.text}</div>
        <div className={styles.sub}>
          {combo && (
            <span
              className={styles.tag}
              style={{ color: combo.color, borderColor: comboBorderColor(combo.color) }}
            >
              {combo.name}
            </span>
          )}
          {pri && <Tag tone="warn">{pri}</Tag>}
          {todo.setTime && <span className={styles.time}>{todo.setTime}</span>}
        </div>
      </div>

      <StatusChip tone={isDone ? 'ok' : 'default'}>
        {isDone ? '已完成' : '待开始'}
      </StatusChip>

      <button
        className={cn(styles.star, todo.isStar && styles.starOn)}
        onClick={(e) => { e.stopPropagation(); toggleStar(todo.id) }}
        type="button"
      >
        {todo.isStar ? '★' : '☆'}
      </button>
    </div>
  )
}
