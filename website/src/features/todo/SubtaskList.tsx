import { useState } from 'react'
import { useTodoStore } from '@/stores/todos'
import { CheckIcon, TrashIcon } from '@/design/icons'
import { cn } from '@/lib/utils'
import styles from './SubtaskList.module.css'

interface SubtaskListProps {
  parentId: string
}

export function SubtaskList({ parentId }: SubtaskListProps) {
  const subtaskMap = useTodoStore((s) => s.subtaskMap)
  const fetchSubtodos = useTodoStore((s) => s.fetchSubtodos)
  const createTodo = useTodoStore((s) => s.createTodo)
  const updateTodo = useTodoStore((s) => s.updateTodo)
  const deleteTodo = useTodoStore((s) => s.deleteTodo)
  const [input, setInput] = useState('')

  const subtasks = subtaskMap[parentId] || []
  const completedCount = subtasks.filter((t) => t.completed).length

  const handleAdd = async () => {
    const text = input.trim()
    if (!text) return
    setInput('')
    await createTodo({ text, parent_id: parentId, setDate: undefined })
    await fetchSubtodos(parentId)
  }

  const handleToggle = async (id: string, currentCompleted: number) => {
    await updateTodo(id, { completed: currentCompleted ? 0 : Date.now() })
    await fetchSubtodos(parentId)
  }

  const handleRemove = async (id: string) => {
    await deleteTodo(id)
    await fetchSubtodos(parentId)
  }

  return (
    <div>
      {subtasks.length > 0 && (
        <div className={styles.progress}>
          {completedCount} / {subtasks.length} 已完成
        </div>
      )}
      <div className={styles.list}>
        {subtasks.map((t) => {
          const isDone = !!t.completed
          return (
            <div key={t.id} className={styles.item}>
              <button
                type="button"
                className={cn(styles.check, isDone && styles.checkDone)}
                onClick={() => handleToggle(t.id, t.completed)}
              >
                {isDone && <CheckIcon strokeWidth={2.5} />}
              </button>
              <span className={cn(styles.text, isDone && styles.textDone)}>
                {t.text}
              </span>
              <button
                type="button"
                className={styles.remove}
                onClick={() => handleRemove(t.id)}
              >
                <TrashIcon />
              </button>
            </div>
          )
        })}
      </div>
      <div className={styles.addRow}>
        <input
          className={styles.addInput}
          placeholder="添加子任务，回车确认"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd()
          }}
        />
      </div>
    </div>
  )
}
