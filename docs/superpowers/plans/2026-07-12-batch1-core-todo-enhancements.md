# 批次1：核心待办功能补齐 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 补齐网站版的数据同步、上传服务、批量操作、子任务、图片附件 5 个核心功能，使网站版功能与小程序对齐。所有改动限于 `website/` 目录。

**Architecture:** 先建 API 层（upload.ts、sync.ts、todos.ts 扩展），再建 Store 层（sync.ts store、todos.ts 扩展），然后建 UI 组件（SubtaskList、ImageUploader、BatchMode），最后集成到现有页面（Topbar、TodoForm、TodoDetail、TodoItem、AllTodosView）。类型修改贯穿始终。

**Tech Stack:** React 18 + TypeScript strict + Vite 5 + Zustand + Ant Design 5 + CSS Modules + tdesign-icons-react

---

## File Structure

### 新建文件
| 文件 | 职责 |
|------|------|
| `website/src/api/upload.ts` | 头像上传 + 待办图片上传 |
| `website/src/api/sync.ts` | 增量/全量同步 API |
| `website/src/stores/sync.ts` | 同步状态 Zustand store |
| `website/src/features/todo/SubtaskList.tsx` + `.module.css` | TodoDetail 子任务列表组件 |
| `website/src/features/todo/ImageUploader.tsx` + `.module.css` | TodoForm 图片上传组件 |
| `website/src/features/todo/BatchMode.tsx` + `.module.css` | 多选批量操作组件 |

### 修改文件
| 文件 | 修改内容 |
|------|---------|
| `website/src/design/icons.tsx` | 导出 RefreshIcon、UploadIcon、ImageIcon |
| `website/src/types/index.ts` | `parentId` 从 `number` 改为 `string` |
| `website/src/api/todos.ts` | 增加 `batchMove`、`getList` 支持 `parentId` |
| `website/src/stores/todos.ts` | 增加 `fetchSubtodos`、`batchMove`、`subtaskMap`、操作后 `markPending` |
| `website/src/features/layout/Topbar.tsx` + `.module.css` | 增加同步状态图标 |
| `website/src/features/todo/TodoForm.tsx` + `.module.css` | 增加子任务区 + 图片上传区 |
| `website/src/features/todo/TodoDetail.tsx` + `.module.css` | 增加子任务区块 + 图片画廊 |
| `website/src/features/todo/TodoItem.tsx` + `.module.css` | 增加子任务计数提示 |
| `website/src/features/todo/AllTodosView.tsx` + `.module.css` | 增加多选模式入口 |

---

### Task 1: 类型修改 + 图标导出

**Files:**
- Modify: `website/src/types/index.ts`
- Modify: `website/src/design/icons.tsx`

- [ ] **Step 1: 修改 parentId 类型**

In `website/src/types/index.ts`, find line 34:
```typescript
  parentId?: number
```
Replace with:
```typescript
  parentId?: string
```

- [ ] **Step 2: 导出新图标**

In `website/src/design/icons.tsx`, find the closing `} from 'tdesign-icons-react'` line. Add these 3 icons before the closing brace:

```typescript
  RefreshIcon,
  UploadIcon,
  ImageIcon,
```

The full file should end up looking like:
```typescript
export {
  CalendarIcon,
  CalendarEventIcon as CalendarCheckIcon,
  ViewListIcon as ListIcon,
  ChartIcon,
  StarIcon,
  SearchIcon,
  NotificationIcon as BellIcon,
  MoonIcon,
  SunnyIcon as SunIcon,
  AddIcon as PlusIcon,
  CheckIcon,
  TimeIcon as ClockIcon,
  TagIcon,
  DeleteIcon as TrashIcon,
  ChevronDownIcon,
  MicrophoneIcon as MicIcon,
  QueueIcon as BatchIcon,
  RefreshIcon,
  UploadIcon,
  ImageIcon,
} from 'tdesign-icons-react'
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd /Users/xiatian/Desktop/NoArgue/website && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/xiatian/Desktop/NoArgue && git add website/src/types/index.ts website/src/design/icons.tsx && git commit -m "refactor: change parentId type to string, export RefreshIcon/UploadIcon/ImageIcon"
```

---

### Task 2: API 层 — upload.ts + sync.ts + todos.ts 扩展

**Files:**
- Create: `website/src/api/upload.ts`
- Create: `website/src/api/sync.ts`
- Modify: `website/src/api/todos.ts`

- [ ] **Step 1: 创建 upload.ts**

Write to `website/src/api/upload.ts`:
```typescript
import http from './request'

export const uploadApi = {
  /** 上传头像到后端 /upload/avatar */
  uploadAvatar: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return http.post<{ url: string }>('/upload/avatar', form)
  },
  /** 上传待办图片到第三方图床 img.scdn.io */
  uploadTodoImage: async (file: File): Promise<string> => {
    const form = new FormData()
    form.append('image', file)
    const res = await fetch('https://img.scdn.io/api/v1.php', {
      method: 'POST',
      body: form,
    })
    const data = await res.json()
    if (!data.url) throw new Error(data.error || '图片上传失败')
    return data.url as string
  },
}
```

- [ ] **Step 2: 创建 sync.ts**

Write to `website/src/api/sync.ts`:
```typescript
import http from './request'
import type { Todo } from '@/types'

export interface SyncResponse {
  cloudChanges: Todo[]
  cloudDeletedIds: string[]
  syncedAt: number
}

export const syncApi = {
  /** 增量同步 */
  incremental: (data: {
    localChanges: Todo[]
    localDeletedIds: string[]
    lastSyncAt: number | null
  }) => http.post<SyncResponse>('/todos/sync', data),

  /** 全量同步 */
  full: () =>
    http.get<{ todos: Todo[]; syncedAt: number }>('/todos/full-sync'),
}
```

- [ ] **Step 3: 扩展 todos.ts — 增加 batchMove 和 parentId 参数**

In `website/src/api/todos.ts`, find the `getList` params type (lines 5-14):
```typescript
  getList: (params?: {
    page?: number
    size?: number
    pageSize?: number
    comboId?: number | string
    tagIds?: string
    search?: string
    showCompleted?: boolean
    date?: string
  }) =>
    http.get<TodoListResponse>('/todos/list', { params }),
```

Replace with (adding `parentId`):
```typescript
  getList: (params?: {
    page?: number
    size?: number
    pageSize?: number
    comboId?: number | string
    tagIds?: string
    search?: string
    showCompleted?: boolean
    date?: string
    parentId?: string
  }) =>
    http.get<TodoListResponse>('/todos/list', { params }),
```

