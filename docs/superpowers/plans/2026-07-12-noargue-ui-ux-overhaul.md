# NoArgue UI/UX Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the 5 core pages (Today, All Todos, Calendar, Stats, Combos) from "functional" to "mockup-grade refinement" by adding sparklines, priority bars, overdue indicators, a command palette, collaboration info (avatar groups + activity feed), and calendar cell todo previews — while preserving the existing dashboard structure and Pine green design language.

**Architecture:** Enhance existing pages in-place. Add 2 new design primitives (AvatarGroup, enhanced Stat) and 1 new feature module (CommandPalette). No backend changes required — activity feed uses mock data in this iteration, priority field already exists on the Todo type.

**Tech Stack:** React 18 + TypeScript strict + Vite 5 + Zustand + Ant Design 5 + CSS Modules + CSS Variables. No new dependencies.

---

## File Structure

### New files (4)
| File | Responsibility |
|------|----------------|
| `website/src/design/primitives/AvatarGroup.tsx` | Avatar stack component (overlapping circular avatars with +N overflow) |
| `website/src/design/primitives/AvatarGroup.module.css` | AvatarGroup styles |
| `website/src/features/cmd/CommandPalette.tsx` | ⌘K command palette overlay (search todos, jump pages, create todo) |
| `website/src/features/cmd/CommandPalette.module.css` | CommandPalette styles |

### Modified files (15)
| File | Changes |
|------|---------|
| `website/src/design/primitives/Stat.tsx` | Add `warn` + `spark` props |
| `website/src/design/primitives/Stat.module.css` | Add `.spark`, `.warn` rules |
| `website/src/design/primitives/index.ts` | Export AvatarGroup |
| `website/src/features/todo/TodoItem.tsx` | Add priority color bar, overdue text, avatar group |
| `website/src/features/todo/TodoItem.module.css` | Add `.priHigh/.priMed/.priLow::before`, `.overdue` rules |
| `website/src/features/todo/TodayView.tsx` | Add sparkline data, tag filter, avatar groups on todos |
| `website/src/features/todo/TodayView.module.css` | Add `.tagActive`, `.filterStatus` rules |
| `website/src/features/todo/AllTodosView.tsx` | Add sparkline data, avatar groups on todos |
| `website/src/features/todo/TodoForm.tsx` | Add priority selector (3 buttons) |
| `website/src/features/todo/TodoForm.module.css` | Add `.priBtn`, `.priAct` rules |
| `website/src/features/todo/CombosView.tsx` | Add avatar groups on cards, activity feed card |
| `website/src/features/todo/CombosView.module.css` | Add `.activity`, `.actItem` rules |
| `website/src/features/calendar/CalendarView.tsx` | Render todo title previews in day cells |
| `website/src/features/calendar/CalendarView.module.css` | Add `.cellTodo`, `.cellTodoDone`, `.cellTodoOver` rules |
| `website/src/features/stats/StatsView.tsx` | Add sparkline to top Stat cards |
| `website/src/features/layout/Topbar.tsx` | Wire search box click to open CommandPalette |
| `website/src/app/providers.tsx` | Mount CommandPalette globally |

---

## Task 1: Enhance Stat primitive with sparkline + warn

**Files:**
- Modify: `website/src/design/primitives/Stat.tsx`
- Modify: `website/src/design/primitives/Stat.module.css`

- [ ] **Step 1: Read current Stat.tsx to confirm current state**

Run: `cat website/src/design/primitives/Stat.tsx`
Expected: Exports `Stat({ label, value, delta, accent })` with no spark/warn props.

- [ ] **Step 2: Update Stat.tsx to add `warn` and `spark` props**

Replace the entire content of `website/src/design/primitives/Stat.tsx` with:

```tsx
import type { ReactNode } from 'react'
import styles from './Stat.module.css'

interface StatProps {
  label: string
  value: ReactNode
  delta?: ReactNode
  accent?: boolean
  warn?: boolean
  spark?: number[]
}

function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null
  const w = 56
  const h = 22
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const step = w / (data.length - 1)
  const points = data
    .map((v, i) => {
      const x = i * step
      const y = h - ((v - min) / range) * (h - 4) - 2
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  const last = data[data.length - 1]
  const first = data[0]
  const isUp = last >= first
  const color = isUp ? 'var(--success)' : 'var(--warn)'
  return (
    <svg className={styles.spark} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function Stat({ label, value, delta, accent, warn, spark }: StatProps) {
  const valueClass = [
    styles.value,
    accent && styles.acc,
    warn && styles.warn,
  ].filter(Boolean).join(' ')
  return (
    <div className={styles.stat}>
      <div className={styles.label}>{label}</div>
      <div className={valueClass}>{value}</div>
      {delta && <div className={styles.delta}>{delta}</div>}
      {spark && spark.length >= 2 && <Sparkline data={spark} />}
    </div>
  )
}
```

- [ ] **Step 3: Update Stat.module.css to add `.spark` and `.warn` rules**

Open `website/src/design/primitives/Stat.module.css` and add these rules at the end of the file:

```css
.spark {
  position: absolute;
  right: 12px;
  top: 14px;
  width: 56px;
  height: 22px;
  pointer-events: none;
}

.warn {
  color: var(--warn);
}
```

