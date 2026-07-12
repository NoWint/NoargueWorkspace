import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTodoStore } from '@/stores/todos'
import { SearchIcon, PlusIcon, CalendarIcon, ListIcon, ChartIcon } from '@/design/icons'
import { cn } from '@/lib/utils'
import styles from './CommandPalette.module.css'

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

interface CmdItem {
  id: string
  title: string
  subtitle?: string
  icon: 'todo' | 'new' | 'calendar' | 'list' | 'chart'
  kbd?: string
  action: () => void
}

const ICON_MAP = {
  todo: ListIcon,
  new: PlusIcon,
  calendar: CalendarIcon,
  list: ListIcon,
  chart: ChartIcon,
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate()
  const { todos } = useTodoStore()
  const [query, setQuery] = useState('')
  const [selIdx, setSelIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery('')
      setSelIdx(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Build command items
  const items = useMemo<CmdItem[]>(() => {
    const q = query.trim().toLowerCase()

    // Quick actions (always show, but filter by query)
    const actions: CmdItem[] = [
      {
        id: 'new',
        title: '新建待办',
        subtitle: '创建新的待办事项',
        icon: 'new',
        kbd: 'N',
        action: () => { navigate('/todos/new'); onClose() },
      },
      {
        id: 'goto-today',
        title: '跳转到今日',
        subtitle: '/ (首页)',
        icon: 'calendar',
        action: () => { navigate('/'); onClose() },
      },
      {
        id: 'goto-all',
        title: '跳转到全部待办',
        subtitle: '/todos',
        icon: 'list',
        action: () => { navigate('/todos'); onClose() },
      },
      {
        id: 'goto-calendar',
        title: '跳转到日历',
        subtitle: '/calendar',
        icon: 'calendar',
        action: () => { navigate('/calendar'); onClose() },
      },
      {
        id: 'goto-stats',
        title: '跳转到统计',
        subtitle: '/stats',
        icon: 'chart',
        action: () => { navigate('/stats'); onClose() },
      },
    ]

    const filteredActions = q
      ? actions.filter((a) => a.title.toLowerCase().includes(q))
      : actions

    // Todo results (only when query is non-empty)
    const todoResults: CmdItem[] = []
    if (q) {
      const activeTodos = todos.filter((t) => !t.isDeleted)
      const matched = activeTodos
        .filter((t) => t.text.toLowerCase().includes(q))
        .slice(0, 5)
      todoResults.push(
        ...matched.map((t) => ({
          id: `todo-${t.id}`,
          title: t.text,
          subtitle: t.setDate || undefined,
          icon: 'todo' as const,
          action: () => { navigate(`/todos/${t.id}`); onClose() },
        })),
      )
    }

    return [...filteredActions, ...todoResults]
  }, [query, todos, navigate, onClose])

  // Reset selection when items change
  useEffect(() => {
    setSelIdx(0)
  }, [query])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelIdx((i) => Math.min(i + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      items[selIdx]?.action()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  // Scroll selected item into view
  useEffect(() => {
    if (!resultsRef.current) return
    const sel = resultsRef.current.querySelector(`[data-idx="${selIdx}"]`)
    sel?.scrollIntoView({ block: 'nearest' })
  }, [selIdx])

  if (!open) return null

  // Group items: actions first, then todos
  const actionItems = items.filter((i) => !i.id.startsWith('todo-'))
  const todoItems = items.filter((i) => i.id.startsWith('todo-'))
  let runningIdx = 0

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.inputRow}>
          <SearchIcon />
          <input
            ref={inputRef}
            className={styles.input}
            placeholder="搜索待办、跳转页面、创建任务..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div className={styles.results} ref={resultsRef}>
          {items.length === 0 && (
            <div className={styles.empty}>
              {query ? `未找到匹配「${query}」的结果` : '开始输入以搜索'}
            </div>
          )}
          {actionItems.length > 0 && (
            <div className={styles.group}>
              <div className={styles.groupLabel}>快速操作</div>
              {actionItems.map((item) => {
                const idx = runningIdx++
                const Icon = ICON_MAP[item.icon]
                return (
                  <div
                    key={item.id}
                    data-idx={idx}
                    className={cn(styles.item, idx === selIdx && styles.itemSel)}
                    onClick={() => item.action()}
                    onMouseEnter={() => setSelIdx(idx)}
                  >
                    <Icon className={styles.itemIcon} />
                    <div className={styles.itemMain}>
                      <div className={styles.itemTitle}>{item.title}</div>
                      {item.subtitle && (
                        <div className={styles.itemSub}>{item.subtitle}</div>
                      )}
                    </div>
                    {item.kbd && <span className={styles.itemKbd}>{item.kbd}</span>}
                  </div>
                )
              })}
            </div>
          )}
          {todoItems.length > 0 && (
            <div className={styles.group}>
              <div className={styles.groupLabel}>待办</div>
              {todoItems.map((item) => {
                const idx = runningIdx++
                const Icon = ICON_MAP[item.icon]
                return (
                  <div
                    key={item.id}
                    data-idx={idx}
                    className={cn(styles.item, idx === selIdx && styles.itemSel)}
                    onClick={() => item.action()}
                    onMouseEnter={() => setSelIdx(idx)}
                  >
                    <Icon className={styles.itemIcon} />
                    <div className={styles.itemMain}>
                      <div className={styles.itemTitle}>{item.title}</div>
                      {item.subtitle && (
                        <div className={styles.itemSub}>{item.subtitle}</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