Then find the closing `}` of the `todosApi` object (after `permanentDelete`). Add `batchMove` before the closing `}`:

```typescript
  batchMove: (todoIds: string[], comboId: number | null) =>
    http.post<{ success: boolean; message?: string }>('/todos/batch-move', { todoIds, comboId }),
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd /Users/xiatian/Desktop/NoArgue/website && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/xiatian/Desktop/NoArgue && git add website/src/api/upload.ts website/src/api/sync.ts website/src/api/todos.ts && git commit -m "feat(api): add upload, sync APIs and batchMove/parentId to todos"
```

---

### Task 3: Store 层 — sync.ts store + todos.ts 扩展

**Files:**
- Create: `website/src/stores/sync.ts`
- Modify: `website/src/stores/todos.ts`

- [ ] **Step 1: 创建 sync store**

Write to `website/src/stores/sync.ts`:
```typescript
import { create } from 'zustand'
import { syncApi } from '@/api/sync'
import { useTodoStore } from './todos'

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error'

interface SyncState {
  status: SyncStatus
  lastSyncAt: number | null
  pendingChanges: boolean
  errorMsg: string | null
  syncNow: () => Promise<void>
  fullSync: () => Promise<void>
  markPending: () => void
  clearPending: () => void
  resetStatus: () => void
}

export const useSyncStore = create<SyncState>((set, get) => ({
  status: 'idle',
  lastSyncAt: null,
  pendingChanges: false,
  errorMsg: null,

  syncNow: async () => {
    const { lastSyncAt } = get()
    if (lastSyncAt === null) {
      await get().fullSync()
      return
    }
    set({ status: 'syncing', errorMsg: null })
    try {
      const todos = useTodoStore.getState().todos
      const localChanges = todos.filter(
        (t) => (t.updatedAt || 0) > lastSyncAt,
      )
      const res = await syncApi.incremental({
        localChanges,
        localDeletedIds: [],
        lastSyncAt,
      })
      // Merge cloud changes
      if (res.cloudChanges && res.cloudChanges.length > 0) {
        const existing = useTodoStore.getState().todos
        const cloudMap = new Map(res.cloudChanges.map((t) => [t.id, t]))
        const merged = existing.map((t) => {
          const cloud = cloudMap.get(t.id)
          if (cloud && (cloud.version || 0) >= (t.version || 0)) return cloud
          return t
        })
        // Add new cloud todos not in local
        for (const cloud of res.cloudChanges) {
          if (!existing.find((t) => t.id === cloud.id)) {
            merged.push(cloud)
          }
        }
        useTodoStore.setState({ todos: merged })
      }
      set({
        status: 'success',
        lastSyncAt: res.syncedAt || Date.now(),
        pendingChanges: false,
        errorMsg: null,
      })
      setTimeout(() => get().resetStatus(), 2000)
    } catch (err) {
      set({
        status: 'error',
        errorMsg: err instanceof Error ? err.message : '同步失败',
      })
    }
  },

  fullSync: async () => {
    set({ status: 'syncing', errorMsg: null })
    try {
      const res = await syncApi.full()
      useTodoStore.setState({ todos: res.todos || [] })
      set({
        status: 'success',
        lastSyncAt: res.syncedAt || Date.now(),
        pendingChanges: false,
        errorMsg: null,
      })
      setTimeout(() => get().resetStatus(), 2000)
    } catch (err) {
      set({
        status: 'error',
        errorMsg: err instanceof Error ? err.message : '全量同步失败',
      })
    }
  },

  markPending: () => set({ pendingChanges: true }),
  clearPending: () => set({ pendingChanges: false }),
  resetStatus: () => set({ status: 'idle' }),
}))
```

- [ ] **Step 2: 扩展 todos store — 增加 subtaskMap、fetchSubtodos、batchMove、markPending 集成**

In `website/src/stores/todos.ts`, replace the ENTIRE file with:

```typescript
import { create } from 'zustand'
import type { Todo } from '@/types'
import { todosApi } from '@/api/todos'
import { useSyncStore } from './sync'

type Filter = 'all' | 'today' | 'completed' | 'uncompleted' | 'starred'

interface TodoState {
  todos: Todo[]
  loading: boolean
  filter: Filter
  subtaskMap: Record<string, Todo[]>
  setFilter: (f: Filter) => void
  fetchTodos: () => Promise<void>
  fetchSubtodos: (parentId: string) => Promise<void>
  createTodo: (data: Partial<Todo>) => Promise<Todo>
  updateTodo: (id: string, data: Partial<Todo>) => Promise<void>
  deleteTodo: (id: string) => Promise<void>
  toggleComplete: (id: string) => Promise<void>
  toggleStar: (id: string) => Promise<void>
  restoreTodo: (id: string) => Promise<void>
  permanentDelete: (id: string) => Promise<void>
  batchMove: (todoIds: string[], comboId: number | null) => Promise<void>
}

export const useTodoStore = create<TodoState>((set, get) => ({
  todos: [],
  loading: false,
  filter: 'all',
  subtaskMap: {},

  setFilter: (f) => set({ filter: f }),

  fetchTodos: async () => {
    try {
      set({ loading: true })
      const res = await todosApi.getList()
      set({ todos: res.todos || [] })
    } finally {
      set({ loading: false })
    }
  },

  fetchSubtodos: async (parentId) => {
    const res = await todosApi.getList({ parentId })
    set({
      subtaskMap: {
        ...get().subtaskMap,
        [parentId]: res.todos || [],
      },
    })
  },

  createTodo: async (data) => {
    const res = await todosApi.create(data)
    if (res.success && res.todo) {
      set({ todos: [...get().todos, res.todo] })
      useSyncStore.getState().markPending()
      return res.todo
    }
    throw new Error(res.message || '创建失败')
  },

  updateTodo: async (id, data) => {
    const res = await todosApi.update(id, {
      ...data,
      version: (get().todos.find((t) => t.id === id)?.version || 1) + 1,
      updatedAt: Date.now(),
    })
    if (res.success && res.todo) {
      set({
        todos: get().todos.map((t) => (t.id === id ? res.todo! : t)),
      })
      useSyncStore.getState().markPending()
    }
  },

  deleteTodo: async (id) => {
    await todosApi.delete(id)
    set({
      todos: get().todos.map((t) =>
        t.id === id ? { ...t, isDeleted: true, updatedAt: Date.now() } : t,
      ),
    })
    useSyncStore.getState().markPending()
  },

  toggleComplete: async (id) => {
    const todo = get().todos.find((t) => t.id === id)
    if (!todo) return
    const newCompleted = todo.completed ? 0 : Date.now()
    await get().updateTodo(id, { completed: newCompleted })
  },

  toggleStar: async (id) => {
    const todo = get().todos.find((t) => t.id === id)
    if (!todo) return
    await get().updateTodo(id, { isStar: !todo.isStar })
  },

  restoreTodo: async (id) => {
    const res = await todosApi.restore(id)
    if (res.success) {
      set({
        todos: get().todos.map((t) =>
          t.id === id ? { ...t, isDeleted: false, updatedAt: Date.now() } : t,
        ),
      })
      useSyncStore.getState().markPending()
    }
  },

  permanentDelete: async (id) => {
    await todosApi.permanentDelete(id)
    set({ todos: get().todos.filter((t) => t.id !== id) })
  },

  batchMove: async (todoIds, comboId) => {
    await todosApi.batchMove(todoIds, comboId)
    set({
      todos: get().todos.map((t) =>
        todoIds.includes(t.id)
          ? { ...t, comboId: comboId || undefined, updatedAt: Date.now() }
          : t,
      ),
    })
    useSyncStore.getState().markPending()
  },
}))
```

