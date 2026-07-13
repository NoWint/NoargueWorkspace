import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTodoStore } from '@/stores/todos'
import { useComboStore } from '@/stores/combos'
import { useTagStore } from '@/stores/tags'
import { Card, Eyebrow } from '@/design/primitives'
import {
  SearchIcon,
  ListIcon,
  CheckIcon,
  TagIcon,
  TrashIcon,
} from '@/design/icons'
import { cn } from '@/lib/utils'
import styles from './SearchView.module.css'

type Filter = 'all' | 'todo' | 'combo' | 'tag'
const FILTER_LABELS: Record<Filter, string> = {
  all: '全部',
  todo: '待办',
  combo: '组合',
  tag: '标签',
}

const RECENT_KEY = 'noargue-recent-searches'
const MAX_RECENT = 8

interface TodoResult {
  type: 'todo'
  id: string
  title: string
  sub: string
}
interface ComboResult {
  type: 'combo'
  id: number
  title: string
  sub: string
}
interface TagResult {
  type: 'tag'
  id: number
  title: string
  sub: string
}
type SearchResult = TodoResult | ComboResult | TagResult

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.filter((s) => typeof s === 'string') : []
  } catch {
    return []
  }
}

function saveRecent(list: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)))
  } catch {
    // ignore
  }
}

/** Highlight matched keyword within text. */
function highlight(text: string, kw: string): ReactNode {
  if (!kw) return text
  const lower = text.toLowerCase()
  const kwl = kw.toLowerCase()
  const parts: ReactNode[] = []
  let i = 0
  let idx = lower.indexOf(kwl)
  let key = 0
  while (idx !== -1) {
    if (idx > i) parts.push(text.slice(i, idx))
    parts.push(
      <mark key={key++} className={styles.mark}>
        {text.slice(idx, idx + kw.length)}
      </mark>,
    )
    i = idx + kw.length
    idx = lower.indexOf(kwl, i)
  }
  if (i < text.length) parts.push(text.slice(i))
  return <>{parts}</>
}

const TYPE_META: Record<SearchResult['type'], { label: string; icon: ReactNode }> = {
  todo: { label: '待办', icon: <CheckIcon /> },
  combo: { label: '组合', icon: <ListIcon /> },
  tag: { label: '标签', icon: <TagIcon /> },
}