Also ensure `.stat` has `position: relative;` (add it if not present).

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd website && npx tsc --noEmit`
Expected: No errors related to Stat.tsx.

- [ ] **Step 5: Commit**

```bash
git add website/src/design/primitives/Stat.tsx website/src/design/primitives/Stat.module.css
git commit -m "feat(stat): add sparkline and warn props to Stat primitive"
```

---

## Task 2: Create AvatarGroup primitive

**Files:**
- Create: `website/src/design/primitives/AvatarGroup.tsx`
- Create: `website/src/design/primitives/AvatarGroup.module.css`
- Modify: `website/src/design/primitives/index.ts`

- [ ] **Step 1: Create AvatarGroup.module.css**

Write to `website/src/design/primitives/AvatarGroup.module.css`:

```css
.group {
  display: inline-flex;
  align-items: center;
}

.av {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1.5px solid var(--card);
  margin-left: -5px;
  display: grid;
  place-items: center;
  font: 600 9px/1 var(--font-sans);
  color: var(--fg);
  overflow: hidden;
  flex: none;
}

.av:first-child {
  margin-left: 0;
}

.av img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.more {
  background: var(--muted);
  color: var(--mt);
}
```

- [ ] **Step 2: Create AvatarGroup.tsx**

Write to `website/src/design/primitives/AvatarGroup.tsx`:

```tsx
import styles from './AvatarGroup.module.css'

export interface AvatarMember {
  id: number
  nickname: string
  avatarUrl?: string
}

interface AvatarGroupProps {
  members: AvatarMember[]
  max?: number
  size?: number
}

const AVATAR_COLORS = [
  '#5b8def', '#d97757', '#62d178', '#eab308',
  '#a78bfa', '#f87171', '#06b6d4', '#ec4899',
]

function colorFor(id: number): string {
  return AVATAR_COLORS[id % AVATAR_COLORS.length]
}

function initial(name: string): string {
  return (name || '?').slice(0, 1).toUpperCase()
}