Note: There's a circular import between `stores/sync.ts` and `stores/todos.ts`. This works in practice because both use `getState()` (runtime access, not top-level), and Zustand's `create` returns a function that's hoisted. The import is only for type/getInstance access at call-time, not at module-load-time. This is a common Zustand pattern.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd /Users/xiatian/Desktop/NoArgue/website && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/xiatian/Desktop/NoArgue && git add website/src/stores/sync.ts website/src/stores/todos.ts && git commit -m "feat(store): add sync store, subtaskMap, fetchSubtodos, batchMove to todo store"
```

---

### Task 4: Topbar 同步状态图标

**Files:**
- Modify: `website/src/features/layout/Topbar.tsx`
- Modify: `website/src/features/layout/Topbar.module.css`

- [ ] **Step 1: 增加 CSS 样式**

Append to the END of `website/src/features/layout/Topbar.module.css`:

```css

/* Sync button */
.syncBtn {
  width: 28px;
  height: 28px;
  color: var(--mt);
  display: grid;
  place-items: center;
  cursor: pointer;
  position: relative;
  border: 0;
  background: transparent;
}
.syncBtn:hover { color: var(--fg); }
.syncBtn:disabled { cursor: not-allowed; opacity: 0.5; }
.syncBtn svg { width: 14px; height: 14px; }
.syncSpinning { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.syncDot {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--warn);
}
.syncOk { color: var(--success); }
.syncErr { color: var(--destructive); }
.syncTooltip {
  font-size: 11px;
}
```

- [ ] **Step 2: 更新 Topbar 组件**

In `website/src/features/layout/Topbar.tsx`, replace the ENTIRE file with:

```tsx
import { useRef, useState } from 'react'
import { Tooltip } from 'antd'
import { useThemeToggle } from '@/app/providers'
import { SearchIcon, BellIcon, MoonIcon, SunIcon, RefreshIcon } from '@/design/icons'
import { cn } from '@/lib/utils'
import { useCmdPaletteStore } from '@/stores/cmdPalette'
import { useSyncStore } from '@/stores/sync'
import styles from './Topbar.module.css'

const VIEWS = ['列表', '看板', '时间线'] as const
type View = (typeof VIEWS)[number]

