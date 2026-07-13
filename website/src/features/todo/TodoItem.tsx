import { useNavigate } from 'react-router-dom'
import type { Todo } from '@/types'
import { useTodoStore } from '@/stores/todos'
import { useComboStore } from '@/stores/combos'
import { StatusChip, AvatarGroup } from '@/design/primitives'
import type { AvatarMember } from '@/design/primitives'
import { CheckIcon, StarIcon } from '@/design/icons'
import { cn, todayStr } from '@/lib/utils'
import styles from './TodoItem.module.css'

interface TodoItemProps {
  todo: Todo
  members?: AvatarMember[]
}

function comboBorderColor(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return 'var(--border)'
  const n = parseInt(m[1], 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, 0.3)`
}

const PRIORITY_CLASS: Record<string, string> = {
  high: styles.priHigh,
  medium: styles.priMed,
  low: '',
}

export function TodoItem({ todo, members }: TodoItemProps) {
  const navigate = useNavigate()
  const toggleComplete = useTodoStore((s) => s.toggleComplete)
  const toggleStar = useTodoStore((s) => s.toggleStar)
  const subtaskMap = useTodoStore((s) => s.subtaskMap)
  const combos = useComboStore((s) => s.combos)

  const subtasks = subtaskMap[todo.id]
  const subtaskHint = subtasks && subtasks.length > 0
    ? `${subtasks.filter((t) => t.completed).length}/${subtasks.length} 子任务`
    : null

  const combo = combos.find((c) => c.id === todo.comboId)
  const isDone = !!todo.completed
  const priClass = PRIORITY_CLASS[todo.priority || 'low'] || ''

  // Overdue calculation
  const today = todayStr()
  const isToday = todo.setDate === today
  const isOverdue = !isDone && todo.setDate && todo.setDate < today
  const overdueDays = isOverdue
    ? Math.floor((Date.now() - new Date(todo.setDate!).getTime()) / 86400000)
    : 0
  const dueText = isOverdue
    ? `逾期 ${Math.max(overdueDays, 1)} 天`
    : isToday
      ? '今日到期'
      : null

  return (
    <div
      className={cn(styles.item, isDone && styles.done, priClass)}
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
          {todo.setTime && <span className={styles.time}>{todo.setTime}</span>}
          {dueText && <span className={styles.overdue}>{dueText}</span>}
          {subtaskHint && <span className={styles.subtaskHint}>{subtaskHint}</span>}
        </div>
      </div>

      {members && members.length > 0 && (
        <div className={styles.avatars}>
          <AvatarGroup members={members} max={3} />
        </div>
      )}

      <StatusChip tone={isDone ? 'ok' : 'default'}>
        {isDone ? '已完成' : '待开始'}
      </StatusChip>

      <button
        className={cn(styles.star, todo.isStar && styles.starOn)}
        onClick={(e) => { e.stopPropagation(); toggleStar(todo.id) }}
        type="button"
        aria-label={todo.isStar ? '取消收藏' : '收藏'}
      >
        <StarIcon className={styles.starIcon} />
      </button>
    </div>
  )
}