export function SearchView() {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const { todos, fetchTodos } = useTodoStore()
  const { combos, fetchCombos } = useComboStore()
  const { systemTags, userTags, fetchTags } = useTagStore()

  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [recent, setRecent] = useState<string[]>([])

  useEffect(() => {
    fetchTodos()
    fetchCombos()
    fetchTags()
    setRecent(loadRecent())
    // Autofocus on mount
    inputRef.current?.focus()
  }, [fetchTodos, fetchCombos, fetchTags])

  const kw = query.trim().toLowerCase()

  const results = useMemo<{ list: SearchResult[]; byType: Record<SearchResult['type'], SearchResult[]> }>(() => {
    const byType: Record<SearchResult['type'], SearchResult[]> = {
      todo: [],
      combo: [],
      tag: [],
    }
    if (!kw) return { list: [], byType }

    // Todos (exclude deleted)
    todos.forEach((t) => {
      if (t.isDeleted) return
      const inText = t.text?.toLowerCase().includes(kw)
      const inRemarks = t.remarks?.toLowerCase().includes(kw)
      if (inText || inRemarks) {
        const subParts: string[] = []
        if (t.setDate) subParts.push(t.setDate)
        if (t.setTime) subParts.push(t.setTime)
        if (t.remarks) subParts.push(t.remarks)
        byType.todo.push({
          type: 'todo',
          id: t.id,
          title: t.text,
          sub: subParts.join(' · '),
        })
      }
    })

    // Combos
    combos.forEach((c) => {
      const inName = c.name?.toLowerCase().includes(kw)
      const inDesc = c.description?.toLowerCase().includes(kw)
      if (inName || inDesc) {
        byType.combo.push({
          type: 'combo',
          id: c.id,
          title: c.name,
          sub: c.description || (c.isShared ? '共享组合' : '私有组合'),
        })
      }
    })

    // Tags
    ;[...systemTags, ...userTags].forEach((t) => {
      if (t.name?.toLowerCase().includes(kw)) {
        byType.tag.push({
          type: 'tag',
          id: t.id,
          title: t.name,
          sub: t.isSystem ? '系统标签' : '自定义标签',
        })
      }
    })

    const list = [...byType.todo, ...byType.combo, ...byType.tag]
    return { list, byType }
  }, [todos, combos, systemTags, userTags, kw])

  const visibleResults = useMemo(() => {
    if (filter === 'all') return results.list
    return results.byType[filter]
  }, [results, filter])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    const next = [q, ...recent.filter((r) => r !== q)].slice(0, MAX_RECENT)
    setRecent(next)
    saveRecent(next)
  }

  const pickRecent = (q: string) => {
    setQuery(q)
    inputRef.current?.focus()
  }

  const removeRecent = (q: string) => {
    const next = recent.filter((r) => r !== q)
    setRecent(next)
    saveRecent(next)
  }

  const onItemClick = (r: SearchResult) => {
    if (r.type === 'todo') navigate(`/todos/${r.id}`)
    else if (r.type === 'combo') navigate(`/combos/${r.id}`)
    else navigate('/todos')
  }

  const renderResult = (r: SearchResult) => {
    const meta = TYPE_META[r.type]
    return (
      <div
        key={`${r.type}-${r.id}`}
        className={styles.resultItem}
        onClick={() => onItemClick(r)}
      >
        <div className={styles.resultIcon}>{meta.icon}</div>
        <div className={styles.resultMain}>
          <div className={styles.resultTitle}>{highlight(r.title, query.trim())}</div>
          {r.sub && (
            <div className={styles.resultSub}>{highlight(r.sub, query.trim())}</div>
          )}
        </div>
        <span className={styles.resultBadge}>{meta.label}</span>
      </div>
    )
  }

  const renderGroup = (type: SearchResult['type'], label: string) => {
    const items = results.byType[type]
    if (items.length === 0) return null
    return (
      <Card>
        <div className={styles.cardHead}>
          <div className={styles.cardHeadL}>
            <Eyebrow>{label}</Eyebrow>
          </div>
          <span className={styles.resultBadge}>{items.length} 项</span>
        </div>
        <div className={styles.resultGroup}>{items.map(renderResult)}</div>
      </Card>
    )
  }

  const hasQuery = query.trim().length > 0
  const showRecent = !hasQuery && recent.length > 0
  const noResults = hasQuery && visibleResults.length === 0

  return (
    <div className={styles.screen}>
      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.hdRow}>
            <div className={styles.hdIc}>
              <SearchIcon />
            </div>
            <div>
              <Eyebrow>SEARCH</Eyebrow>
              <h1 className={styles.title}>
                搜索 <span className={styles.song}>查找</span>
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Search box */}
      <form className={styles.searchBox} onSubmit={handleSubmit}>
        <SearchIcon className={styles.searchIcon} />
        <input
          ref={inputRef}
          className={styles.searchInput}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索待办、组合、标签..."
          autoComplete="off"
          spellCheck={false}
        />
        <span className={styles.kbdHint}>⌘K</span>
      </form>

      {/* Filters (only when there's a query) */}
      {hasQuery && (
        <div className={styles.segWrap}>
          <div className={styles.seg}>
            {(Object.keys(FILTER_LABELS) as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                className={cn(styles.pill, filter === f && styles.pillAct)}
                onClick={() => setFilter(f)}
              >
                {FILTER_LABELS[f]}
                {f !== 'all' && results.byType[f].length > 0 && (
                  <span className={styles.pillCount}>
                    {results.byType[f].length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent searches (when input empty) */}
      {showRecent && (
        <div className={styles.recentRow}>
          <span className={styles.recentLabel}>最近搜索</span>
          {recent.map((q) => (
            <span key={q} className={styles.recentChip}>
              <span onClick={() => pickRecent(q)}>{q}</span>
              <button
                type="button"
                className={styles.recentDel}
                onClick={() => removeRecent(q)}
                aria-label="删除"
              >
                <TrashIcon />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Results */}
      {!hasQuery && recent.length === 0 && (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>
            <SearchIcon />
          </div>
          <div className={styles.emptyTitle}>输入关键词开始搜索</div>
          <div className={styles.emptySub}>
            支持搜索待办内容、备注、组合名称与标签
          </div>
        </div>
      )}

      {noResults && (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>
            <SearchIcon />
          </div>
          <div className={styles.emptyTitle}>未找到相关结果</div>
          <div className={styles.emptySub}>
            尝试更换关键词或检查拼写
          </div>
        </div>
      )}

      {/* Grouped results when filter = all */}
      {hasQuery && filter === 'all' && (
        <>
          {renderGroup('todo', 'TODOS · 待办')}
          {renderGroup('combo', 'COMBOS · 组合')}
          {renderGroup('tag', 'TAGS · 标签')}
        </>
      )}

      {/* Flat list when a specific filter is selected */}
      {hasQuery && filter !== 'all' && visibleResults.length > 0 && (
        <Card>
          <div className={styles.cardHead}>
            <div className={styles.cardHeadL}>
              <Eyebrow>{FILTER_LABELS[filter]}</Eyebrow>
            </div>
            <span className={styles.resultBadge}>{visibleResults.length} 项</span>
          </div>
          <div className={styles.resultGroup}>{visibleResults.map(renderResult)}</div>
        </Card>
      )}
    </div>
  )
}