export function AvatarGroup({ members, max = 3 }: AvatarGroupProps) {
  if (!members || members.length === 0) return null
  const visible = members.slice(0, max)
  const overflow = members.length - visible.length

  return (
    <div className={styles.group}>
      {visible.map((m) => (
        <div
          key={m.id}
          className={styles.av}
          style={{
            background: m.avatarUrl ? 'transparent' : colorFor(m.id),
            color: m.avatarUrl ? 'transparent' : 'var(--fg)',
          }}
          title={m.nickname}
        >
          {m.avatarUrl ? (
            <img src={m.avatarUrl} alt={m.nickname} />
          ) : (
            initial(m.nickname)
          )}
        </div>
      ))}
      {overflow > 0 && (
        <div className={`${styles.av} ${styles.more}`}>
          +{overflow}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Export AvatarGroup from index.ts**

In `website/src/design/primitives/index.ts`, add this line at the end:

```ts
export { AvatarGroup } from './AvatarGroup'
export type { AvatarMember } from './AvatarGroup'
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd website && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add website/src/design/primitives/AvatarGroup.tsx website/src/design/primitives/AvatarGroup.module.css website/src/design/primitives/index.ts
git commit -m "feat(primitives): add AvatarGroup component"
```

---

## Task 3: Add priority color bar + overdue indicator to TodoItem

**Files:**
- Modify: `website/src/features/todo/TodoItem.tsx`
- Modify: `website/src/features/todo/TodoItem.module.css`

- [ ] **Step 1: Read current TodoItem.module.css**

Run: `cat website/src/features/todo/TodoItem.module.css`
Expected: See current `.item`, `.check`, `.main`, `.title`, `.sub`, `.tag`, `.time`, `.star`, `.done` classes.

- [ ] **Step 3: Add priority bar + overdue CSS rules to TodoItem.module.css**

Append to `website/src/features/todo/TodoItem.module.css`:

```css
/* Priority color bar (left edge) */
.item {
  position: relative;
  padding-left: 10px;
}

.item::before {
  content: "";
  position: absolute;
  left: 0;
  top: 11px;
  bottom: 11px;
  width: 2px;
  background: var(--mt3);
}

.priHigh::before {
  background: var(--destructive);
}

.priMed::before {
  background: var(--warn);
}

/* Overdue text */
.overdue {
  color: var(--destructive);
  font: 500 10.5px/1 var(--font-mono);
}

/* Avatar group container */
.avatars {
  flex: none;
  margin-left: 8px;
}
```

- [ ] **Step 4: Update TodoItem.tsx to apply priority class, overdue text, and avatar group**

Replace the entire content of `website/src/features/todo/TodoItem.tsx` with:

```tsx
import { useNavigate } from 'react-router-dom'
import type { Todo } from '@/types'
import { useTodoStore } from '@/stores/todos'
import { useComboStore } from '@/stores/combos'
import { Tag, StatusChip, AvatarGroup } from '@/design/primitives'
import type { AvatarMember } from '@/design/primitives'
import { CheckIcon } from '@/design/icons'
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
  const combos = useComboStore((s) => s.combos)

  const combo = combos.find((c) => c.id === todo.comboId)
  const isDone = !!todo.completed
  const priClass = PRIORITY_CLASS[todo.priority || 'low'] || ''

  // Overdue calculation
  const today = todayStr()
  const isOverdue = !isDone && todo.setDate && todo.setDate < today
  const overdueDays = isOverdue
    ? Math.floor((Date.now() - new Date(todo.setDate!).getTime()) / 86400000)
    : 0
  const overdueText = isOverdue
    ? overdueDays === 0
      ? '今日到期'
      : `逾期 ${overdueDays} 天`
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
          {overdueText && <span className={styles.overdue}>{overdueText}</span>}
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
      >
        {todo.isStar ? '★' : '☆'}
      </button>
    </div>
  )
}
```

Note: The `priorityLabel` function and `<Tag tone="warn">` for priority are removed — priority is now communicated via the color bar, which is more subtle and avoids label clutter.

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd website && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add website/src/features/todo/TodoItem.tsx website/src/features/todo/TodoItem.module.css
git commit -m "feat(todo-item): add priority color bar, overdue text, avatar group slot"
```

---

## Task 4: Add sparklines + tag filter to TodayView

**Files:**
- Modify: `website/src/features/todo/TodayView.tsx`
- Modify: `website/src/features/todo/TodayView.module.css`

- [ ] **Step 1: Read current TodayView.module.css to confirm structure**

Run: `cat website/src/features/todo/TodayView.module.css`
Expected: See `.screen`, `.hero`, `.stats`, `.grid`, `.cardHead`, `.filters`, `.todoList`, `.sideCol`, `.tags` classes.

- [ ] **Step 2: Add tag-filter CSS rules to TodayView.module.css**

Append to `website/src/features/todo/TodayView.module.css`:

```css
/* Tag active state */
.tagActive {
  cursor: pointer;
}

/* Filter status indicator */
.filterStatus {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 9px;
  border: 1px solid var(--primary-line);
  background: var(--primary-soft);
  color: var(--primary-hi);
  font: 500 10.5px/1.4 var(--font-mono);
  margin-left: 8px;
}

.filterStatusX {
  cursor: pointer;
  font: 600 12px/1 var(--font-sans);
  padding: 0 2px;
}
```

Also add a `cursor: pointer` to the existing `.tags .tag`-like rule if not present. Since TodayView uses the `<Tag>` primitive, the tag is rendered as a span — we need to wrap it in a button. The CSS above handles the active state via class.

- [ ] **Step 3: Update TodayView.tsx to compute sparkline data, add tag filter, and pass members to TodoItem**

In `website/src/features/todo/TodayView.tsx`:

**3a. Add `activeTagId` state and sparkline data computation.**

Find the line `const [filter, setFilter] = useState<FilterKey>('all')` and add after it:

```tsx
const [activeTagId, setActiveTagId] = useState<number | null>(null)
```

**3b. Add sparkline data computation.**

After the `streak` useMemo block (around line 125), add:

```tsx
// Sparkline data: last 7 days
const sparkData = useMemo(() => {
  const days: string[] = []
  const d = new Date()
  for (let i = 6; i >= 0; i--) {
    const cur = new Date(d)
    cur.setDate(d.getDate() - i)
    days.push(formatDate(cur))
  }
  const dailyCounts = days.map((date) =>
    activeTodos.filter((t) => t.setDate === date).length,
  )
  const dailyCompleted = days.map((date) =>
    activeTodos.filter((t) => t.setDate === date && t.completed).length,
  )
  const dailyOverdue = days.map((date) =>
    activeTodos.filter(
      (t) => !t.completed && t.setDate && t.setDate < date,
    ).length,
  )
  const dailyRate = days.map((date) => {
    const dayTodos = activeTodos.filter((t) => t.setDate === date)
    if (dayTodos.length === 0) return 0
    return Math.round(
      (dayTodos.filter((t) => t.completed).length / dayTodos.length) * 100,
    )
  })
  return { dailyCounts, dailyCompleted, dailyOverdue, dailyRate }
}, [activeTodos])
```

Note: `formatDate` is already imported from `@/lib/utils`.

**3c. Update `filteredTodos` to also filter by tag.**

Replace the existing `filteredTodos` useMemo with:

```tsx
const filteredTodos = useMemo(() => {
  let result = todayTodos
  if (filter === 'uncompleted') result = result.filter((t) => !t.completed)
  if (filter === 'completed') result = result.filter((t) => t.completed)
  if (activeTagId !== null) {
    result = result.filter((t) => t.tags?.includes(activeTagId))
  }
  return result
}, [todayTodos, filter, activeTagId])
```

**3d. Update the Stat row to pass spark data.**

Replace the existing `<div className={styles.stats}>...</div>` block with:

```tsx
<div className={styles.stats}>
  <Stat
    label="今日待办"
    value={totalCount}
    delta={`${completedCount} 已完成`}
    spark={sparkData.dailyCounts}
  />
  <Stat
    label="本周完成"
    value={weekCompleted}
    accent
    delta={weekDeltaEl}
    spark={sparkData.dailyCompleted}
  />
  <Stat
    label="逾期"
    value={overdueCount}
    warn
    delta={<span className={styles.deltaDown}>需处理</span>}
    spark={sparkData.dailyOverdue}
  />
  <Stat
    label="完成率"
    value={<>{weekRate}<span className={styles.pctSign}>%</span></>}
    delta="目标 80%"
    spark={sparkData.dailyRate}
  />
</div>
```

**3e. Add tag filter indicator next to the filters in the card head.**

Find the `<div className={styles.filters}>` block and after the closing `</div>` of filters, add:

```tsx
{activeTagId !== null && (
  <div className={styles.filterStatus}>
    按「{[...systemTags, ...userTags].find((t) => t.id === activeTagId)?.name || ''}」筛选
    <span
      className={styles.filterStatusX}
      onClick={() => setActiveTagId(null)}
    >
      ×
    </span>
  </div>
)}
```

**3f. Make tags clickable.**

Find the tags card rendering block (the `<div className={styles.tags}>` with `tagCounts.map(...)`) and replace it with:

```tsx
<div className={styles.tags}>
  {tagCounts.map((t) => {
    const isActive = activeTagId === t.id
    return (
      <button
        key={t.id}
        type="button"
        className={styles.tagActive}
        onClick={() => setActiveTagId(isActive ? null : t.id)}
        style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
      >
        <Tag tone={isActive ? 'pri' : (t.count > 0 ? 'default' : 'default')}>
          {t.name} · {t.count}
        </Tag>
      </button>
    )
  })}
  <Tag tone="default">+ 新建</Tag>
</div>
```

**3g. Pass members to TodoItem.**

Since TodayView shows personal todos (not shared combo todos), we pass an empty members array or omit the prop. Find the `{filteredTodos.map((t) => (<TodoItem key={t.id} todo={t} />))}` line and keep it as-is — the `members` prop is optional and defaults to undefined, so no avatar group renders. This is correct for the Today view.

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd website && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add website/src/features/todo/TodayView.tsx website/src/features/todo/TodayView.module.css
git commit -m "feat(today): add sparklines, tag filter, warn-colored overdue stat"
```

---

## Task 5: Add sparklines to AllTodosView

**Files:**
- Modify: `website/src/features/todo/AllTodosView.tsx`

- [ ] **Step 1: Add sparkline data computation to AllTodosView.tsx**

In `website/src/features/todo/AllTodosView.tsx`, after the `stats` useMemo block (around line 49), add:

```tsx
// Sparkline data: last 7 days
const sparkData = useMemo(() => {
  const days: string[] = []
  const d = new Date()
  for (let i = 6; i >= 0; i--) {
    const cur = new Date(d)
    cur.setDate(d.getDate() - i)
    days.push(cur.toISOString().slice(0, 10))
  }
  const dailyTotal = days.map((date) =>
    activeTodos.filter((t) => t.setDate === date).length,
  )
  const dailyCompleted = days.map((date) =>
    activeTodos.filter((t) => t.setDate === date && t.completed).length,
  )
  const dailyOverdue = days.map((date) =>
    activeTodos.filter(
      (t) => !t.completed && t.setDate && t.setDate < date,
    ).length,
  )
  return { dailyTotal, dailyCompleted, dailyOverdue }
}, [activeTodos])
```

- [ ] **Step 2: Update the Stat row to pass spark data**

Replace the existing `<div className={styles.stats}>...</div>` block with:

```tsx
<div className={styles.stats}>
  <Stat
    label="总数"
    value={stats.total}
    delta="全部待办"
    spark={sparkData.dailyTotal}
  />
  <Stat
    label="已完成"
    value={stats.completed}
    accent
    delta={<span className={styles.deltaUp}>已完成</span>}
    spark={sparkData.dailyCompleted}
  />
  <Stat label="未完成" value={stats.uncompleted} delta="进行中" />
  <Stat
    label="逾期"
    value={stats.overdue}
    warn
    delta={<span className={styles.deltaDown}>需处理</span>}
    spark={sparkData.dailyOverdue}
  />
</div>
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd website && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add website/src/features/todo/AllTodosView.tsx
git commit -m "feat(all-todos): add sparklines and warn color to stats"
```

---

## Task 6: Add priority selector to TodoForm

**Files:**
- Modify: `website/src/features/todo/TodoForm.tsx`
- Modify: `website/src/features/todo/TodoForm.module.css`

- [ ] **Step 1: Add priority button CSS to TodoForm.module.css**

Append to `website/src/features/todo/TodoForm.module.css`:

```css
/* Priority selector */
.priBtns {
  display: flex;
  gap: 6px;
}

.priBtn {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--mt);
  font: 500 12px/1 var(--font-sans);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.priBtn:hover {
  border-color: var(--mt2);
  color: var(--fg);
}

.priAct {
  color: var(--fg);
}

.priActHigh {
  border-color: var(--destructive);
  background: rgba(255, 100, 103, 0.08);
  color: var(--destructive);
}

.priActMed {
  border-color: var(--warn);
  background: rgba(234, 179, 8, 0.08);
  color: var(--warn);
}

.priActLow {
  border-color: var(--mt2);
  background: var(--muted);
  color: var(--fg);
}

.priDot {
  width: 7px;
  height: 7px;
  flex: none;
}
```

- [ ] **Step 2: Add priority state and selector to TodoForm.tsx**

In `website/src/features/todo/TodoForm.tsx`:

**2a. Add priority state.**

Find the line `const [textValue, setTextValue] = useState('')` and add after it:

```tsx
const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('low')
```

**2b. Load priority in edit mode.**

In the `useEffect` block, inside the `if (mode === 'edit' && id)` branch, after `setSelectedCombo(t.comboId)`, add:

```tsx
setPriority((t.priority as 'high' | 'medium' | 'low') || 'low')
```

**2c. Include priority in submit data.**

In the `handleSubmit` function, find the `const data: Partial<Todo> = {` block and add `priority` to it:

```tsx
const data: Partial<Todo> = {
  text: values.text,
  remarks: values.remarks,
  setDate: values.setDate?.format('YYYY-MM-DD'),
  setTime: values.setTime?.format('HH:mm'),
  tags: selectedTags,
  comboId: selectedCombo,
  priority,
}
```

**2d. Add priority selector UI.**

Find the `{/* Tag selection */}` comment block. Before that block (after the combo selection `</div>` closing the section), add:

```tsx
{/* Priority selection */}
<div className={styles.section}>
  <div className={styles.fieldLabel}>优先级</div>
  <div className={styles.priBtns}>
    <button
      type="button"
      className={cn(
        styles.priBtn,
        priority === 'high' && styles.priAct,
        priority === 'high' && styles.priActHigh,
      )}
      onClick={() => setPriority('high')}
    >
      <span className={styles.priDot} style={{ background: 'var(--destructive)' }} />
      高
    </button>
    <button
      type="button"
      className={cn(
        styles.priBtn,
        priority === 'medium' && styles.priAct,
        priority === 'medium' && styles.priActMed,
      )}
      onClick={() => setPriority('medium')}
    >
      <span className={styles.priDot} style={{ background: 'var(--warn)' }} />
      中
    </button>
    <button
      type="button"
      className={cn(
        styles.priBtn,
        priority === 'low' && styles.priAct,
        priority === 'low' && styles.priActLow,
      )}
      onClick={() => setPriority('low')}
    >
      <span className={styles.priDot} style={{ background: 'var(--mt3)' }} />
      低
    </button>
  </div>
</div>
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd website && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add website/src/features/todo/TodoForm.tsx website/src/features/todo/TodoForm.module.css
git commit -m "feat(todo-form): add priority selector with 3 levels"
```

---

## Task 7: Render todo title previews in CalendarView day cells

**Files:**
- Modify: `website/src/features/calendar/CalendarView.tsx`
- Modify: `website/src/features/calendar/CalendarView.module.css`

- [ ] **Step 1: Add cell todo preview CSS to CalendarView.module.css**

Append to `website/src/features/calendar/CalendarView.module.css`:

```css
/* Todo preview inside day cell */
.cellTodos {
  margin-top: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cellTodo {
  padding: 1px 4px;
  font: 500 9px/1.3 var(--font-mono);
  color: var(--mt);
  background: var(--muted);
  border-left: 2px solid var(--mt3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cellTodoHigh {
  border-left-color: var(--destructive);
}

.cellTodoMed {
  border-left-color: var(--warn);
}

.cellTodoOver {
  border-left-color: var(--destructive);
  color: var(--destructive);
}

.cellTodoDone {
  opacity: 0.5;
  text-decoration: line-through;
}

.cellMore {
  padding: 1px 4px;
  font: 500 9px/1.3 var(--font-mono);
  color: var(--mt2);
}

/* Make day cell taller to accommodate previews */
.dayCell {
  min-height: 84px;
  align-items: flex-start;
  text-align: left;
  padding: 6px 6px;
  flex-direction: column;
}
```

Note: If `.dayCell` already has conflicting properties (like `align-items: center`), the above block overrides them. Check the existing CSS first — if `.dayCell` uses `display: flex; align-items: center; justify-content: center`, replace those properties to use the new layout above.

- [ ] **Step 2: Update CalendarView.tsx to render todo previews in day cells**

In `website/src/features/calendar/CalendarView.tsx`, find the `days.map` rendering block (around line 155). Currently it renders:

```tsx
{hasTodos && (
  <span className={cn(styles.dot, isToday && styles.dotToday)} />
)}
```

Replace the entire `{days.map((d) => { ... })}` block with:

```tsx
{days.map((d) => {
  const dateStr = d.format('YYYY-MM-DD')
  const inMonth = d.month() === current.month()
  const isToday = dateStr === todayStrVal
  const isSelected = dateStr === selectedDate
  const dayTodos = todosByDate[dateStr] || []
  const hasTodos = dayTodos.length > 0
  const visibleTodos = dayTodos.slice(0, 3)
  const remainingCount = dayTodos.length - visibleTodos.length

  return (
    <button
      key={dateStr}
      type="button"
      className={cn(
        styles.dayCell,
        !inMonth && styles.outOfMonth,
        isToday && styles.today,
        isSelected && !isToday && styles.selected,
      )}
      onClick={() => setSelectedDate(dateStr)}
    >
      <span className={styles.dayNum}>{d.date()}</span>
      {hasTodos && (
        <div className={styles.cellTodos}>
          {visibleTodos.map((t) => {
            const isDone = !!t.completed
            const isOver = !isDone && t.setDate && t.setDate < todayStrVal
            const priClass =
              t.priority === 'high' ? styles.cellTodoHigh
              : t.priority === 'medium' ? styles.cellTodoMed
              : ''
            return (
              <div
                key={t.id}
                className={cn(
                  styles.cellTodo,
                  priClass,
                  isOver && styles.cellTodoOver,
                  isDone && styles.cellTodoDone,
                )}
              >
                {t.text}
              </div>
            )
          })}
          {remainingCount > 0 && (
            <div className={styles.cellMore}>+{remainingCount} 更多</div>
          )}
        </div>
      )}
    </button>
  )
})}
```

Note: This removes the old dot indicator (`<span className={styles.dot} />`) and replaces it with actual todo title previews. The old `.dot` CSS class can remain in the CSS file (unused) — no need to remove it.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd website && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add website/src/features/calendar/CalendarView.tsx website/src/features/calendar/CalendarView.module.css
git commit -m "feat(calendar): render todo title previews in day cells"
```

---

## Task 8: Add sparklines to StatsView top stats

**Files:**
- Modify: `website/src/features/stats/StatsView.tsx`

- [ ] **Step 1: Add 30-day sparkline data computation to StatsView.tsx**

In `website/src/features/stats/StatsView.tsx`, after the `stats` useMemo block (around line 111), add:

```tsx
// Sparkline data: last 30 days (for top stats)
const sparkData = useMemo(() => {
  const days: string[] = []
  const d = new Date()
  for (let i = 29; i >= 0; i--) {
    const cur = new Date(d)
    cur.setDate(d.getDate() - i)
    days.push(formatDate(cur))
  }
  const dailyCompleted = days.map((date) =>
    activeTodos.filter((t) => t.setDate === date && t.completed).length,
  )
  const dailyRate = days.map((date) => {
    const dayTodos = activeTodos.filter((t) => t.setDate === date)
    if (dayTodos.length === 0) return 0
    return Math.round(
      (dayTodos.filter((t) => t.completed).length / dayTodos.length) * 100,
    )
  })
  const dailyTotal = days.map((date) =>
    activeTodos.filter((t) => t.setDate === date).length,
  )
  return { dailyCompleted, dailyRate, dailyTotal }
}, [activeTodos])
```

- [ ] **Step 2: Update the top Stat row to pass spark data**

Replace the existing `<div className={styles.stats}>...</div>` block (around line 336) with:

```tsx
<div className={styles.stats}>
  <Stat
    label="总待办"
    value={stats.total}
    delta="所选范围"
    spark={sparkData.dailyTotal}
  />
  <Stat
    label="已完成"
    value={stats.completed}
    accent
    delta={<span className={styles.deltaUp}>已完成</span>}
    spark={sparkData.dailyCompleted}
  />
  <Stat
    label="完成率"
    value={<>{stats.rate}<span className={styles.pctSign}>%</span></>}
    delta="目标 80%"
    spark={sparkData.dailyRate}
  />
  <Stat label="连续天数" value={stats.streak} accent delta="连续打卡" />
</div>
```

Note: The 4th stat (连续天数) does not get a sparkline since streak data is a single number, not a time series.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd website && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add website/src/features/stats/StatsView.tsx
git commit -m "feat(stats): add 30-day sparklines to top stat cards"
```

---

## Task 9: Add avatar groups + activity feed to CombosView

**Files:**
- Modify: `website/src/features/todo/CombosView.tsx`
- Modify: `website/src/features/todo/CombosView.module.css`

- [ ] **Step 1: Add activity feed + member CSS to CombosView.module.css**

Append to `website/src/features/todo/CombosView.module.css`:

```css
/* Members preview on combo card */
.comboMembers {
  margin-top: 6px;
}

/* Activity feed card */
.activity {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.actItem {
  display: flex;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border2);
  font: 500 11.5px/1.4 var(--font-sans);
  color: var(--mt);
}

.actItem:last-child {
  border-bottom: none;
}

.actAv {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  flex: none;
  display: grid;
  place-items: center;
  font: 600 10px/1 var(--font-sans);
  color: var(--fg);
  overflow: hidden;
}

.actBody {
  flex: 1;
  min-width: 0;
}

.actName {
  color: var(--fg);
  font-weight: 600;
}

.actTime {
  color: var(--mt2);
  font: 500 10px/1 var(--font-mono);
  margin-top: 2px;
}
```

- [ ] **Step 2: Update CombosView.tsx to import AvatarGroup and add mock activity data**

In `website/src/features/todo/CombosView.tsx`:

**2a. Add import for AvatarGroup.**

Find the existing import line `import { Button, Card, Eyebrow, Stat, StatusChip } from '@/design/primitives'` and replace it with:

```tsx
import { Button, Card, Eyebrow, Stat, StatusChip, AvatarGroup } from '@/design/primitives'
import type { AvatarMember } from '@/design/primitives'
```

**2b. Add mock activity data (module-level constant).**

After the `PRESET_COLORS` array (around line 20), add:

```tsx
const MOCK_ACTIVITIES = [
  {
    id: 1,
    user: { id: 1, nickname: 'Alice', avatarUrl: undefined },
    action: '完成了' as const,
    target: '设计评审会议',
    time: '10 分钟前',
    color: '#5b8def',
  },
  {
    id: 2,
    user: { id: 2, nickname: 'Bob', avatarUrl: undefined },
    action: '创建了' as const,
    target: 'API 文档撰写',
    time: '2 小时前',
    color: '#d97757',
  },
  {
    id: 3,
    user: { id: 3, nickname: 'Carol', avatarUrl: undefined },
    action: '评论了' as const,
    target: 'Q3 产品评审',
    time: '昨天',
    color: '#62d178',
  },
]

const MOCK_MEMBERS: AvatarMember[] = [
  { id: 1, nickname: 'Alice' },
  { id: 2, nickname: 'Bob' },
  { id: 3, nickname: 'Carol' },
  { id: 4, nickname: 'Dan' },
]
```

**2c. Add avatar group to combo cards.**

In the `renderComboCard` function, find the `<div className={styles.comboFoot}>` block. After the `<span className={styles.comboCount}>{count} 项待办</span>` line, add:

```tsx
{combo.isShared && (
  <div className={styles.comboMembers}>
    <AvatarGroup members={MOCK_MEMBERS} max={4} />
  </div>
)}
```

Note: For now we use mock members for all shared combos. In a future iteration this will come from the combo's actual member list.

- [ ] **Step 3: Add activity feed card to the shared combos section**

Find the shared combos `<Card>` block (the second one, around line 264). After the closing `</Card>` of the shared combos card, but before the `{/* Create/Edit modal */}` comment, add a new card:

```tsx
{/* Activity feed (mock) */}
<Card>
  <div className={styles.cardHead}>
    <div className={styles.cardHeadL}>
      <div className={styles.hdIc}>
        <ClockIcon />
      </div>
      <div>
        <Eyebrow>ACTIVITY</Eyebrow>
        <h3 className={styles.cardTitle}>
          最近 <span className={styles.song}>动态</span>
        </h3>
      </div>
    </div>
  </div>
  <div className={styles.activity}>
    {MOCK_ACTIVITIES.map((act) => (
      <div key={act.id} className={styles.actItem}>
        <div
          className={styles.actAv}
          style={{ background: act.color }}
        >
          {act.user.nickname.slice(0, 1)}
        </div>
        <div className={styles.actBody}>
          <div>
            <span className={styles.actName}>{act.user.nickname}</span>{' '}
            {act.action}「{act.target}」
          </div>
          <div className={styles.actTime}>{act.time}</div>
        </div>
      </div>
    ))}
  </div>
</Card>
```

**2d. Add ClockIcon to the imports.**

Find the import block:
```tsx
import {
  ListIcon,
  PlusIcon,
  TrashIcon,
  CheckIcon,
} from '@/design/icons'
```
Replace with:
```tsx
import {
  ListIcon,
  PlusIcon,
  TrashIcon,
  CheckIcon,
  ClockIcon,
} from '@/design/icons'
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd website && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add website/src/features/todo/CombosView.tsx website/src/features/todo/CombosView.module.css
git commit -m "feat(combos): add avatar groups on cards and activity feed"
```

---

## Task 10: Create CommandPalette component

**Files:**
- Create: `website/src/features/cmd/CommandPalette.tsx`
- Create: `website/src/features/cmd/CommandPalette.module.css`

- [ ] **Step 1: Create CommandPalette.module.css**

Write to `website/src/features/cmd/CommandPalette.module.css`:

```css
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 120px;
  z-index: 9999;
  animation: fadeIn 0.12s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.panel {
  width: 560px;
  max-width: calc(100vw - 32px);
  max-height: 480px;
  background: var(--card);
  border: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
}

.inputRow {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border);
}

.inputRow svg {
  width: 16px;
  height: 16px;
  color: var(--mt2);
  flex: none;
}

.input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--fg);
  font: 500 14px/1.4 var(--font-sans);
}

.input::placeholder {
  color: var(--mt2);
}

.results {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.group {
  padding: 0;
}

.groupLabel {
  padding: 8px 18px 4px;
  font: 500 10px/1 var(--font-mono);
  color: var(--mt2);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 18px;
  cursor: pointer;
  position: relative;
  color: var(--mt);
  font: 500 13px/1.3 var(--font-sans);
}

.item:hover {
  background: var(--muted);
  color: var(--fg);
}

.itemSel {
  background: var(--muted);
  color: var(--fg);
}

.itemSel::before {
  content: "";
  position: absolute;
  left: 0;
  top: 9px;
  bottom: 9px;
  width: 2px;
  background: var(--primary);
}

.itemIcon {
  width: 14px;
  height: 14px;
  flex: none;
  color: var(--mt2);
}

.itemMain {
  flex: 1;
  min-width: 0;
}

.itemTitle {
  color: inherit;
}

.itemSub {
  margin-top: 2px;
  font: 500 10px/1 var(--font-mono);
  color: var(--mt2);
}

.itemKbd {
  padding: 2px 6px;
  background: var(--bg);
  border: 1px solid var(--border);
  color: var(--mt);
  font: 500 10px/1 var(--font-mono);
}

.empty {
  padding: 24px 18px;
  text-align: center;
  color: var(--mt2);
  font: 500 12px/1.4 var(--font-sans);
}

/* Scrollbar */
.results::-webkit-scrollbar {
  width: 6px;
}

.results::-webkit-scrollbar-track {
  background: transparent;
}

.results::-webkit-scrollbar-thumb {
  background: var(--border);
}
```

- [ ] **Step 2: Create CommandPalette.tsx**

Write to `website/src/features/cmd/CommandPalette.tsx`:

```tsx
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
    const result: CmdItem[] = []
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
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd website && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add website/src/features/cmd/CommandPalette.tsx website/src/features/cmd/CommandPalette.module.css
git commit -m "feat(cmd): create CommandPalette component with search and navigation"
```

---

## Task 11: Mount CommandPalette globally and wire Topbar

**Files:**
- Modify: `website/src/app/providers.tsx`
- Modify: `website/src/features/layout/Topbar.tsx`

- [ ] **Step 1: Create a shared command palette state (simple context)**

Since CommandPalette needs to be opened from both Topbar (search click) and global ⌘K shortcut, we need a shared open state. We'll use a simple Zustand store to avoid prop drilling.

Create `website/src/stores/cmdPalette.ts`:

```tsx
import { create } from 'zustand'

interface CmdPaletteState {
  open: boolean
  setOpen: (open: boolean) => void
  toggle: () => void
}

export const useCmdPaletteStore = create<CmdPaletteState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
}))
```

- [ ] **Step 2: Mount CommandPalette in providers.tsx**

In `website/src/app/providers.tsx`, add imports at the top:

```tsx
import { CommandPalette } from '@/features/cmd/CommandPalette'
import { useCmdPaletteStore } from '@/stores/cmdPalette'
```

Then, inside the `Providers` component, after `<AntApp>{children}</AntApp>`, but before the closing `</ConfigProvider>`, add:

```tsx
<CommandPaletteWrapper />
```

And add this helper component at the bottom of the file (before the final closing brace):

```tsx
function CommandPaletteWrapper() {
  const { open, setOpen } = useCmdPaletteStore()
  return <CommandPalette open={open} onClose={() => setOpen(false)} />
}
```

The final Providers function should look like:

```tsx
export function Providers({ children }: { children: ReactNode }) {
  const [mode, setMode] = useThemeMode()
  const toggle = () => setMode(mode === 'dark' ? 'light' : 'dark')
  return (
    <ThemeModeContext.Provider value={{ mode, toggle }}>
      <ConfigProvider
        locale={zhCN}
        theme={{
          token: {
            colorPrimary: '#01796f',
            borderRadius: 0,
            fontFamily: 'Geist, -apple-system, "PingFang SC", system-ui, sans-serif',
          },
          algorithm: mode === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        }}
      >
        <AntApp>
          {children}
          <CommandPaletteWrapper />
        </AntApp>
      </ConfigProvider>
    </ThemeModeContext.Provider>
  )
}

function CommandPaletteWrapper() {
  const { open, setOpen } = useCmdPaletteStore()
  return <CommandPalette open={open} onClose={() => setOpen(false)} />
}
```

- [ ] **Step 3: Add global ⌘K listener in providers.tsx**

Inside the `Providers` component, before the `return`, add a useEffect for the keyboard shortcut:

```tsx
useEffect(() => {
  const onKey = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      useCmdPaletteStore.getState().toggle()
    }
  }
  window.addEventListener('keydown', onKey)
  return () => window.removeEventListener('keydown', onKey)
}, [])
```

Add `useEffect` to the import from 'react' at the top of the file (it's already imported).

- [ ] **Step 4: Wire Topbar search click to open CommandPalette**

In `website/src/features/layout/Topbar.tsx`:

**4a. Import the store.**

Add at the top:

```tsx
import { useCmdPaletteStore } from '@/stores/cmdPalette'
```

**4b. Use the store in the component.**

Inside the `Topbar` function, after the existing hooks, add:

```tsx
const setCmdOpen = useCmdPaletteStore((s) => s.setOpen)
```

**4c. Make the search input clickable.**

Find the `<input ref={searchRef} ... />` element and add an `onClick` handler:

```tsx
<input
  ref={searchRef}
  className={styles.input}
  placeholder="搜索待办、组合、标签..."
  onClick={() => setCmdOpen(true)}
  onKeyDown={(e) => {
    if (e.key === 'Escape') searchRef.current?.blur()
  }}
  readOnly
/>
```

Note: `readOnly` is added so clicking the input opens the palette instead of focusing the text field — all actual search happens in the palette.

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd website && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add website/src/stores/cmdPalette.ts website/src/app/providers.tsx website/src/features/layout/Topbar.tsx
git commit -m "feat(cmd): mount CommandPalette globally, wire ⌘K and search click"
```

---

## Task 12: Final verification and dev server smoke test

**Files:**
- No file changes — verification only

- [ ] **Step 1: Run full TypeScript check**

Run: `cd website && npx tsc --noEmit`
Expected: Zero errors.

- [ ] **Step 2: Start dev server and verify pages load**

Run: `cd website && npm run dev`
Expected: Server starts on http://localhost:5174 (or similar), no errors in console.

- [ ] **Step 3: Manual smoke test checklist**

Open the dev server URL in a browser and verify:

1. **Today page**: 4 Stat cards show sparklines in top-right; overdue stat is yellow; todo items have left-edge priority color bars; clicking a tag filters the todo list; ⌘K opens command palette
2. **All Todos page**: 4 Stat cards show sparklines; overdue stat is yellow
3. **Calendar page**: Day cells show todo title previews (up to 3) with priority color bars; overdue todos show red bar; completed todos are strikethrough
4. **Stats page**: Top 3 Stat cards show 30-day sparklines
5. **Combos page**: Shared combo cards show avatar groups; activity feed card appears below shared combos
6. **TodoForm**: Priority selector with 3 buttons (高/中/低) appears; selecting one highlights with appropriate color
7. **Command palette**: ⌘K opens it; typing filters actions and todos; arrow keys navigate; Enter executes; Esc closes; clicking Topbar search opens it

- [ ] **Step 4: Final commit (if any fixes were needed)**

If any fixes were made during smoke testing, commit them. Otherwise, skip this step.

```bash
git add -A
git commit -m "fix: smoke test fixes for UI/UX overhaul"
```

---

## Self-Review

### Spec coverage check
- [x] 3.1 Stat sparkline → Task 1 (primitive), Task 4 (Today), Task 5 (All), Task 8 (Stats)
- [x] 3.2 Overdue visual → Task 1 (warn prop), Task 3 (overdue text in TodoItem)
- [x] 3.3 Priority color bar → Task 3 (TodoItem), Task 6 (TodoForm selector)
- [x] 3.4 Tag filter → Task 4 (TodayView)
- [x] 3.5 Command palette → Task 10 (component), Task 11 (mount + wire)
- [x] 3.6 Avatar groups → Task 2 (primitive), Task 3 (TodoItem slot), Task 9 (CombosView)
- [x] 3.7 Activity feed → Task 9 (CombosView)
- [x] 3.8 Combo card members → Task 9 (CombosView)
- [x] 3.9 Calendar cell todos → Task 7 (CalendarView)
- [x] 3.10 Stats sparklines → Task 8 (StatsView)
- [x] 3.11 Hover transitions → Already present in existing CSS (verified during reading); no separate task needed

### Placeholder scan
- No "TBD", "TODO", or vague steps found.
- All code blocks contain complete, runnable code.

### Type consistency
- `AvatarMember` interface defined in Task 2, used in Task 3 and Task 9 — consistent.
- `CmdItem` interface defined in Task 10, used only in Task 10 — consistent.
- `spark?: number[]` prop on Stat defined in Task 1, used in Tasks 4, 5, 8 — consistent.
- `warn?: boolean` prop on Stat defined in Task 1, used in Tasks 4, 5 — consistent.
- `priority` field on Todo already exists in types/index.ts (line 28) — no type change needed.
- `useCmdPaletteStore` defined in Task 11, used in Task 11 — consistent.

### Gaps found and fixed
- None. All spec sections have corresponding tasks.