export function Topbar() {
  const { mode, toggle } = useThemeToggle()
  const [view, setView] = useState<View>('列表')
  const searchRef = useRef<HTMLInputElement>(null)
  const setCmdOpen = useCmdPaletteStore((s) => s.setOpen)
  const { status, pendingChanges, errorMsg, syncNow } = useSyncStore()

  const syncLabel =
    status === 'syncing' ? '同步中...'
    : status === 'success' ? '同步成功'
    : status === 'error' ? `同步失败：${errorMsg || '未知错误'}`
    : pendingChanges ? '有未同步变更，点击同步'
    : '点击同步'

  return (
    <div className={styles.topbar}>
      <div className={styles.search}>
        <SearchIcon className={styles.searchIcon} />
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
        <span className={styles.kbd}>⌘K</span>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.seg}>
          {VIEWS.map((v) => (
            <button
              key={v}
              type="button"
              className={cn(styles.pill, view === v && styles.pillAct)}
              onClick={() => setView(v)}
            >
              {v}
            </button>
          ))}
        </div>
        <Tooltip title={syncLabel} placement="bottom">
          <button
            className={cn(
              styles.syncBtn,
              status === 'syncing' && styles.syncSpinning,
              status === 'success' && styles.syncOk,
              status === 'error' && styles.syncErr,
            )}
            onClick={() => syncNow()}
            disabled={status === 'syncing'}
            type="button"
          >
            <RefreshIcon />
            {pendingChanges && status === 'idle' && (
              <span className={styles.syncDot} />
            )}
          </button>
        </Tooltip>
        <button className={styles.iconBtn} type="button" title="通知">
          <BellIcon />
        </button>
        <button
          className={styles.iconBtn}
          onClick={toggle}
          type="button"
          title="主题"
        >
          {mode === 'dark' ? <MoonIcon /> : <SunIcon />}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd /Users/xiatian/Desktop/NoArgue/website && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/xiatian/Desktop/NoArgue && git add website/src/features/layout/Topbar.tsx website/src/features/layout/Topbar.module.css && git commit -m "feat(topbar): add sync status button with manual sync trigger"
```

---

### Task 5: ImageUploader 组件

**Files:**
- Create: `website/src/features/todo/ImageUploader.tsx`
- Create: `website/src/features/todo/ImageUploader.module.css`

- [ ] **Step 1: 创建 CSS**

Write to `website/src/features/todo/ImageUploader.module.css`:

```css
.uploader {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.thumb {
  position: relative;
  width: 80px;
  height: 80px;
  border: 1px solid var(--border);
  overflow: hidden;
  flex: none;
}

.thumbImg {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.thumbRemove {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 18px;
  height: 18px;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  border: 0;
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
}

.thumbUploading {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.4);
}

.uploadBtn {
  width: 80px;
  height: 80px;
  border: 1px dashed var(--mt3);
  background: transparent;
  color: var(--mt2);
  display: grid;
  place-items: center;
  cursor: pointer;
  flex: none;
}

.uploadBtn:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.uploadBtn svg {
  width: 20px;
  height: 20px;
}

.uploadBtn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.hint {
  font: 500 10px/1 var(--font-mono);
  color: var(--mt2);
  margin-top: 4px;
}
```

- [ ] **Step 2: 创建组件**

Write to `website/src/features/todo/ImageUploader.tsx`:

```tsx
import { useRef, useState } from 'react'
import { message } from 'antd'
import { uploadApi } from '@/api/upload'
import { UploadIcon } from '@/design/icons'
import styles from './ImageUploader.module.css'

interface ImageUploaderProps {
  images: string[]
  onChange: (images: string[]) => void
  max?: number
}

export function ImageUploader({ images, onChange, max = 9 }: ImageUploaderProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null)

  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const remaining = max - images.length
    if (remaining <= 0) {
      message.warning(`最多上传 ${max} 张图片`)
      return
    }

    const toUpload = files.slice(0, remaining)
    e.target.value = '' // reset for re-select

    for (let i = 0; i < toUpload.length; i++) {
      setUploadingIdx(i)
      try {
        const url = await uploadApi.uploadTodoImage(toUpload[i])
        onChange([...images, url])
      } catch (err) {
        message.error(err instanceof Error ? err.message : '图片上传失败')
      }
    }
    setUploadingIdx(null)
  }

  const handleRemove = (idx: number) => {
    const next = images.filter((_, i) => i !== idx)
    onChange(next)
  }

  const canAdd = images.length < max

  return (
    <div>
      <div className={styles.uploader}>
        {images.map((url, idx) => (
          <div key={idx} className={styles.thumb}>
            <img src={url} alt="" className={styles.thumbImg} />
            <button
              type="button"
              className={styles.thumbRemove}
              onClick={() => handleRemove(idx)}
            >
              ×
            </button>
          </div>
        ))}
        {uploadingIdx !== null && (
          <div className={styles.thumb}>
            <div className={styles.thumbUploading}>
              <UploadIcon className={styles.uploadIconSpin} />
            </div>
          </div>
        )}
        {canAdd && (
          <button
            type="button"
            className={styles.uploadBtn}
            onClick={() => fileRef.current?.click()}
            disabled={uploadingIdx !== null}
          >
            <UploadIcon />
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={handleSelect}
        />
      </div>
      <div className={styles.hint}>
        {images.length} / {max} 张图片
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd /Users/xiatian/Desktop/NoArgue/website && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/xiatian/Desktop/NoArgue && git add website/src/features/todo/ImageUploader.tsx website/src/features/todo/ImageUploader.module.css && git commit -m "feat(todo): create ImageUploader component for todo image attachments"
```

---

### Task 6: SubtaskList 组件

**Files:**
- Create: `website/src/features/todo/SubtaskList.tsx`
- Create: `website/src/features/todo/SubtaskList.module.css`

- [ ] **Step 1: 创建 CSS**

Write to `website/src/features/todo/SubtaskList.module.css`:

```css
.list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.item {
  display: grid;
  grid-template-columns: 16px 1fr auto;
  gap: 10px;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
}

.item:last-child {
  border-bottom: 0;
}

.check {
  width: 16px;
  height: 16px;
  border: 1px solid var(--mt3);
  display: grid;
  place-items: center;
  cursor: pointer;
  background: transparent;
  padding: 0;
  flex: none;
}

.checkDone {
  background: var(--primary);
  border-color: var(--primary);
}

.check svg {
  width: 10px;
  height: 10px;
  color: var(--primary-fg);
}

.text {
  font-size: 13px;
  color: var(--fg);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.textDone {
  color: var(--mt2);
  text-decoration: line-through;
}

.remove {
  color: var(--mt2);
  cursor: pointer;
  border: 0;
  background: transparent;
  font-size: 14px;
  padding: 2px 4px;
}

.remove:hover {
  color: var(--destructive);
}

.addRow {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.addInput {
  flex: 1;
  height: 30px;
  border: 1px solid var(--border);
  background: var(--input);
  color: var(--fg);
  font-size: 13px;
  padding: 0 10px;
  outline: none;
}

.addInput:focus {
  border-color: var(--primary-line);
}

.addInput::placeholder {
  color: var(--mt2);
}

.progress {
  font: 500 10.5px/1 var(--font-mono);
  color: var(--mt2);
  margin-bottom: 8px;
}
```

- [ ] **Step 2: 创建组件**

Write to `website/src/features/todo/SubtaskList.tsx`:

```tsx
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
    await createTodo({ text, parentId, setDate: undefined })
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
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd /Users/xiatian/Desktop/NoArgue/website && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/xiatian/Desktop/NoArgue && git add website/src/features/todo/SubtaskList.tsx website/src/features/todo/SubtaskList.module.css && git commit -m "feat(todo): create SubtaskList component for subtask management"
```

---

### Task 7: BatchMode 组件

**Files:**
- Create: `website/src/features/todo/BatchMode.tsx`
- Create: `website/src/features/todo/BatchMode.module.css`

- [ ] **Step 1: 创建 CSS**

Write to `website/src/features/todo/BatchMode.module.css`:

```css
.bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border: 1px solid var(--primary-line);
  background: var(--primary-soft);
  margin-bottom: 8px;
}

.count {
  font: 500 11.5px/1 var(--font-sans);
  color: var(--primary-hi);
  flex: none;
}

.actions {
  display: flex;
  gap: 6px;
  margin-left: auto;
}

.btn {
  height: 24px;
  padding: 0 10px;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--mt);
  font: 500 11px/1 var(--font-sans);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.btn:hover {
  color: var(--fg);
  border-color: var(--mt3);
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.btnPri {
  background: var(--primary);
  color: var(--primary-fg);
  border-color: var(--primary);
}

.btnPri:hover {
  background: var(--primary-hi);
  color: var(--primary-fg);
  border-color: var(--primary-hi);
}

.btnPri:disabled {
  background: var(--mt3);
  border-color: var(--mt3);
}

.btnIcon {
  width: 11px;
  height: 11px;
  flex: none;
}
```

- [ ] **Step 2: 创建组件**

Write to `website/src/features/todo/BatchMode.tsx`:

```tsx
import { useState } from 'react'
import { Modal, message } from 'antd'
import { useTodoStore } from '@/stores/todos'
import { useComboStore } from '@/stores/combos'
import { BatchIcon } from '@/design/icons'
import { cn } from '@/lib/utils'
import styles from './BatchMode.module.css'

interface BatchModeProps {
  selectedIds: string[]
  onDone: () => void
  onCancel: () => void
}

export function BatchMode({ selectedIds, onDone, onCancel }: BatchModeProps) {
  const batchMove = useTodoStore((s) => s.batchMove)
  const combos = useComboStore((s) => s.combos)
  const [modalOpen, setModalOpen] = useState(false)
  const [moving, setMoving] = useState(false)

  const handleMove = async (comboId: number | null) => {
    setMoving(true)
    try {
      await batchMove(selectedIds, comboId)
      message.success(`已移动 ${selectedIds.length} 项`)
      setModalOpen(false)
      onDone()
    } catch (err) {
      message.error(err instanceof Error ? err.message : '移动失败')
    } finally {
      setMoving(false)
    }
  }

  return (
    <>
      <div className={styles.bar}>
        <span className={styles.count}>已选 {selectedIds.length} 项</span>
        <div className={styles.actions}>
          <button
            type="button"
            className={cn(styles.btn, styles.btnPri)}
            disabled={selectedIds.length === 0}
            onClick={() => setModalOpen(true)}
          >
            <BatchIcon className={styles.btnIcon} />
            移动到组合
          </button>
          <button
            type="button"
            className={styles.btn}
            onClick={onCancel}
          >
            取消
          </button>
        </div>
      </div>

      <Modal
        title="选择目标组合"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={420}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 0' }}>
          <button
            type="button"
            onClick={() => handleMove(null)}
            disabled={moving}
            style={{
              padding: '8px 12px',
              border: '1px solid var(--border)',
              background: 'var(--card)',
              cursor: 'pointer',
              textAlign: 'left',
              color: 'var(--fg)',
              font: '500 12.5px/1.3 var(--font-sans)',
            }}
          >
            移出组合
          </button>
          {combos.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => handleMove(c.id)}
              disabled={moving}
              style={{
                padding: '8px 12px',
                border: '1px solid var(--border)',
                background: 'var(--card)',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: 'var(--fg)',
                font: '500 12.5px/1.3 var(--font-sans)',
              }}
            >
              <span style={{ width: 8, height: 8, background: c.color, flex: 'none' }} />
              {c.name}
            </button>
          ))}
        </div>
      </Modal>
    </>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd /Users/xiatian/Desktop/NoArgue/website && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/xiatian/Desktop/NoArgue && git add website/src/features/todo/BatchMode.tsx website/src/features/todo/BatchMode.module.css && git commit -m "feat(todo): create BatchMode component for multi-select batch operations"
```

---

### Task 8: TodoForm 集成子任务 + 图片上传

**Files:**
- Modify: `website/src/features/todo/TodoForm.tsx`
- Modify: `website/src/features/todo/TodoForm.module.css`

- [ ] **Step 1: 增加 CSS 样式**

Append to the END of `website/src/features/todo/TodoForm.module.css`:

```css

/* Subtasks */
.subtaskList {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.subtaskItem {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border: 1px solid var(--border);
  background: var(--bg);
}

.subtaskText {
  flex: 1;
  font-size: 12.5px;
  color: var(--fg);
}

.subtaskRemove {
  color: var(--mt2);
  cursor: pointer;
  border: 0;
  background: transparent;
  font-size: 14px;
  padding: 2px 4px;
}

.subtaskRemove:hover {
  color: var(--destructive);
}

.subtaskInput {
  height: 30px;
  border: 1px solid var(--border);
  background: var(--input);
  color: var(--fg);
  font-size: 13px;
  padding: 0 10px;
  outline: none;
}

.subtaskInput:focus {
  border-color: var(--primary-line);
}

.subtaskInput::placeholder {
  color: var(--mt2);
}
```

- [ ] **Step 2: 更新 TodoForm — 增加子任务和图片状态**

In `website/src/features/todo/TodoForm.tsx`, find the import section (lines 1-13). Add these imports after line 13 (`import styles from './TodoForm.module.css'`):

```tsx
import { ImageUploader } from './ImageUploader'
import { useSyncStore } from '@/stores/sync'
```

Wait — we don't need `useSyncStore` directly in TodoForm (the store's `createTodo`/`updateTodo` already calls `markPending` internally). Remove that import. Only add:

```tsx
import { ImageUploader } from './ImageUploader'
```

Actually, let me be more precise. After the existing imports, add only:

```tsx
import { ImageUploader } from './ImageUploader'
```

Find line 39 (`const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('low')`). Add IMMEDIATELY AFTER it:

```tsx
  const [subtasks, setSubtasks] = useState<{ id?: string; text: string }[]>([])
  const [subtaskInput, setSubtaskInput] = useState('')
  const [images, setImages] = useState<string[]>([])
  const fetchSubtodos = useTodoStore((s) => s.fetchSubtodos)
```

- [ ] **Step 3: 更新 TodoForm — 编辑模式加载子任务和图片**

Find the `useEffect` block. Inside the `if (mode === 'edit' && id)` branch, find the line:
```tsx
          setPriority((t.priority as 'high' | 'medium' | 'low') || 'low')
```

Add IMMEDIATELY AFTER it:

```tsx
          setImages(t.images || [])
          fetchSubtodos(id).then(() => {
            const subs = useTodoStore.getState().subtaskMap[id] || []
            setSubtasks(subs.map((s) => ({ id: s.id, text: s.text })))
          })
```

- [ ] **Step 4: 更新 TodoForm — 提交逻辑增加 images 和子任务处理**

Find the `handleSubmit` function. Find the `const data: Partial<Todo> = {` block and replace it to add `images`:

```tsx
      const data: Partial<Todo> = {
        text: values.text,
        remarks: values.remarks,
        setDate: values.setDate?.format('YYYY-MM-DD'),
        setTime: values.setTime?.format('HH:mm'),
        tags: selectedTags,
        comboId: selectedCombo,
        priority,
        images,
      }
```

Then find the section after the create/update logic:
```tsx
      if (mode === 'create') {
        await createTodo(data)
        message.success('创建成功')
      } else if (id) {
        await updateTodo(id, data)
        message.success('更新成功')
      }
      navigate('/')
```

Replace with (adding subtask handling):

```tsx
      let mainTodoId: string | undefined
      if (mode === 'create') {
        const created = await createTodo(data)
        mainTodoId = created.id
        message.success('创建成功')
      } else if (id) {
        await updateTodo(id, data)
        mainTodoId = id
        message.success('更新成功')
      }
      // Handle subtasks
      if (mainTodoId) {
        // Fetch existing subtasks in edit mode to diff
        if (mode === 'edit') {
          await fetchSubtodos(mainTodoId)
          const existing = useTodoStore.getState().subtaskMap[mainTodoId] || []
          const existingIds = new Set(existing.map((s) => s.id))
          const keptIds = new Set(subtasks.filter((s) => s.id).map((s) => s.id))
          // Delete removed subtasks
          for (const ex of existing) {
            if (!keptIds.has(ex.id)) {
              await useTodoStore.getState().deleteTodo(ex.id)
            }
          }
          // Update changed subtasks
          for (const sub of subtasks) {
            if (sub.id && existingIds.has(sub.id)) {
              const orig = existing.find((s) => s.id === sub.id)
              if (orig && orig.text !== sub.text) {
                await useTodoStore.getState().updateTodo(sub.id, { text: sub.text })
              }
            }
          }
        }
        // Create new subtasks
        for (const sub of subtasks) {
          if (!sub.id) {
            await createTodo({ text: sub.text, parentId: mainTodoId })
          }
        }
      }
      navigate('/')
```

- [ ] **Step 5: 更新 TodoForm — 增加子任务和图片 UI**

Find the Tag selection section closing `</div>` followed by the form actions:

```tsx
            {/* Tag selection (Tag primitive with toggle) */}
            <div className={styles.section}>
              <div className={styles.fieldLabel}>标签</div>
              <div className={styles.chips}>
                {allTags.map((t) => {
                  const active = selectedTags.includes(t.id)
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={styles.tagBtn}
                      onClick={() => {
                        setSelectedTags((prev) =>
                          prev.includes(t.id)
                            ? prev.filter((x) => x !== t.id)
                            : [...prev, t.id],
                        )
                      }}
                    >
                      <Tag tone={active ? 'pri' : 'default'}>{t.name}</Tag>
                    </button>
                  )
                })}
                {allTags.length === 0 && (
                  <span className={styles.emptyHint}>暂无标签</span>
                )}
              </div>
            </div>

            {/* Submit / cancel (primitive Button) */}
```

Replace with (inserting subtask and image sections between tags and submit):

```tsx
            {/* Tag selection (Tag primitive with toggle) */}
            <div className={styles.section}>
              <div className={styles.fieldLabel}>标签</div>
              <div className={styles.chips}>
                {allTags.map((t) => {
                  const active = selectedTags.includes(t.id)
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={styles.tagBtn}
                      onClick={() => {
                        setSelectedTags((prev) =>
                          prev.includes(t.id)
                            ? prev.filter((x) => x !== t.id)
                            : [...prev, t.id],
                        )
                      }}
                    >
                      <Tag tone={active ? 'pri' : 'default'}>{t.name}</Tag>
                    </button>
                  )
                })}
                {allTags.length === 0 && (
                  <span className={styles.emptyHint}>暂无标签</span>
                )}
              </div>
            </div>

            {/* Image attachments */}
            <div className={styles.section}>
              <div className={styles.fieldLabel}>图片附件</div>
              <ImageUploader images={images} onChange={setImages} />
            </div>

            {/* Subtasks */}
            <div className={styles.section}>
              <div className={styles.fieldLabel}>子任务</div>
              <div className={styles.subtaskList}>
                {subtasks.map((s, i) => (
                  <div key={i} className={styles.subtaskItem}>
                    <span className={styles.subtaskText}>{s.text}</span>
                    <button
                      type="button"
                      className={styles.subtaskRemove}
                      onClick={() => setSubtasks(subtasks.filter((_, idx) => idx !== i))}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <input
                  className={styles.subtaskInput}
                  placeholder="添加子任务，回车确认"
                  value={subtaskInput}
                  onChange={(e) => setSubtaskInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const text = subtaskInput.trim()
                      if (text) {
                        setSubtasks([...subtasks, { text }])
                        setSubtaskInput('')
                      }
                    }
                  }}
                />
              </div>
            </div>

            {/* Submit / cancel (primitive Button) */}
```

- [ ] **Step 6: Verify TypeScript compiles**

Run: `cd /Users/xiatian/Desktop/NoArgue/website && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 7: Commit**

```bash
cd /Users/xiatian/Desktop/NoArgue && git add website/src/features/todo/TodoForm.tsx website/src/features/todo/TodoForm.module.css && git commit -m "feat(todo-form): add subtask input and image upload to todo form"
```

---

### Task 9: TodoDetail 集成子任务 + 图片画廊

**Files:**
- Modify: `website/src/features/todo/TodoDetail.tsx`
- Modify: `website/src/features/todo/TodoDetail.module.css`

- [ ] **Step 1: 增加 CSS 样式**

Append to the END of `website/src/features/todo/TodoDetail.module.css`:

```css

/* Image gallery */
.gallery {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.galleryImg {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border: 1px solid var(--border);
  cursor: pointer;
}

.galleryImg :global(img) {
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
}
```

- [ ] **Step 2: 更新 TodoDetail imports**

In `website/src/features/todo/TodoDetail.tsx`, find the import section. Add these imports after line 25 (`import styles from './TodoDetail.module.css'`):

```tsx
import { Image as AntImage } from 'antd'
import { SubtaskList } from './SubtaskList'
import { useSyncStore } from '@/stores/sync'
```

Wait — `useSyncStore` is not needed in TodoDetail. Remove it. Add only:

```tsx
import { Image as AntImage } from 'antd'
import { SubtaskList } from './SubtaskList'
```

Also need to import `useEffect` (already imported on line 1).

- [ ] **Step 3: 更新 TodoDetail — 加载子任务**

Find the `useEffect` block (lines 56-65). Replace it with:

```tsx
  useEffect(() => {
    fetchTags()
    if (!id) return
    todosApi
      .getById(id)
      .then((res) => {
        if (res.success && res.todo) setTodo(res.todo)
      })
      .finally(() => setLoading(false))
    fetchSubtodos(id)
  }, [id, fetchTags, fetchSubtodos])
```

And add `fetchSubtodos` from store. Find line 50-52:

```tsx
  const toggleComplete = useTodoStore((s) => s.toggleComplete)
  const toggleStar = useTodoStore((s) => s.toggleStar)
  const deleteTodo = useTodoStore((s) => s.deleteTodo)
```

Add after them:

```tsx
  const fetchSubtodos = useTodoStore((s) => s.fetchSubtodos)
```

- [ ] **Step 4: 更新 TodoDetail — 增加子任务和图片画廊区块**

Find the Action footer card section. Before it (after the Tags card closing `</Card>` and before the `{/* Action footer card */}` comment), insert two new cards:

Find:
```tsx
      {/* Action footer card */}
      <Card>
        <div className={styles.actionFooter}>
```

Insert BEFORE it:

```tsx
      {/* Subtasks card */}
      <Card>
        <div className={styles.cardHead}>
          <div className={styles.cardHeadL}>
            <div className={styles.hdIc}>
              <CheckIcon />
            </div>
            <div>
              <Eyebrow>SUBTASKS</Eyebrow>
              <h3 className={styles.cardTitle}>
                子 <span className={styles.song}>任务</span>
              </h3>
            </div>
          </div>
        </div>
        {id && <SubtaskList parentId={id} />}
      </Card>

      {/* Image gallery card */}
      {todo.images && todo.images.length > 0 && (
        <Card>
          <div className={styles.cardHead}>
            <div className={styles.cardHeadL}>
              <div className={styles.hdIc}>
                <CheckIcon />
              </div>
              <div>
                <Eyebrow>IMAGES</Eyebrow>
                <h3 className={styles.cardTitle}>
                  图片 <span className={styles.song}>附件</span>
                </h3>
              </div>
            </div>
          </div>
          <AntImage.PreviewGroup>
            <div className={styles.gallery}>
              {todo.images.map((url, i) => (
                <AntImage
                  key={i}
                  src={url}
                  className={styles.galleryImg}
                  width="100%"
                  height="100%"
                />
              ))}
            </div>
          </AntImage.PreviewGroup>
        </Card>
      )}

      {/* Action footer card */}
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd /Users/xiatian/Desktop/NoArgue/website && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
cd /Users/xiatian/Desktop/NoArgue && git add website/src/features/todo/TodoDetail.tsx website/src/features/todo/TodoDetail.module.css && git commit -m "feat(todo-detail): add subtask list and image gallery to todo detail"
```

---

### Task 10: TodoItem 子任务计数提示

**Files:**
- Modify: `website/src/features/todo/TodoItem.tsx`
- Modify: `website/src/features/todo/TodoItem.module.css`

- [ ] **Step 1: 增加 CSS 样式**

Append to the END of `website/src/features/todo/TodoItem.module.css`:

```css

/* Subtask count hint */
.subtaskHint {
  font: 500 10px/1 var(--font-mono);
  color: var(--mt2);
}
```

- [ ] **Step 2: 更新 TodoItem — 显示子任务计数**

In `website/src/features/todo/TodoItem.tsx`, find the store access section (around line 31-33):

```tsx
  const toggleComplete = useTodoStore((s) => s.toggleComplete)
  const toggleStar = useTodoStore((s) => s.toggleStar)
  const combos = useComboStore((s) => s.combos)
```

Add after them:

```tsx
  const subtaskMap = useTodoStore((s) => s.subtaskMap)
  const subtasks = subtaskMap[todo.id]
  const subtaskHint = subtasks && subtasks.length > 0
    ? `${subtasks.filter((t) => t.completed).length}/${subtasks.length} 子任务`
    : null
```

Then find the `<div className={styles.sub}>` section (around lines 66-77). Find the line:

```tsx
          {overdueText && <span className={styles.overdue}>{overdueText}</span>}
```

Add IMMEDIATELY AFTER it:

```tsx
          {subtaskHint && <span className={styles.subtaskHint}>{subtaskHint}</span>}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd /Users/xiatian/Desktop/NoArgue/website && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/xiatian/Desktop/NoArgue && git add website/src/features/todo/TodoItem.tsx website/src/features/todo/TodoItem.module.css && git commit -m "feat(todo-item): show subtask count hint when subtaskMap has data"
```

---

### Task 11: AllTodosView 批量操作模式

**Files:**
- Modify: `website/src/features/todo/AllTodosView.tsx`
- Modify: `website/src/features/todo/AllTodosView.module.css`

- [ ] **Step 1: 增加 CSS 样式**

Append to the END of `website/src/features/todo/AllTodosView.module.css`:

```css

/* Batch mode */
.batchToggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 22px;
  padding: 0 8px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--mt);
  font: 500 10.5px/1 var(--font-mono);
  cursor: pointer;
}

.batchToggle:hover {
  color: var(--fg);
  border-color: var(--mt3);
}

.batchToggleAct {
  color: var(--primary);
  border-color: var(--primary-line);
  background: var(--primary-soft);
}

.batchCheck {
  width: 16px;
  height: 16px;
  border: 1px solid var(--mt3);
  display: grid;
  place-items: center;
  cursor: pointer;
  background: transparent;
  padding: 0;
  flex: none;
  margin-right: 8px;
}

.batchCheckOn {
  background: var(--primary);
  border-color: var(--primary);
}

.batchCheck svg {
  width: 10px;
  height: 10px;
  color: var(--primary-fg);
}

.itemSel {
  background: var(--primary-soft);
}

.batchIcon {
  width: 11px;
  height: 11px;
  flex: none;
}
```

- [ ] **Step 2: 更新 AllTodosView — 增加多选模式状态**

In `website/src/features/todo/AllTodosView.tsx`, find the import section. Add after line 8 (`import { TodoItem } from './TodoItem'`):

```tsx
import { BatchMode } from './BatchMode'
import { CheckIcon, BatchIcon } from '@/design/icons'
```

Find the state declarations (around line 29-31):
```tsx
  const [filter, setFilter] = useState<Filter>('all')
  const [comboFilter, setComboFilter] = useState<number | null>(null)
  const [sort, setSort] = useState<Sort>('newest')
```

Add after them:

```tsx
  const [batchMode, setBatchMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
```

- [ ] **Step 3: 更新 AllTodosView — 渲染多选模式 UI**

Find the card head section with the segmented control (around lines 150-174). Find:

```tsx
          <div className={styles.seg}>
            {(Object.keys(FILTER_LABELS) as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                className={cn(styles.pill, filter === f && styles.pillAct)}
                onClick={() => setFilter(f)}
              >
                {FILTER_LABELS[f]}
              </button>
            ))}
          </div>
```

Replace with (adding batch toggle button):

```tsx
          <div className={styles.cardHeadR}>
            <div className={styles.seg}>
              {(Object.keys(FILTER_LABELS) as Filter[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  className={cn(styles.pill, filter === f && styles.pillAct)}
                  onClick={() => setFilter(f)}
                >
                  {FILTER_LABELS[f]}
                </button>
              ))}
            </div>
            <button
              type="button"
              className={cn(styles.batchToggle, batchMode && styles.batchToggleAct)}
              onClick={() => {
                setBatchMode(!batchMode)
                setSelectedIds([])
              }}
            >
              <BatchIcon className={styles.batchIcon} />
              {batchMode ? '退出批量' : '批量管理'}
            </button>
          </div>
```

Find the todo list rendering section. Find:

```tsx
          <div className={styles.todoList}>
            {loading && (
```

Insert BEFORE it (the batch mode bar, only shown when batchMode is true):

```tsx
          {batchMode && (
            <BatchMode
              selectedIds={selectedIds}
              onDone={() => {
                setBatchMode(false)
                setSelectedIds([])
                fetchTodos()
              }}
              onCancel={() => {
                setBatchMode(false)
                setSelectedIds([])
              }}
            />
          )}

```

Find the todo item rendering:

```tsx
            {filtered.map((t) => (
              <TodoItem key={t.id} todo={t} />
            ))}
```

Replace with (adding batch mode selection):

```tsx
            {filtered.map((t) => (
              <div
                key={t.id}
                className={cn(
                  styles.todoRow,
                  batchMode && selectedIds.includes(t.id) && styles.itemSel,
                )}
                onClick={batchMode ? (e) => {
                  e.stopPropagation()
                  setSelectedIds((prev) =>
                    prev.includes(t.id)
                      ? prev.filter((id) => id !== t.id)
                      : [...prev, t.id],
                  )
                } : undefined}
                style={batchMode ? { display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '0 4px' } : undefined}
              >
                {batchMode && (
                  <button
                    type="button"
                    className={cn(
                      styles.batchCheck,
                      selectedIds.includes(t.id) && styles.batchCheckOn,
                    )}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedIds((prev) =>
                        prev.includes(t.id)
                          ? prev.filter((id) => id !== t.id)
                          : [...prev, t.id],
                      )
                    }}
                  >
                    {selectedIds.includes(t.id) && <CheckIcon strokeWidth={2.5} />}
                  </button>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <TodoItem todo={t} />
                </div>
              </div>
            ))}
```

- [ ] **Step 4: 增加 .cardHeadR CSS**

In `website/src/features/todo/AllTodosView.module.css`, find the `.cardHead` rule. Add after it:

```css
.cardHeadR {
  display: flex;
  align-items: center;
  gap: 8px;
}
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd /Users/xiatian/Desktop/NoArgue/website && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
cd /Users/xiatian/Desktop/NoArgue && git add website/src/features/todo/AllTodosView.tsx website/src/features/todo/AllTodosView.module.css && git commit -m "feat(all-todos): add batch mode for multi-select and batch move"
```

---

### Task 12: 最终验证 — TypeScript 编译 + 冒烟测试

**Files:**
- None (verification only)

- [ ] **Step 1: TypeScript 编译检查**

Run: `cd /Users/xiatian/Desktop/NoArgue/website && npx tsc --noEmit`
Expected: Zero errors.

- [ ] **Step 2: 冒烟测试 — 所有页面无运行时错误**

Write a Playwright smoke test script to `/tmp/batch1_smoke.py`:

```python
from playwright.sync_api import sync_playwright

BASE = "http://localhost:5176"
PAGES = [
    ("/", "Today"),
    ("/todos", "All Todos"),
    ("/todos/new", "TodoForm"),
    ("/calendar", "Calendar"),
    ("/stats", "Stats"),
    ("/combos", "Combos"),
    ("/trash", "Trash"),
]

errors = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    for path, name in PAGES:
        page = browser.new_page()
        page_errors = []
        page.on("pageerror", lambda err: page_errors.append(str(err)))
        page.on("console", lambda msg: page_errors.append(f"[console.{msg.type}] {msg.text}") if msg.type == "error" else None)
        try:
            page.goto(f"{BASE}{path}", wait_until="networkidle", timeout=15000)
            page.wait_for_timeout(1500)
        except Exception as e:
            page_errors.append(f"NAV ERROR: {e}")
        status = "OK" if not page_errors else "FAIL"
        print(f"[{status}] {name} ({path})")
        for err in page_errors:
            print(f"    {err}")
            errors.append((name, err))
        page.close()
    browser.close()

print()
if errors:
    print(f"SMOKE TEST FAILED: {len(errors)} errors found")
else:
    print("SMOKE TEST PASSED: all pages loaded without runtime errors")
```

Run: `cd /Users/xiatian/Desktop/NoArgue && python /tmp/batch1_smoke.py`
Expected: "SMOKE TEST PASSED"

If there are errors, fix them before proceeding.

- [ ] **Step 3: 推送到远程**

Run:
```bash
cd /Users/xiatian/Desktop/NoArgue && git push origin main
```

Expected: Push succeeds.

- [ ] **Step 4: Commit final verification (if any fixes were needed)**

If fixes were made during smoke testing, commit them:
```bash
cd /Users/xiatian/Desktop/NoArgue && git add -A && git commit -m "fix: address smoke test issues from batch1"
```

---

## Self-Review Notes

**Spec coverage:**
- 数据同步: Task 2 (sync API) + Task 3 (sync store) + Task 4 (Topbar UI) ✓
- 上传服务: Task 2 (upload API) + Task 5 (ImageUploader) + Task 8 (TodoForm integration) ✓
- 批量操作: Task 2 (batchMove API) + Task 3 (batchMove store) + Task 7 (BatchMode) + Task 11 (AllTodosView) ✓
- 子任务: Task 3 (fetchSubtodos store) + Task 6 (SubtaskList) + Task 8 (TodoForm) + Task 9 (TodoDetail) + Task 10 (TodoItem hint) ✓
- 图片附件: Task 5 (ImageUploader) + Task 8 (TodoForm) + Task 9 (TodoDetail gallery) ✓

**Placeholder scan:** No TBD/TODO found. All steps have complete code.

**Type consistency:** `parentId` is `string` throughout (types, API, store, components). `subtaskMap` is `Record<string, Todo[]>` in store. `batchMove` signature is `(todoIds: string[], comboId: number | null)` in API, store, and BatchMode.
