# NoArgue React Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the `website/` directory from Vue 3 to React 18 with BonjourPrism design language (pine green, dark-first), delivering P0's 7 routes / 6 page components.

**Architecture:** React 18 + TypeScript strict + Vite 5 + React Router v6 + Zustand + Ant Design 5 (ConfigProvider-themed) + CSS Modules. Three-layer component strategy: self-built primitives (BonjourPrism skin) + AntD complex components (themed) + feature components (composing both).

**Tech Stack:** React 18, TypeScript 5, Vite 5, React Router v6, Zustand, Ant Design 5, CSS Modules, dayjs, axios, echarts.

**Spec:** `docs/superpowers/specs/2026-07-12-noargue-react-rebuild-design.md`

---

## File Structure

```
website/
├── index.html                              # Modify: FOUC script, title
├── package.json                            # Modify: swap deps
├── tsconfig.json                           # Modify: strict
├── tsconfig.node.json                      # Create
├── vite.config.ts                          # Modify: React plugin
├── .env.development                        # Keep
├── src/
│   ├── main.tsx                            # Create (React entry)
│   ├── App.tsx                             # Create
│   ├── env.d.ts                            # Modify
│   ├── app/
│   │   ├── providers.tsx                   # Create: ConfigProvider + Router
│   │   └── router.tsx                      # Create: createBrowserRouter
│   ├── design/
│   │   ├── tokens.css                      # Create: CSS variables (dark/light)
│   │   ├── global.css                      # Create: reset + base
│   │   └── primitives/
│   │       ├── Button.tsx + Button.module.css
│   │       ├── Card.tsx + Card.module.css
│   │       ├── Tag.tsx + Tag.module.css
│   │       ├── StatusChip.tsx + StatusChip.module.css
│   │       ├── Progress.tsx + Progress.module.css
│   │       ├── Stat.tsx + Stat.module.css
│   │       ├── Eyebrow.tsx
│   │       ├── HeroTitle.tsx
│   │       ├── ListLine.tsx + ListLine.module.css
│   │       ├── Toggle.tsx + Toggle.module.css
│   │       └── index.ts                    # barrel
│   ├── stores/
│   │   ├── auth.ts                         # Zustand
│   │   ├── todos.ts
│   │   ├── combos.ts
│   │   ├── tags.ts
│   │   └── config.ts
│   ├── api/                                # Migrate (remove tdesign import)
│   │   ├── request.ts
│   │   ├── auth.ts
│   │   ├── todos.ts
│   │   ├── combos.ts
│   │   ├── collab.ts
│   │   ├── tags.ts
│   │   └── config.ts
│   ├── types/index.ts                      # Migrate as-is
│   ├── lib/utils.ts                        # Create: cn(), formatDate, etc.
│   ├── features/
│   │   ├── auth/LoginView.tsx + .module.css
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx + .module.css
│   │   │   ├── Sidebar.tsx + .module.css
│   │   │   └── Topbar.tsx + .module.css
│   │   ├── todo/
│   │   │   ├── TodayView.tsx + .module.css
│   │   │   ├── AllTodosView.tsx + .module.css
│   │   │   ├── TodoForm.tsx + .module.css
│   │   │   ├── TodoDetail.tsx + .module.css
│   │   │   └── TodoItem.tsx + .module.css
│   │   └── calendar/CalendarView.tsx + .module.css
│   └── (delete: App.vue, main.ts, router/, views/, components/, stores/*.ts old, composables/, styles/)
```

---

## Task 1: Swap Dependencies & Build Config

**Files:**
- Modify: `website/package.json`
- Modify: `website/vite.config.ts`
- Modify: `website/tsconfig.json`
- Create: `website/tsconfig.node.json`
- Modify: `website/index.html`
- Modify: `website/src/env.d.ts`

- [ ] **Step 1: Replace `package.json`**

```json
{
  "name": "noargue-web",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext ts,tsx"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.0",
    "zustand": "^4.5.4",
    "antd": "^5.20.0",
    "@ant-design/icons": "^5.4.0",
    "axios": "^1.7.4",
    "dayjs": "^1.11.12",
    "echarts": "^5.5.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "typescript": "^5.5.4",
    "vite": "^5.4.0"
  }
}
```

- [ ] **Step 2: Replace `vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
})
```

- [ ] **Step 3: Replace `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 4: Create `tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 5: Replace `index.html`**

```html
<!DOCTYPE html>
<html lang="zh-CN" data-theme="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>NoArgue · 待办</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
    <script>
      // FOUC prevention: sync theme before paint
      (function() {
        var t = localStorage.getItem('noargue-theme') || 'dark';
        document.documentElement.setAttribute('data-theme', t);
      })();
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Replace `src/env.d.ts`**

```ts
/// <reference types="vite/client" />

declare module '*.module.css' {
  const classes: { readonly [key: string]: string }
  export default classes
}

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

- [ ] **Step 7: Install deps & delete Vue files**

```bash
cd website
rm -rf node_modules package-lock.json
npm install
rm -f src/main.ts src/App.vue
rm -rf src/router src/views src/components src/composables src/styles
rm -f src/stores/auth.ts src/stores/todos.ts src/stores/combos.ts src/stores/tags.ts src/stores/config.ts
rm -f src/upload.ts
```

Expected: `npm install` succeeds, Vue files removed.

- [ ] **Step 8: Commit**

```bash
git add website/package.json website/vite.config.ts website/tsconfig.json website/tsconfig.node.json website/index.html website/src/env.d.ts
git commit -m "chore: swap Vue deps to React, update build config"
```

---

## Task 2: Design Tokens & Global Styles

**Files:**
- Create: `website/src/design/tokens.css`
- Create: `website/src/design/global.css`
- Create: `website/src/main.tsx`

- [ ] **Step 1: Create `src/design/tokens.css`**

```css
:root {
  --primary: #01796f;
  --primary-hi: #0a8c80;
  --primary-fg: #ffffff;
  --primary-soft: rgba(1,121,111,0.16);
  --primary-line: rgba(1,121,111,0.38);

  --bg: #0a0a0a;
  --bg2: #0e0e0e;
  --card: #141414;
  --muted: #1c1c1c;
  --pop: #1c1c1c;

  --fg: #fafafa;
  --mt: #a1a1a1;
  --mt2: #6b6b6b;
  --mt3: #4a4a4a;

  --secondary: #1c1c1c;
  --secondary-fg: #fafafa;
  --accent: #262626;
  --accent-fg: #fafafa;
  --input: #1f1f1f;
  --border: #1a1a1a;
  --border2: #161616;
  --sb: #0a0a0a;
  --sb-border: #1a1a1a;

  --success: #62d178;
  --warn: #eab308;
  --destructive: #ff6467;
  --info: #4a9eff;

  --font-sans: "Geist", -apple-system, "SF Pro Text", "PingFang SC", system-ui, sans-serif;
  --font-mono: "Geist Mono", "SF Mono", ui-monospace, monospace;
  --font-song: "Songti SC", "STSong", "SimSun", serif;
}

[data-theme="light"] {
  --primary: #01796f;
  --primary-hi: #01665c;
  --primary-fg: #ffffff;
  --primary-soft: rgba(1,121,111,0.10);
  --primary-line: rgba(1,121,111,0.30);

  --bg: #ffffff;
  --bg2: #fafafa;
  --card: #ffffff;
  --muted: #f5f5f5;
  --pop: #f5f5f5;

  --fg: #1a1a1a;
  --mt: #666666;
  --mt2: #999999;
  --mt3: #cccccc;

  --secondary: #f5f5f5;
  --secondary-fg: #1a1a1a;
  --accent: #eeeeee;
  --accent-fg: #1a1a1a;
  --input: #f5f5f5;
  --border: #e5e5e5;
  --border2: #ededed;
  --sb: #fafafa;
  --sb-border: #e5e5e5;

  --success: #16a34a;
  --warn: #ca8a04;
  --destructive: #dc2626;
  --info: #2563eb;
}
```

- [ ] **Step 2: Create `src/design/global.css`**

```css
@import './tokens.css';

* { box-sizing: border-box; margin: 0; padding: 0; }

html, body {
  width: 100%; height: 100%; overflow: hidden;
  font-family: var(--font-sans);
  color: var(--fg);
  background: var(--bg);
  font-size: 13px; line-height: 1.4;
  -webkit-font-smoothing: antialiased;
}

#root { width: 100%; height: 100%; }

button { font-family: inherit; cursor: pointer; }
input, textarea { font-family: inherit; }
a { color: inherit; text-decoration: none; }

::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-thumb { background: var(--mt3); }
::-webkit-scrollbar-track { background: transparent; }
```

- [ ] **Step 3: Create `src/main.tsx`**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './design/global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

- [ ] **Step 4: Create placeholder `src/App.tsx`**

```tsx
export default function App() {
  return <div style={{ padding: 40, color: 'var(--fg)' }}>NoArgue · booting...</div>
}
```

- [ ] **Step 5: Verify dev server boots**

Run: `cd website && npm run dev`
Expected: server starts on :5173, page shows "NoArgue · booting..." with dark bg.

- [ ] **Step 6: Commit**

```bash
git add website/src/design website/src/main.tsx website/src/App.tsx
git commit -m "feat: add design tokens, global styles, React entry"
```

---

## Task 3: Migrate API Layer & Types

**Files:**
- Modify: `website/src/api/request.ts` (remove tdesign import)
- Keep: `website/src/api/auth.ts`, `todos.ts`, `combos.ts`, `collab.ts`, `tags.ts`, `config.ts`
- Keep: `website/src/types/index.ts`
- Create: `website/src/lib/utils.ts`

- [ ] **Step 1: Fix `src/api/request.ts`** — replace `MessagePlugin` with AntD `message`

Replace the entire file content:

```ts
import axios from 'axios'
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { message } from 'antd'

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
})

instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('authToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

instance.interceptors.response.use(
  (response: AxiosResponse) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken')
      window.location.href = '/login'
      return Promise.reject(error)
    }
    const msg = error.response?.data?.message || error.message || '网络请求失败'
    message.error(msg)
    return Promise.reject(error)
  },
)

export default instance as unknown as {
  get: <T>(url: string, config?: Record<string, unknown>) => Promise<T>
  post: <T>(url: string, data?: unknown, config?: Record<string, unknown>) => Promise<T>
  put: <T>(url: string, data?: unknown, config?: Record<string, unknown>) => Promise<T>
  delete: <T>(url: string, config?: Record<string, unknown>) => Promise<T>
  patch: <T>(url: string, data?: unknown, config?: Record<string, unknown>) => Promise<T>
}
```

- [ ] **Step 2: Create `src/lib/utils.ts`**

```ts
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function formatDate(d: Date | string | number): string {
  const date = typeof d === 'object' ? d : new Date(d)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayStr(): string {
  return formatDate(new Date())
}

export function greeting(): string {
  const h = new Date().getHours()
  if (h < 6) return '凌晨好'
  if (h < 12) return '上午好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
}
```

- [ ] **Step 3: Verify types compile**

Run: `cd website && npx tsc --noEmit`
Expected: no errors (types/index.ts and api/*.ts should compile; `message` from antd is available).

- [ ] **Step 4: Commit**

```bash
git add website/src/api/request.ts website/src/lib/utils.ts
git commit -m "feat: migrate API layer to antd message, add utils"
```

---

## Task 4: Zustand Stores

**Files:**
- Create: `website/src/stores/auth.ts`
- Create: `website/src/stores/todos.ts`
- Create: `website/src/stores/combos.ts`
- Create: `website/src/stores/tags.ts`
- Create: `website/src/stores/config.ts`

- [ ] **Step 1: Create `src/stores/auth.ts`**

```ts
import { create } from 'zustand'
import type { User } from '@/types'
import { authApi } from '@/api/auth'

interface AuthState {
  token: string | null
  user: User | null
  loading: boolean
  isLoggedIn: boolean
  saveToken: (t: string) => void
  clearAuth: () => void
  fetchUserInfo: () => Promise<void>
  loginByQrCode: () => Promise<{ sceneId: string; ticket: string }>
  pollQrCodeStatus: (
    sceneId: string,
    onStatusChange?: (status: string) => void,
  ) => { stop: () => void; promise: Promise<void> }
  logout: () => void
  updateProfile: (data: { nickname?: string; avatarUrl?: string }) => Promise<unknown>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem('authToken'),
  user: null,
  loading: false,
  isLoggedIn: !!localStorage.getItem('authToken'),

  saveToken: (t) => {
    localStorage.setItem('authToken', t)
    set({ token: t, isLoggedIn: true })
  },

  clearAuth: () => {
    localStorage.removeItem('authToken')
    set({ token: null, user: null, isLoggedIn: false })
  },

  fetchUserInfo: async () => {
    if (!get().token) return
    try {
      set({ loading: true })
      const res = await authApi.getUserInfo()
      if (res.success && res.user) {
        set({ user: res.user })
      }
    } finally {
      set({ loading: false })
    }
  },

  loginByQrCode: async () => {
    const res = await authApi.generateQrCode()
    if (!res.success || !res.data) throw new Error('生成二维码失败')
    return res.data
  },

  pollQrCodeStatus: (sceneId, onStatusChange) => {
    let stopped = false
    let timerId: ReturnType<typeof setTimeout> | null = null
    const POLL_INTERVAL = 2000
    const MAX_DURATION = 5 * 60 * 1000
    const startTime = Date.now()

    const promise = new Promise<void>((resolve, reject) => {
      const poll = async () => {
        if (stopped) return
        if (Date.now() - startTime > MAX_DURATION) {
          reject(new Error('expired'))
          return
        }
        try {
          const res = await authApi.getQrCodeStatus(sceneId)
          if (!res.success) {
            timerId = setTimeout(poll, POLL_INTERVAL)
            return
          }
          switch (res.status) {
            case 'waiting':
              timerId = setTimeout(poll, POLL_INTERVAL)
              break
            case 'scanned':
              onStatusChange?.('scanned')
              timerId = setTimeout(poll, POLL_INTERVAL)
              break
            case 'confirmed':
              if (res.token && res.user) {
                get().saveToken(res.token)
                set({ user: res.user })
                resolve()
              } else {
                reject(new Error('登录失败：未获取到用户信息'))
              }
              break
            case 'expired':
              reject(new Error('expired'))
              break
            default:
              timerId = setTimeout(poll, POLL_INTERVAL)
          }
        } catch {
          timerId = setTimeout(poll, POLL_INTERVAL)
        }
      }
      poll()
    })

    return {
      stop: () => {
        stopped = true
        if (timerId !== null) clearTimeout(timerId)
      },
      promise,
    }
  },

  logout: () => {
    get().clearAuth()
    window.location.href = '/login'
  },

  updateProfile: async (data) => {
    const res = await authApi.updateUserInfo(data)
    if (res.success && get().user) {
      set({
        user: {
          ...get().user!,
          nickname: data.nickname ?? get().user!.nickname,
          avatarUrl: data.avatarUrl ?? get().user!.avatarUrl,
        },
      })
    }
    return res
  },
}))

// Auto-fetch user info if token exists (call once on app init)
if (localStorage.getItem('authToken')) {
  useAuthStore.getState().fetchUserInfo()
}
```

- [ ] **Step 2: Create `src/stores/todos.ts`**

```ts
import { create } from 'zustand'
import type { Todo } from '@/types'
import { todoApi } from '@/api/todos'

type Filter = 'all' | 'today' | 'completed' | 'uncompleted' | 'starred'

interface TodoState {
  todos: Todo[]
  loading: boolean
  filter: Filter
  setFilter: (f: Filter) => void
  fetchTodos: () => Promise<void>
  createTodo: (data: Partial<Todo>) => Promise<Todo>
  updateTodo: (id: string, data: Partial<Todo>) => Promise<void>
  deleteTodo: (id: string) => Promise<void>
  toggleComplete: (id: string) => Promise<void>
  toggleStar: (id: string) => Promise<void>
  restoreTodo: (id: string) => Promise<void>
  permanentDelete: (id: string) => Promise<void>
}

export const useTodoStore = create<TodoState>((set, get) => ({
  todos: [],
  loading: false,
  filter: 'all',

  setFilter: (f) => set({ filter: f }),

  fetchTodos: async () => {
    try {
      set({ loading: true })
      const res = await todoApi.getTodos()
      set({ todos: res.todos || [] })
    } finally {
      set({ loading: false })
    }
  },

  createTodo: async (data) => {
    const res = await todoApi.createTodo(data)
    if (res.success && res.todo) {
      set({ todos: [...get().todos, res.todo] })
      return res.todo
    }
    throw new Error(res.message || '创建失败')
  },

  updateTodo: async (id, data) => {
    const res = await todoApi.updateTodo(id, {
      ...data,
      version: (get().todos.find((t) => t.id === id)?.version || 1) + 1,
      updatedAt: Date.now(),
    })
    if (res.success && res.todo) {
      set({
        todos: get().todos.map((t) => (t.id === id ? res.todo! : t)),
      })
    }
  },

  deleteTodo: async (id) => {
    await todoApi.deleteTodo(id)
    set({
      todos: get().todos.map((t) =>
        t.id === id ? { ...t, isDeleted: true, updatedAt: Date.now() } : t,
      ),
    })
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
    const res = await todoApi.restoreTodo(id)
    if (res.success) {
      set({
        todos: get().todos.map((t) =>
          t.id === id ? { ...t, isDeleted: false, updatedAt: Date.now() } : t,
        ),
      })
    }
  },

  permanentDelete: async (id) => {
    await todoApi.permanentDelete(id)
    set({ todos: get().todos.filter((t) => t.id !== id) })
  },
}))
```

- [ ] **Step 3: Create `src/stores/combos.ts`**

```ts
import { create } from 'zustand'
import type { Combo } from '@/types'
import { comboApi } from '@/api/combos'

interface ComboState {
  combos: Combo[]
  sharedCombos: Combo[]
  loading: boolean
  fetchCombos: () => Promise<void>
  createCombo: (data: Partial<Combo>) => Promise<Combo>
  updateCombo: (id: number, data: Partial<Combo>) => Promise<void>
  deleteCombo: (id: number) => Promise<void>
}

export const useComboStore = create<ComboState>((set, get) => ({
  combos: [],
  sharedCombos: [],
  loading: false,

  fetchCombos: async () => {
    try {
      set({ loading: true })
      const [comboRes, sharedRes] = await Promise.all([
        comboApi.getCombos(),
        comboApi.getSharedCombos().catch(() => ({ combos: [] })),
      ])
      set({
        combos: comboRes.combos || [],
        sharedCombos: sharedRes.combos || [],
      })
    } finally {
      set({ loading: false })
    }
  },

  createCombo: async (data) => {
    const res = await comboApi.createCombo(data)
    if (res.success && res.combo) {
      set({ combos: [...get().combos, res.combo] })
      return res.combo
    }
    throw new Error(res.message || '创建失败')
  },

  updateCombo: async (id, data) => {
    const res = await comboApi.updateCombo(id, data)
    if (res.success && res.combo) {
      set({
        combos: get().combos.map((c) => (c.id === id ? res.combo! : c)),
      })
    }
  },

  deleteCombo: async (id) => {
    await comboApi.deleteCombo(id)
    set({ combos: get().combos.filter((c) => c.id !== id) })
  },
}))
```

- [ ] **Step 4: Create `src/stores/tags.ts`**

```ts
import { create } from 'zustand'
import type { Tag } from '@/types'
import { tagApi } from '@/api/tags'

interface TagState {
  systemTags: Tag[]
  userTags: Tag[]
  loading: boolean
  fetchTags: () => Promise<void>
  createTag: (data: Partial<Tag>) => Promise<Tag>
  updateTag: (id: number, data: Partial<Tag>) => Promise<void>
  deleteTag: (id: number) => Promise<void>
}

export const useTagStore = create<TagState>((set, get) => ({
  systemTags: [],
  userTags: [],
  loading: false,

  fetchTags: async () => {
    try {
      set({ loading: true })
      const res = await tagApi.getTags()
      const all = res.tags || []
      set({
        systemTags: all.filter((t) => t.isSystem === 1),
        userTags: all.filter((t) => t.isSystem === 0),
      })
    } finally {
      set({ loading: false })
    }
  },

  createTag: async (data) => {
    const res = await tagApi.createTag(data)
    if (res.success && res.tag) {
      set({ userTags: [...get().userTags, res.tag] })
      return res.tag
    }
    throw new Error(res.message || '创建失败')
  },

  updateTag: async (id, data) => {
    const res = await tagApi.updateTag(id, data)
    if (res.success && res.tag) {
      set({
        userTags: get().userTags.map((t) => (t.id === id ? res.tag! : t)),
      })
    }
  },

  deleteTag: async (id) => {
    await tagApi.deleteTag(id)
    set({ userTags: get().userTags.filter((t) => t.id !== id) })
  },
}))
```

- [ ] **Step 5: Create `src/stores/config.ts`**

```ts
import { create } from 'zustand'
import type { Notice, Changelog } from '@/types'
import { configApi } from '@/api/config'

interface ConfigState {
  notices: Notice[]
  changelogs: Changelog[]
  loaded: boolean
  fetchConfig: () => Promise<void>
}

export const useConfigStore = create<ConfigState>((set) => ({
  notices: [],
  changelogs: [],
  loaded: false,

  fetchConfig: async () => {
    try {
      const res = await configApi.getConfig()
      set({
        notices: res.notices || [],
        changelogs: res.changelogs || [],
        loaded: true,
      })
    } catch {
      set({ loaded: true })
    }
  },
}))
```

- [ ] **Step 6: Verify types compile**

Run: `cd website && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add website/src/stores
git commit -m "feat: add Zustand stores (auth/todos/combos/tags/config)"
```

---

## Task 5: Design Primitives — Button & Card

**Files:**
- Create: `website/src/design/primitives/Button.tsx`
- Create: `website/src/design/primitives/Button.module.css`
- Create: `website/src/design/primitives/Card.tsx`
- Create: `website/src/design/primitives/Card.module.css`

- [ ] **Step 1: Create `Button.tsx`**

```tsx
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import styles from './Button.module.css'

type Variant = 'pri' | 'sec' | 'gh' | 'icon'
type Size = 'default' | 'sm'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: ReactNode
  children?: ReactNode
}

export function Button({
  variant = 'sec',
  size = 'default',
  icon,
  children,
  className,
  ...rest
}: ButtonProps) {
  const cls = [
    styles.btn,
    styles[`v-${variant}`],
    size === 'sm' && styles.sm,
    variant === 'icon' && styles.iconOnly,
    className,
  ].filter(Boolean).join(' ')
  return (
    <button className={cls} {...rest}>
      {icon}
      {children}
    </button>
  )
}
```

- [ ] **Step 2: Create `Button.module.css`**

```css
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 11px;
  border: 1px solid transparent;
  font: 500 12px/1 var(--font-sans);
  white-space: nowrap;
  color: var(--fg);
  background: transparent;
}

.btn:disabled { opacity: 0.4; cursor: not-allowed; }

.v-pri { background: var(--primary); color: var(--primary-fg); }
.v-pri:hover:not(:disabled) { background: var(--primary-hi); }

.v-sec { background: var(--secondary); color: var(--fg); border-color: var(--border); }
.v-sec:hover:not(:disabled) { background: var(--accent); }

.v-gh { background: transparent; color: var(--mt); border-color: transparent; }
.v-gh:hover:not(:disabled) { color: var(--fg); background: var(--muted); }

.v-icon { width: 28px; height: 28px; padding: 0; justify-content: center; color: var(--mt); }
.v-icon:hover:not(:disabled) { color: var(--fg); }

.iconOnly { padding: 0; }

.sm { height: 24px; padding: 0 9px; font-size: 11px; }
```

- [ ] **Step 3: Create `Card.tsx`**

```tsx
import type { ReactNode } from 'react'
import styles from './Card.module.css'

interface CardProps {
  children: ReactNode
  className?: string
}

export function Card({ children, className }: CardProps) {
  return <div className={[styles.card, className].filter(Boolean).join(' ')}>{children}</div>
}
```

- [ ] **Step 4: Create `Card.module.css`**

```css
.card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  border: 1px solid var(--border);
  background: var(--card);
}
```

- [ ] **Step 5: Commit**

```bash
git add website/src/design/primitives/Button.* website/src/design/primitives/Card.*
git commit -m "feat: add Button and Card primitives"
```

---

## Task 6: Design Primitives — Tag, StatusChip, Eyebrow, HeroTitle

**Files:**
- Create: `website/src/design/primitives/Tag.tsx` + `.module.css`
- Create: `website/src/design/primitives/StatusChip.tsx` + `.module.css`
- Create: `website/src/design/primitives/Eyebrow.tsx`
- Create: `website/src/design/primitives/HeroTitle.tsx`

- [ ] **Step 1: Create `Tag.tsx`**

```tsx
import type { ReactNode } from 'react'
import styles from './Tag.module.css'

type TagTone = 'default' | 'pri' | 'warn' | 'err' | 'info'

interface TagProps {
  tone?: TagTone
  children: ReactNode
}

export function Tag({ tone = 'default', children }: TagProps) {
  return <span className={[styles.tag, styles[tone]].join(' ')}>{children}</span>
}
```

- [ ] **Step 2: Create `Tag.module.css`**

```css
.tag {
  font: 500 10.5px/1 var(--font-mono);
  color: var(--mt);
  white-space: nowrap;
  padding: 2px 6px;
  border: 1px solid var(--border);
}

.default { color: var(--mt); }
.pri { color: var(--primary); border-color: var(--primary-line); background: var(--primary-soft); }
.warn { color: var(--warn); }
.err { color: var(--destructive); }
.info { color: var(--info); }
```

- [ ] **Step 3: Create `StatusChip.tsx`**

```tsx
import type { ReactNode } from 'react'
import styles from './StatusChip.module.css'

type ChipTone = 'default' | 'ok' | 'warn' | 'acc'

interface StatusChipProps {
  tone?: ChipTone
  children: ReactNode
}

export function StatusChip({ tone = 'default', children }: StatusChipProps) {
  return <span className={[styles.chip, styles[tone]].join(' ')}>{children}</span>
}
```

- [ ] **Step 4: Create `StatusChip.module.css`**

```css
.chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  font: 500 10.5px/1.4 var(--font-mono);
  border: 1px solid var(--border);
  color: var(--mt);
}

.default { color: var(--mt); }
.ok { color: var(--success); border-color: rgba(98,209,120,0.3); background: rgba(98,209,120,0.08); }
.warn { color: var(--warn); border-color: rgba(234,179,8,0.3); background: rgba(234,179,8,0.08); }
.acc { color: var(--primary); border-color: var(--primary-line); background: var(--primary-soft); }
```

- [ ] **Step 5: Create `Eyebrow.tsx`**

```tsx
import type { ReactNode } from 'react'

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        font: '500 10px/1 var(--font-mono)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: 'var(--mt2)',
      }}
    >
      {children}
    </span>
  )
}
```

- [ ] **Step 6: Create `HeroTitle.tsx`**

```tsx
import type { ReactNode } from 'react'

interface HeroTitleProps {
  children: ReactNode
  accent?: ReactNode
}

export function HeroTitle({ children, accent }: HeroTitleProps) {
  return (
    <h1
      style={{
        margin: '8px 0 6px',
        font: '600 24px/1.15 var(--font-sans)',
        letterSpacing: '-0.01em',
        color: 'var(--fg)',
      }}
    >
      {children}
      {accent && (
        <span style={{ color: 'var(--primary)', fontFamily: 'var(--font-song)', fontWeight: 600 }}>
          {accent}
        </span>
      )}
    </h1>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add website/src/design/primitives/Tag.* website/src/design/primitives/StatusChip.* website/src/design/primitives/Eyebrow.tsx website/src/design/primitives/HeroTitle.tsx
git commit -m "feat: add Tag, StatusChip, Eyebrow, HeroTitle primitives"
```

---

## Task 7: Design Primitives — Progress, Stat, ListLine, Toggle & Barrel

**Files:**
- Create: `website/src/design/primitives/Progress.tsx` + `.module.css`
- Create: `website/src/design/primitives/Stat.tsx` + `.module.css`
- Create: `website/src/design/primitives/ListLine.tsx` + `.module.css`
- Create: `website/src/design/primitives/Toggle.tsx` + `.module.css`
- Create: `website/src/design/primitives/index.ts`

- [ ] **Step 1: Create `Progress.tsx`**

```tsx
import styles from './Progress.module.css'

interface ProgressProps {
  value: number
  max?: number
}

export function Progress({ value, max = 100 }: ProgressProps) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div className={styles.progress}>
      <span style={{ width: `${pct}%` }} />
    </div>
  )
}
```

- [ ] **Step 2: Create `Progress.module.css`**

```css
.progress {
  height: 4px;
  background: var(--muted);
  overflow: hidden;
}
.progress > span {
  display: block;
  height: 100%;
  background: var(--primary);
  transition: width 0.3s ease;
}
```

- [ ] **Step 3: Create `Stat.tsx`**

```tsx
import type { ReactNode } from 'react'
import styles from './Stat.module.css'

interface StatProps {
  label: string
  value: ReactNode
  delta?: ReactNode
  accent?: boolean
}

export function Stat({ label, value, delta, accent }: StatProps) {
  return (
    <div className={styles.stat}>
      <div className={styles.label}>{label}</div>
      <div className={[styles.value, accent && styles.acc].filter(Boolean).join(' ')}>{value}</div>
      {delta && <div className={styles.delta}>{delta}</div>}
    </div>
  )
}
```

- [ ] **Step 4: Create `Stat.module.css`**

```css
.stat {
  padding: 14px;
  border: 1px solid var(--border);
  background: var(--card);
}
.label {
  font: 500 10px/1 var(--font-mono);
  color: var(--mt2);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.value {
  margin-top: 8px;
  font: 600 22px/1 var(--font-sans);
  color: var(--fg);
}
.acc { color: var(--primary); }
.delta {
  margin-top: 4px;
  font: 500 10.5px/1 var(--font-mono);
  color: var(--mt);
}
```

- [ ] **Step 5: Create `ListLine.tsx`**

```tsx
import type { ReactNode } from 'react'
import styles from './ListLine.module.css'

interface ListLineProps {
  left: ReactNode
  right?: ReactNode
}

export function ListLine({ left, right }: ListLineProps) {
  return (
    <div className={styles.line}>
      <div>{left}</div>
      {right && <div>{right}</div>}
    </div>
  )
}
```

- [ ] **Step 6: Create `ListLine.module.css`**

```css
.line {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 14px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
  font-size: 13px;
}
.line:last-child { border-bottom: 0; padding-bottom: 0; }
```

- [ ] **Step 7: Create `Toggle.tsx`**

```tsx
import styles from './Toggle.module.css'

interface ToggleProps {
  on: boolean
  onChange: (on: boolean) => void
}

export function Toggle({ on, onChange }: ToggleProps) {
  return (
    <button
      className={[styles.toggle, on && styles.on].filter(Boolean).join(' ')}
      onClick={() => onChange(!on)}
      type="button"
    >
      <span className={styles.core}>
        <span className={styles.knob} />
      </span>
    </button>
  )
}
```

- [ ] **Step 8: Create `Toggle.module.css`**

```css
.toggle {
  border: 0;
  background: transparent;
  padding: 0;
  cursor: pointer;
}
.core {
  display: flex;
  align-items: center;
  width: 32px;
  height: 18px;
  border-radius: 999px;
  background: var(--accent);
  padding: 2px;
}
.knob {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  background: var(--card);
  transition: margin 0.2s;
}
.on .core { background: var(--primary); }
.on .knob { margin-left: auto; }
```

- [ ] **Step 9: Create `index.ts` barrel**

```ts
export { Button } from './Button'
export { Card } from './Card'
export { Tag } from './Tag'
export { StatusChip } from './StatusChip'
export { Progress } from './Progress'
export { Stat } from './Stat'
export { Eyebrow } from './Eyebrow'
export { HeroTitle } from './HeroTitle'
export { ListLine } from './ListLine'
export { Toggle } from './Toggle'
```

- [ ] **Step 10: Verify compile**

Run: `cd website && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 11: Commit**

```bash
git add website/src/design/primitives
git commit -m "feat: add Progress, Stat, ListLine, Toggle primitives and barrel"
```

---

## Task 8: Providers & Router

**Files:**
- Create: `website/src/app/providers.tsx`
- Create: `website/src/app/router.tsx`
- Modify: `website/src/App.tsx`

- [ ] **Step 1: Create `src/app/providers.tsx`**

```tsx
import { type ReactNode, useEffect, useState } from 'react'
import { ConfigProvider, theme as antdTheme, App as AntApp } from 'antd'
import zhCN from 'antd/locale/zh_CN'

type ThemeMode = 'dark' | 'light'

function useThemeMode(): [ThemeMode, (m: ThemeMode) => void] {
  const [mode, setMode] = useState<ThemeMode>(
    () => (localStorage.getItem('noargue-theme') as ThemeMode) || 'dark',
  )
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode)
    localStorage.setItem('noargue-theme', mode)
  }, [mode])
  return [mode, setMode]
}

export const ThemeModeContext = createContext<{
  mode: ThemeMode
  toggle: () => void
}>({ mode: 'dark', toggle: () => {} })

import { createContext, useContext } from 'react'

export function useThemeToggle() {
  return useContext(ThemeModeContext)
}

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
        <AntApp>{children}</AntApp>
      </ConfigProvider>
    </ThemeModeContext.Provider.Provider>
  )
}
```

Note: fix the typo at the end — should be `</ThemeModeContext.Provider>`, not `</ThemeModeContext.Provider.Provider>`.

- [ ] **Step 2: Create `src/app/router.tsx`**

```tsx
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { AppLayout } from '@/features/layout/AppLayout'
import { LoginView } from '@/features/auth/LoginView'
import { TodayView } from '@/features/todo/TodayView'
import { AllTodosView } from '@/features/todo/AllTodosView'
import { TodoForm } from '@/features/todo/TodoForm'
import { TodoDetail } from '@/features/todo/TodoDetail'
import { CalendarView } from '@/features/calendar/CalendarView'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginView />,
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <TodayView /> },
      { path: 'todos', element: <AllTodosView /> },
      { path: 'todos/new', element: <TodoForm mode="create" /> },
      { path: 'todos/:id/edit', element: <TodoForm mode="edit" /> },
      { path: 'todos/:id', element: <TodoDetail /> },
      { path: 'calendar', element: <CalendarView /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
```

- [ ] **Step 3: Replace `src/App.tsx`**

```tsx
import { RouterProvider } from 'react-router-dom'
import { Providers } from './app/providers'
import { router } from './app/router'

export default function App() {
  return (
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add website/src/app website/src/App.tsx
git commit -m "feat: add Providers (ConfigProvider + theme) and Router"
```

---

## Task 9: App Layout — Sidebar

**Files:**
- Create: `website/src/features/layout/AppLayout.tsx` + `.module.css`
- Create: `website/src/features/layout/Sidebar.tsx` + `.module.css`
- Create: `website/src/features/layout/Topbar.tsx` + `.module.css`

- [ ] **Step 1: Create `AppLayout.tsx`**

```tsx
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import styles from './AppLayout.module.css'

export function AppLayout() {
  return (
    <div className={styles.app}>
      <Sidebar />
      <main className={styles.main}>
        <Topbar />
        <div className={styles.content}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Create `AppLayout.module.css`**

```css
.app {
  display: grid;
  grid-template-columns: 220px 1fr;
  width: 100vw;
  height: 100vh;
  background: var(--bg);
}
.main {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  background: var(--bg);
  height: 100vh;
  overflow: hidden;
}
.content {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
```

- [ ] **Step 3: Create `Sidebar.tsx`**

```tsx
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { useComboStore } from '@/stores/combos'
import { useTodoStore } from '@/stores/todos'
import { Button } from '@/design/primitives'
import styles from './Sidebar.module.css'

export function Sidebar() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const combos = useComboStore((s) => s.combos)
  const sharedCombos = useComboStore((s) => s.sharedCombos)
  const todos = useTodoStore((s) => s.todos)

  const activeTodos = todos.filter((t) => !t.isDeleted)
  const todayCount = activeTodos.filter((t) => t.setDate === new Date().toISOString().slice(0, 10)).length
  const starredCount = activeTodos.filter((t) => t.isStar).length

  return (
    <aside className={styles.sb}>
      <div className={styles.brand}>
        <div className={styles.logo}>N</div>
        <span className={styles.name}>NoArgue</span>
      </div>

      <Button variant="pri" onClick={() => navigate('/todos/new')} style={{ width: '100%' }}>
        + 新建待办
      </Button>

      <nav className={styles.nav}>
        <NavLink to="/" end className={({ isActive }) => isActive ? styles.act : ''}>
          <span>今日</span>
          {todayCount > 0 && <span className={styles.ct}>{todayCount}</span>}
        </NavLink>
        <NavLink to="/todos" className={({ isActive }) => isActive ? styles.act : ''}>
          <span>全部待办</span>
          <span className={styles.ct}>{activeTodos.length}</span>
        </NavLink>
        <NavLink to="/calendar" className={({ isActive }) => isActive ? styles.act : ''}>
          <span>日历</span>
        </NavLink>
        <NavLink to="/stats" className={({ isActive }) => isActive ? styles.act : ''}>
          <span>统计</span>
        </NavLink>
        <div className={styles.navItem}>
          <span>收藏</span>
          {starredCount > 0 && <span className={styles.ct}>{starredCount}</span>}
        </div>
        <div className={styles.navItem}>
          <span>搜索</span>
        </div>
      </nav>

      <div className={styles.comboSection}>
        <div className={styles.secHead}>组合</div>
        {[...combos, ...sharedCombos].map((c) => (
          <div key={c.id} className={styles.comboItem}>
            <span className={styles.dot} style={{ background: c.color }} />
            <span className={styles.comboName}>{c.name}</span>
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        <div className={styles.navItem}>
          <span>回收站</span>
        </div>
        <div className={styles.userPill}>
          <div className={styles.avatar}>
            {user?.nickname?.[0] || '?'}
          </div>
          <span className={styles.handle}>{user?.nickname || '未登录'}</span>
          <span className={styles.badge}>
            {activeTodos.length}/{user?.todoLimit || 100}
          </span>
        </div>
      </div>
    </aside>
  )
}
```

- [ ] **Step 4: Create `Sidebar.module.css`**

```css
.sb {
  background: var(--sb);
  border-right: 1px solid var(--sb-border);
  padding: 14px 10px;
  padding-top: 38px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  font-size: 13px;
  overflow-y: auto;
}

.brand { display: flex; align-items: center; gap: 8px; padding: 4px 6px; }
.logo {
  width: 18px; height: 18px; border-radius: 999px;
  background: var(--primary); color: var(--primary-fg);
  display: grid; place-items: center;
  font: 600 9px/1 var(--font-sans);
}
.name { font-weight: 500; font-size: 12.5px; color: var(--fg); }

.nav { display: flex; flex-direction: column; }
.nav a, .navItem {
  display: flex; align-items: center; justify-content: space-between;
  padding: 6px 6px; font-size: 12.5px; color: var(--mt);
  text-decoration: none; cursor: pointer;
}
.nav a:hover, .navItem:hover { color: var(--fg); }
.act { color: var(--fg) !important; }
.ct {
  font: 500 10px/1 var(--font-mono);
  color: var(--mt2);
}

.comboSection { display: flex; flex-direction: column; gap: 2px; }
.secHead {
  font: 500 10px/1 var(--font-mono);
  letter-spacing: 0.08em;
  color: var(--mt2);
  text-transform: uppercase;
  padding: 0 6px 4px;
}
.comboItem {
  display: grid; grid-template-columns: 10px 1fr auto; gap: 8px;
  align-items: center; padding: 5px 6px; cursor: pointer;
  font-size: 12px; color: var(--mt);
}
.comboItem:hover { color: var(--fg); }
.dot { width: 8px; height: 8px; }
.comboName { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.footer {
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.userPill {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 6px; cursor: pointer; color: var(--mt);
}
.avatar {
  width: 20px; height: 20px; border-radius: 999px;
  background: var(--primary); color: var(--primary-fg);
  display: grid; place-items: center;
  font: 600 9px/1 var(--font-sans);
}
.handle { font-size: 12px; font-weight: 500; flex: 1; color: var(--fg); }
.badge {
  font: 500 9.5px/1 var(--font-mono);
  color: var(--mt3);
}
```

- [ ] **Step 5: Commit (Topbar in next task)**

```bash
git add website/src/features/layout/AppLayout.* website/src/features/layout/Sidebar.*
git commit -m "feat: add AppLayout and Sidebar"
```

---

## Task 10: Topbar

**Files:**
- Create: `website/src/features/layout/Topbar.tsx` + `.module.css`

- [ ] **Step 1: Create `Topbar.tsx`**

```tsx
import { useNavigate } from 'react-router-dom'
import { Segmented } from 'antd'
import { BellOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons'
import { useThemeToggle } from '@/app/providers'
import styles from './Topbar.module.css'

export function Topbar() {
  const navigate = useNavigate()
  const { mode, toggle } = useThemeToggle()

  return (
    <div className={styles.topbar}>
      <div
        className={styles.search}
        onClick={() => navigate('/search')}
        role="button"
        tabIndex={0}
      >
        <span className={styles.placeholder}>搜索待办、组合、标签...</span>
        <span className={styles.kbd}>⌘K</span>
      </div>

      <div className={styles.toolbar}>
        <Segmented
          size="small"
          options={['列表', '看板', '时间线']}
          defaultValue="列表"
        />
        <button className={styles.iconBtn} type="button">
          <BellOutlined />
        </button>
        <button className={styles.iconBtn} onClick={toggle} type="button">
          {mode === 'dark' ? <SunOutlined /> : <MoonOutlined />}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `Topbar.module.css`**

```css
.topbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 18px;
  border-bottom: 1px solid var(--border);
  flex: 0 0 auto;
}
.search {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 1;
  max-width: 320px;
  min-width: 180px;
  height: 28px;
  padding: 0 10px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--mt);
  cursor: pointer;
}
.search:hover { border-color: var(--mt3); }
.placeholder { font-size: 12.5px; }
.kbd {
  padding: 1px 5px;
  color: var(--mt2);
  font: 500 10px/1.4 var(--font-mono);
}
.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}
.iconBtn {
  width: 28px; height: 28px;
  color: var(--mt);
  display: grid; place-items: center;
  cursor: pointer;
  border: 0;
  background: transparent;
}
.iconBtn:hover { color: var(--fg); }
```

- [ ] **Step 3: Verify app boots with layout**

Run: `cd website && npm run dev`
Expected: redirects to /login (since pages aren't created yet, this will error — that's OK, next tasks create pages).

- [ ] **Step 4: Commit**

```bash
git add website/src/features/layout/Topbar.*
git commit -m "feat: add Topbar with search, view switch, theme toggle"
```

---

## Task 11: LoginView

**Files:**
- Create: `website/src/features/auth/LoginView.tsx` + `.module.css`

- [ ] **Step 1: Create `LoginView.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Spin, message } from 'antd'
import { useAuthStore } from '@/stores/auth'
import { Button, Eyebrow } from '@/design/primitives'
import styles from './LoginView.module.css'

export function LoginView() {
  const navigate = useNavigate()
  const { isLoggedIn, loginByQrCode, pollQrCodeStatus } = useAuthStore()
  const [sceneId, setSceneId] = useState('')
  const [ticket, setTicket] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'waiting' | 'scanned' | 'error'>('idle')
  const [qrUrl, setQrUrl] = useState('')

  useEffect(() => {
    if (isLoggedIn) navigate('/')
  }, [isLoggedIn, navigate])

  useEffect(() => {
    let poller: { stop: () => void; promise: Promise<void> } | null = null
    async function startLogin() {
      try {
        setStatus('loading')
        const res = await loginByQrCode()
        setSceneId(res.sceneId)
        setTicket(res.ticket)
        setQrUrl(`https://api.yzjtiantian.cn/auth/qrcode/image?ticket=${res.ticket}`)
        setStatus('waiting')
        poller = pollQrCodeStatus(res.sceneId, (s) => {
          if (s === 'scanned') setStatus('scanned')
        })
        await poller.promise
        message.success('登录成功')
        navigate('/')
      } catch (err) {
        setStatus('error')
        message.error(err instanceof Error && err.message === 'expired' ? '二维码已过期' : '登录失败')
      }
    }
    startLogin()
    return () => { poller?.stop() }
  }, [])

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <div className={styles.logo}>N</div>
          <h1 className={styles.title}>NoArgue</h1>
        </div>
        <Eyebrow>扫码登录</Eyebrow>
        <p className={styles.desc}>使用微信扫描下方二维码登录</p>

        <div className={styles.qrArea}>
          {status === 'loading' && <Spin tip="生成中..." />}
          {qrUrl && (
            <img
              src={qrUrl}
              alt="登录二维码"
              className={styles.qrImg}
              style={{ opacity: status === 'scanned' ? 0.5 : 1 }}
            />
          )}
          {status === 'scanned' && (
            <div className={styles.overlay}>请在微信上确认</div>
          )}
          {status === 'error' && (
            <div className={styles.overlay}>
              <Button variant="pri" onClick={() => window.location.reload()}>重新生成</Button>
            </div>
          )}
        </div>

        <p className={styles.hint}>扫码后请在微信小程序中确认登录</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `LoginView.module.css`**

```css
.wrap {
  width: 100vw; height: 100vh;
  display: grid; place-items: center;
  background: var(--bg);
  padding: 24px;
}
.card {
  display: flex; flex-direction: column; gap: 12px;
  padding: 32px;
  border: 1px solid var(--border);
  background: var(--card);
  min-width: 320px;
  align-items: center;
}
.brand { display: flex; align-items: center; gap: 10px; }
.logo {
  width: 32px; height: 32px; border-radius: 999px;
  background: var(--primary); color: var(--primary-fg);
  display: grid; place-items: center;
  font: 600 14px/1 var(--font-sans);
}
.title {
  font: 600 22px/1 var(--font-sans);
  color: var(--fg);
}
.desc { color: var(--mt); font-size: 13px; }
.qrArea {
  position: relative;
  width: 220px; height: 220px;
  display: grid; place-items: center;
  border: 1px solid var(--border);
  background: var(--bg);
}
.qrImg { width: 200px; height: 200px; }
.overlay {
  position: absolute; inset: 0;
  display: grid; place-items: center;
  background: rgba(10,10,10,0.8);
  color: var(--fg);
  font-size: 13px;
}
.hint { color: var(--mt2); font-size: 11.5px; margin-top: 4px; }
```

- [ ] **Step 3: Commit**

```bash
git add website/src/features/auth
git commit -m "feat: add LoginView with QR code scan login"
```

---

## Task 12: TodoItem Component

**Files:**
- Create: `website/src/features/todo/TodoItem.tsx` + `.module.css`

- [ ] **Step 1: Create `TodoItem.tsx`**

```tsx
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
```

- [ ] **Step 2: Create `TodoItem.module.css`**

```css
.item {
  display: grid;
  grid-template-columns: 18px 1fr auto auto;
  gap: 12px;
  align-items: center;
  padding: 11px 0;
  border-bottom: 1px solid var(--border);
  font-size: 13px;
  cursor: pointer;
}
.item:last-child { border-bottom: 0; }
.item:hover { background: var(--muted); }

.done .title { color: var(--mt2); text-decoration: line-through; }

.check {
  width: 16px; height: 16px;
  border: 1px solid var(--mt3);
  display: grid; place-items: center;
  cursor: pointer;
  background: transparent;
  padding: 0;
}
.done .check { background: var(--primary); border-color: var(--primary); }
.check svg { width: 10px; height: 10px; color: var(--primary-fg); }

.main { min-width: 0; }
.title {
  font-weight: 500; color: var(--fg);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.sub {
  display: flex; gap: 8px; align-items: center;
  margin-top: 3px; color: var(--mt); font-size: 11.5px;
}
.time { font: 500 10.5px/1 var(--font-mono); color: var(--mt2); }

.star {
  color: var(--mt3);
  cursor: pointer;
  border: 0;
  background: transparent;
  font-size: 14px;
  padding: 4px;
}
.starOn { color: var(--primary); }
```

- [ ] **Step 3: Commit**

```bash
git add website/src/features/todo/TodoItem.*
git commit -m "feat: add TodoItem component"
```

---

## Task 13: TodayView (Home Page)

**Files:**
- Create: `website/src/features/todo/TodayView.tsx` + `.module.css`

- [ ] **Step 1: Create `TodayView.tsx`**

```tsx
import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { useTodoStore } from '@/stores/todos'
import { useComboStore } from '@/stores/combos'
import { useTagStore } from '@/stores/tags'
import { Button, Card, Eyebrow, HeroTitle, Stat, Progress, Tag } from '@/design/primitives'
import { TodoItem } from './TodoItem'
import { greeting, todayStr } from '@/lib/utils'
import styles from './TodayView.module.css'

export function TodayView() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { todos, fetchTodos, loading } = useTodoStore()
  const { combos, fetchCombos } = useComboStore()
  const { systemTags, userTags, fetchTags } = useTagStore()

  useEffect(() => {
    fetchTodos()
    fetchCombos()
    fetchTags()
  }, [fetchTodos, fetchCombos, fetchTags])

  const today = todayStr()
  const todayTodos = useMemo(
    () => todos.filter((t) => !t.isDeleted && t.setDate === today),
    [todos, today],
  )
  const completedCount = todayTodos.filter((t) => t.completed).length
  const totalCount = todayTodos.length
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  const weekTodos = todos.filter(
    (t) => !t.isDeleted && t.setDate && new Date(t.setDate) >= weekStart,
  )
  const weekCompleted = weekTodos.filter((t) => t.completed).length
  const weekRate = weekTodos.length > 0 ? Math.round((weekCompleted / weekTodos.length) * 100) : 0

  return (
    <div className={styles.screen}>
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <Eyebrow>{new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' })}</Eyebrow>
          <HeroTitle accent={user?.nickname || '朋友'}>
            {greeting()}，。
          </HeroTitle>
          <div className={styles.meta}>
            <span className={styles.chip}>完成 {completedCount} / {totalCount}</span>
            <span className={styles.sep}>·</span>
            <span>本周进度 {weekRate}%</span>
          </div>
        </div>
        <div className={styles.actions}>
          <Button variant="gh" size="sm" onClick={() => navigate('/todos/new')}>+ 新建</Button>
          <Button variant="pri" size="sm" onClick={() => navigate('/todos/new')}>新建待办</Button>
        </div>
      </div>

      <div className={styles.stats}>
        <Stat label="今日待办" value={totalCount} delta={`${completedCount} 已完成`} />
        <Stat label="本周完成" value={weekCompleted} accent delta={`共 ${weekTodos.length} 项`} />
        <Stat label="完成率" value={`${weekRate}%`} delta="目标 80%" />
      </div>

      <div className={styles.grid}>
        <Card>
          <div className={styles.cardHead}>
            <div>
              <Eyebrow>TODAY</Eyebrow>
              <h3 className={styles.cardTitle}>今日 <span className={styles.song}>待办</span></h3>
            </div>
          </div>
          <div>
            {loading && <div style={{ color: 'var(--mt)', padding: '20px 0' }}>加载中...</div>}
            {!loading && todayTodos.length === 0 && (
              <div style={{ color: 'var(--mt)', padding: '20px 0' }}>今日暂无待办</div>
            )}
            {todayTodos.map((t) => <TodoItem key={t.id} todo={t} />)}
          </div>
        </Card>

        <div className={styles.sideCol}>
          <Card>
            <div className={styles.cardHead}>
              <div>
                <Eyebrow>WEEKLY</Eyebrow>
                <h3 className={styles.cardTitle}>本周 <span className={styles.song}>进度</span></h3>
              </div>
            </div>
            <div className={styles.progressRow}>
              <span className={styles.progLabel}>完成率</span>
              <span className={styles.progVal}>{weekRate}%</span>
            </div>
            <Progress value={weekRate} />
          </Card>

          <Card>
            <div className={styles.cardHead}>
              <div>
                <Eyebrow>TAGS</Eyebrow>
                <h3 className={styles.cardTitle}>常用 <span className={styles.song}>标签</span></h3>
              </div>
            </div>
            <div className={styles.tags}>
              {[...systemTags, ...userTags].slice(0, 8).map((t) => (
                <Tag key={t.id} tone="default">{t.name}</Tag>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `TodayView.module.css`**

```css
.screen {
  padding: 24px 28px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto;
  flex: 1 1 auto;
  min-height: 0;
}

.hero { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; }
.heroLeft { flex: 1; min-width: 0; }
.meta {
  margin: 0; color: var(--mt); font-size: 13px;
  display: flex; gap: 8px; flex-wrap: wrap; align-items: center;
}
.chip {
  padding: 2px 8px; border: 1px solid var(--border);
  color: var(--mt); font: 500 10.5px/1.4 var(--font-mono);
}
.sep { color: var(--border); }
.actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }

.stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }

.grid { display: grid; grid-template-columns: 1.6fr 1fr; gap: 16px; }
@media (max-width: 1100px) { .grid { grid-template-columns: 1fr; } }

.cardHead { display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; }
.cardTitle {
  margin: 4px 0 0;
  font: 600 14px/1.3 var(--font-sans);
  color: var(--fg);
}
.song { font-family: var(--font-song); color: var(--primary); }

.sideCol { display: flex; flex-direction: column; gap: 16px; }

.progressRow {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 8px;
}
.progLabel {
  font: 500 10px/1 var(--font-mono);
  color: var(--mt2);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.progVal { font: 500 10.5px/1 var(--font-mono); color: var(--primary); }

.tags { display: flex; flex-wrap: wrap; gap: 6px; }
```

- [ ] **Step 3: Verify home page renders**

Run: `cd website && npm run dev`
Expected: after JWT injection (see spec §8.4), home page shows today's todos + stats + sidebar.

- [ ] **Step 4: Commit**

```bash
git add website/src/features/todo/TodayView.*
git commit -m "feat: add TodayView home page with stats and todo list"
```

---

## Task 14: AllTodosView

**Files:**
- Create: `website/src/features/todo/AllTodosView.tsx` + `.module.css`

- [ ] **Step 1: Create `AllTodosView.tsx`**

```tsx
import { useEffect, useMemo, useState } from 'react'
import { useTodoStore } from '@/stores/todos'
import { useComboStore } from '@/stores/combos'
import { Segmented } from 'antd'
import { Card, Eyebrow, Button } from '@/design/primitives'
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
```

- [ ] **Step 2: Create `AllTodosView.module.css`**

```css
.screen {
  padding: 24px 28px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto;
  flex: 1 1 auto;
}
.head { display: flex; justify-content: space-between; align-items: flex-end; }
.title {
  margin: 4px 0 0;
  font: 600 24px/1.15 var(--font-sans);
  color: var(--fg);
}
.song { font-family: var(--font-song); color: var(--primary); }

.comboFilters { display: flex; flex-wrap: wrap; gap: 6px; }
.comboBtn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 10px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--mt);
  font: 500 11.5px/1 var(--font-sans);
  cursor: pointer;
}
.comboBtn:hover { color: var(--fg); }
.comboAct { color: var(--fg); border-color: var(--primary-line); background: var(--primary-soft); }
.dot { width: 8px; height: 8px; }
```

- [ ] **Step 3: Commit**

```bash
git add website/src/features/todo/AllTodosView.*
git commit -m "feat: add AllTodosView with filter and combo filter"
```

---

## Task 15: TodoForm (Create/Edit)

**Files:**
- Create: `website/src/features/todo/TodoForm.tsx` + `.module.css`

- [ ] **Step 1: Create `TodoForm.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Input, DatePicker, TimePicker, Form, message, Button as AntButton } from 'antd'
import dayjs from 'dayjs'
import type { Todo } from '@/types'
import { useTodoStore } from '@/stores/todos'
import { useComboStore } from '@/stores/combos'
import { useTagStore } from '@/stores/tags'
import { todoApi } from '@/api/todos'
import { Button, Card, Eyebrow, Tag } from '@/design/primitives'
import { todayStr } from '@/lib/utils'
import styles from './TodoForm.module.css'

interface TodoFormProps {
  mode: 'create' | 'edit'
}

export function TodoForm({ mode }: TodoFormProps) {
  const navigate = useNavigate()
  const { id } = useParams()
  const createTodo = useTodoStore((s) => s.createTodo)
  const updateTodo = useTodoStore((s) => s.updateTodo)
  const combos = useComboStore((s) => s.combos)
  const { systemTags, userTags, fetchTags } = useTagStore()

  const [form] = Form.useForm()
  const [selectedTags, setSelectedTags] = useState<number[]>([])
  const [selectedCombo, setSelectedCombo] = useState<number | undefined>()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchTags()
    if (mode === 'edit' && id) {
      todoApi.getTodo(id).then((res) => {
        if (res.success && res.todo) {
          const t = res.todo
          form.setFieldsValue({
            text: t.text,
            remarks: t.remarks,
            setDate: t.setDate ? dayjs(t.setDate) : null,
            setTime: t.setTime ? dayjs(t.setTime, 'HH:mm') : null,
          })
          setSelectedTags(t.tags || [])
          setSelectedCombo(t.comboId)
        }
      })
    } else {
      form.setFieldsValue({ setDate: dayjs(todayStr()) })
    }
  }, [mode, id])

  const allTags = [...systemTags, ...userTags]

  const handleSubmit = async (values: {
    text: string
    remarks?: string
    setDate?: dayjs.Dayjs
    setTime?: dayjs.Dayjs
  }) => {
    setLoading(true)
    try {
      const data: Partial<Todo> = {
        text: values.text,
        remarks: values.remarks,
        setDate: values.setDate?.format('YYYY-MM-DD'),
        setTime: values.setTime?.format('HH:mm'),
        tags: selectedTags,
        comboId: selectedCombo,
      }
      if (mode === 'create') {
        await createTodo(data)
        message.success('创建成功')
      } else if (id) {
        await updateTodo(id, data)
        message.success('更新成功')
      }
      navigate('/')
    } catch (err) {
      message.error(err instanceof Error ? err.message : '操作失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.screen}>
      <div className={styles.head}>
        <div>
          <Eyebrow>{mode === 'create' ? 'NEW' : 'EDIT'}</Eyebrow>
          <h1 className={styles.title}>
            {mode === 'create' ? '新建' : '编辑'}
            <span className={styles.song}> 待办</span>
          </h1>
        </div>
        <Button variant="gh" size="sm" onClick={() => navigate(-1)}>← 返回</Button>
      </div>

      <Card>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item label="内容" name="text" rules={[{ required: true, message: '请输入待办内容' }]}>
            <Input placeholder="待办内容" />
          </Form.Item>

          <div className={styles.row}>
            <Form.Item label="日期" name="setDate" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="时间" name="setTime" style={{ flex: 1 }}>
              <TimePicker format="HH:mm" style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <Form.Item label="备注" name="remarks">
            <Input.TextArea rows={3} placeholder="备注信息" />
          </Form.Item>

          <div className={styles.section}>
            <div className={styles.secLabel}>组合</div>
            <div className={styles.tags}>
              <button
                className={[styles.comboBtn, !selectedCombo && styles.comboAct].filter(Boolean).join(' ')}
                onClick={() => setSelectedCombo(undefined)}
                type="button"
              >
                无
              </button>
              {combos.map((c) => (
                <button
                  key={c.id}
                  className={[styles.comboBtn, selectedCombo === c.id && styles.comboAct].filter(Boolean).join(' ')}
                  onClick={() => setSelectedCombo(c.id)}
                  type="button"
                >
                  <span className={styles.dot} style={{ background: c.color }} />
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.secLabel}>标签</div>
            <div className={styles.tags}>
              {allTags.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={styles.tagBtn}
                  onClick={() => {
                    setSelectedTags((prev) =>
                      prev.includes(t.id) ? prev.filter((x) => x !== t.id) : [...prev, t.id],
                    )
                  }}
                >
                  <Tag tone={selectedTags.includes(t.id) ? 'pri' : 'default'}>{t.name}</Tag>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.actions}>
            <AntButton type="primary" htmlType="submit" loading={loading}>
              {mode === 'create' ? '创建' : '保存'}
            </AntButton>
            <AntButton onClick={() => navigate(-1)}>取消</AntButton>
          </div>
        </Form>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Create `TodoForm.module.css`**

```css
.screen {
  padding: 24px 28px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto;
  flex: 1 1 auto;
  max-width: 720px;
}
.head { display: flex; justify-content: space-between; align-items: flex-end; }
.title {
  margin: 4px 0 0;
  font: 600 24px/1.15 var(--font-sans);
  color: var(--fg);
}
.song { font-family: var(--font-song); color: var(--primary); }

.row { display: flex; gap: 12px; }

.section { margin-top: 8px; }
.secLabel {
  font: 500 10px/1 var(--font-mono);
  color: var(--mt2);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 8px;
}
.tags { display: flex; flex-wrap: wrap; gap: 6px; }
.comboBtn, .tagBtn {
  display: inline-flex; align-items: center; gap: 6px;
  border: 0; background: transparent; padding: 0;
  cursor: pointer;
}
.comboBtn {
  padding: 4px 10px;
  border: 1px solid var(--border);
  color: var(--mt);
  font: 500 11.5px/1 var(--font-sans);
}
.comboBtn:hover { color: var(--fg); }
.comboAct { color: var(--fg); border-color: var(--primary-line); background: var(--primary-soft); }
.dot { width: 8px; height: 8px; }

.actions { display: flex; gap: 8px; margin-top: 16px; }
```

- [ ] **Step 3: Commit**

```bash
git add website/src/features/todo/TodoForm.*
git commit -m "feat: add TodoForm for create/edit with tags and combo selection"
```

---

## Task 16: TodoDetail

**Files:**
- Create: `website/src/features/todo/TodoDetail.tsx` + `.module.css`

- [ ] **Step 1: Create `TodoDetail.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Popconfirm, message } from 'antd'
import type { Todo } from '@/types'
import { todoApi } from '@/api/todos'
import { useTodoStore } from '@/stores/todos'
import { useComboStore } from '@/stores/combos'
import { Button, Card, Eyebrow, StatusChip, Tag } from '@/design/primitives'
import styles from './TodoDetail.module.css'

export function TodoDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [todo, setTodo] = useState<Todo | null>(null)
  const [loading, setLoading] = useState(true)
  const toggleComplete = useTodoStore((s) => s.toggleComplete)
  const toggleStar = useTodoStore((s) => s.toggleStar)
  const deleteTodo = useTodoStore((s) => s.deleteTodo)
  const combos = useComboStore((s) => s.combos)

  useEffect(() => {
    if (!id) return
    todoApi.getTodo(id).then((res) => {
      if (res.success && res.todo) setTodo(res.todo)
    }).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className={styles.loading}>加载中...</div>
  if (!todo) return <div className={styles.loading}>未找到</div>

  const combo = combos.find((c) => c.id === todo.comboId)

  return (
    <div className={styles.screen}>
      <div className={styles.head}>
        <div>
          <Eyebrow>DETAIL</Eyebrow>
          <h1 className={styles.title}>{todo.text}</h1>
        </div>
        <Button variant="gh" size="sm" onClick={() => navigate(-1)}>← 返回</Button>
      </div>

      <Card>
        <div className={styles.row}>
          <span className={styles.label}>状态</span>
          <StatusChip tone={todo.completed ? 'ok' : 'default'}>
            {todo.completed ? '已完成' : '待办'}
          </StatusChip>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>日期</span>
          <span>{todo.setDate || '未设置'}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>时间</span>
          <span>{todo.setTime || '未设置'}</span>
        </div>
        {combo && (
          <div className={styles.row}>
            <span className={styles.label}>组合</span>
            <Tag tone="pri">{combo.name}</Tag>
          </div>
        )}
        {todo.remarks && (
          <div className={styles.row}>
            <span className={styles.label}>备注</span>
            <span className={styles.remarks}>{todo.remarks}</span>
          </div>
        )}
      </Card>

      <div className={styles.actions}>
        <Button
          variant="pri"
          onClick={() => toggleComplete(todo.id).then(() => navigate('/'))}
        >
          {todo.completed ? '标记未完成' : '标记完成'}
        </Button>
        <Button variant="sec" onClick={() => navigate(`/todos/${todo.id}/edit`)}>
          编辑
        </Button>
        <Button variant="gh" onClick={() => toggleStar(todo.id)}>
          {todo.isStar ? '取消收藏' : '收藏'}
        </Button>
        <Popconfirm
          title="确定删除此待办吗？"
          onConfirm={async () => {
            await deleteTodo(todo.id)
            message.success('已删除')
            navigate('/')
          }}
        >
          <Button variant="gh">删除</Button>
        </Popconfirm>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `TodoDetail.module.css`**

```css
.screen {
  padding: 24px 28px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto;
  flex: 1 1 auto;
  max-width: 720px;
}
.head { display: flex; justify-content: space-between; align-items: flex-end; }
.title {
  margin: 4px 0 0;
  font: 600 20px/1.3 var(--font-sans);
  color: var(--fg);
}
.loading { padding: 40px; color: var(--mt); text-align: center; }

.row {
  display: flex; gap: 14px; align-items: flex-start;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
  font-size: 13px;
}
.row:last-child { border-bottom: 0; }
.label {
  font: 500 10px/1 var(--font-mono);
  color: var(--mt2);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  min-width: 60px;
  padding-top: 2px;
}
.remarks { color: var(--mt); white-space: pre-wrap; }

.actions { display: flex; gap: 8px; flex-wrap: wrap; }
```

- [ ] **Step 3: Commit**

```bash
git add website/src/features/todo/TodoDetail.*
git commit -m "feat: add TodoDetail page with actions"
```

---

## Task 17: CalendarView

**Files:**
- Create: `website/src/features/calendar/CalendarView.tsx` + `.module.css`

- [ ] **Step 1: Create `CalendarView.tsx`**

```tsx
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { useTodoStore } from '@/stores/todos'
import { Card, Eyebrow, Button } from '@/design/primitives'
import { TodoItem } from '@/features/todo/TodoItem'
import styles from './CalendarView.module.css'

export function CalendarView() {
  const navigate = useNavigate()
  const { todos, fetchTodos, loading } = useTodoStore()
  const [current, setCurrent] = useState(dayjs())
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'))

  useEffect(() => { fetchTodos() }, [fetchTodos])

  const todosByDate = useMemo(() => {
    const map: Record<string, typeof todos> = {}
    todos.filter((t) => !t.isDeleted && t.setDate).forEach((t) => {
      if (!map[t.setDate!]) map[t.setDate!] = []
      map[t.setDate!].push(t)
    })
    return map
  }, [todos])

  const days = useMemo(() => {
    const start = current.startOf('month').startOf('week')
    const end = current.endOf('month').endOf('week')
    const arr: dayjs.Dayjs[] = []
    let d = start
    while (d.isBefore(end) || d.isSame(end)) {
      arr.push(d)
      d = d.add(1, 'day')
    }
    return arr
  }, [current])

  const selectedTodos = todosByDate[selectedDate] || []

  return (
    <div className={styles.screen}>
      <div className={styles.head}>
        <div>
          <Eyebrow>CALENDAR</Eyebrow>
          <h1 className={styles.title}>{current.format('YYYY 年 M 月')}</h1>
        </div>
        <div className={styles.nav}>
          <Button variant="gh" size="sm" onClick={() => setCurrent(current.subtract(1, 'month'))}>←</Button>
          <Button variant="gh" size="sm" onClick={() => setCurrent(dayjs())}>今天</Button>
          <Button variant="gh" size="sm" onClick={() => setCurrent(current.add(1, 'month'))}>→</Button>
        </div>
      </div>

      <Card>
        <div className={styles.weekHeader}>
          {['一', '二', '三', '四', '五', '六', '日'].map((w) => (
            <div key={w} className={styles.weekCell}>{w}</div>
          ))}
        </div>
        <div className={styles.dayGrid}>
          {days.map((d) => {
            const dateStr = d.format('YYYY-MM-DD')
            const inMonth = d.month() === current.month()
            const isToday = dateStr === dayjs().format('YYYY-MM-DD')
            const isSelected = dateStr === selectedDate
            const hasTodos = (todosByDate[dateStr]?.length || 0) > 0
            return (
              <button
                key={dateStr}
                className={[
                  styles.dayCell,
                  !inMonth && styles.outOfMonth,
                  isToday && styles.today,
                  isSelected && styles.selected,
                ].filter(Boolean).join(' ')}
                onClick={() => setSelectedDate(dateStr)}
                type="button"
              >
                <span className={styles.dayNum}>{d.date()}</span>
                {hasTodos && <span className={styles.dot} />}
              </button>
            )
          })}
        </div>
      </Card>

      <Card>
        <div className={styles.cardHead}>
          <div>
            <Eyebrow>{selectedDate}</Eyebrow>
            <h3 className={styles.cardTitle}>{selectedTodos.length} 项待办</h3>
          </div>
          <Button variant="pri" size="sm" onClick={() => navigate('/todos/new')}>+ 添加</Button>
        </div>
        <div>
          {loading && <div style={{ color: 'var(--mt)', padding: '20px 0' }}>加载中...</div>}
          {!loading && selectedTodos.length === 0 && (
            <div style={{ color: 'var(--mt)', padding: '20px 0' }}>当日无待办</div>
          )}
          {selectedTodos.map((t) => <TodoItem key={t.id} todo={t} />)}
        </div>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Create `CalendarView.module.css`**

```css
.screen {
  padding: 24px 28px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto;
  flex: 1 1 auto;
}
.head { display: flex; justify-content: space-between; align-items: flex-end; }
.title {
  margin: 4px 0 0;
  font: 600 24px/1.15 var(--font-sans);
  color: var(--fg);
}
.nav { display: flex; gap: 6px; }

.weekHeader {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 8px;
}
.weekCell {
  font: 500 10px/1 var(--font-mono);
  color: var(--mt3);
  text-align: center;
  padding: 4px 0;
}

.dayGrid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}
.dayCell {
  position: relative;
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  background: transparent;
  color: var(--fg);
  font-size: 11.5px;
  cursor: pointer;
  padding: 0;
}
.dayCell:hover { background: var(--muted); }
.outOfMonth { color: var(--mt3); }
.today { background: var(--primary); color: var(--primary-fg); font-weight: 600; }
.selected { border-color: var(--primary-line); background: var(--primary-soft); }
.today.selected { background: var(--primary); }
.dayNum { font: 500 11.5px/1 var(--font-sans); }
.dot {
  position: absolute;
  bottom: 4px;
  width: 3px; height: 3px;
  background: var(--primary);
  border-radius: 50%;
}
.today .dot { background: var(--primary-fg); }

.cardHead { display: flex; justify-content: space-between; align-items: flex-start; }
.cardTitle {
  margin: 4px 0 0;
  font: 600 14px/1.3 var(--font-sans);
  color: var(--fg);
}
```

- [ ] **Step 3: Commit**

```bash
git add website/src/features/calendar
git commit -m "feat: add CalendarView with month grid and daily todo list"
```

---

## Task 18: Integration Verification & Polish

**Files:**
- Verify all routes work
- Fix any compile/runtime errors

- [ ] **Step 1: Full type check**

Run: `cd website && npx tsc --noEmit`
Expected: no errors. Fix any that appear.

- [ ] **Step 2: Start dev server and verify all P0 routes**

Run: `cd website && npm run dev`

Test flow:
1. Visit `http://localhost:5173` → should redirect to `/login`
2. Inject JWT in console (see spec §8.4):
   ```js
   localStorage.setItem('authToken','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwib3BlbmlkIjoiZGV2X3Rlc3Rfb3BlbmlkIiwiaWF0IjoxNzgzODQyNDczLCJleHAiOjE3ODQ0NDcyNzN9.gIdbpEyNNtHntFTM337IloC5cuPbM-ttvu9NfSnzCDM');location.href='/'
   ```
3. Verify routes:
   - `/` (Today) — shows stats + todo list
   - `/todos` (All) — shows filterable list
   - `/todos/new` — shows form
   - `/todos/:id` — shows detail
   - `/calendar` — shows month grid
4. Verify theme toggle (sun/moon icon in topbar)
5. Verify sidebar navigation

- [ ] **Step 3: Fix `providers.tsx` typo**

In `src/app/providers.tsx`, fix the closing tag:
- Find: `</ThemeModeContext.Provider.Provider>`
- Replace: `</ThemeModeContext.Provider>`

Also move the `import { createContext, useContext } from 'react'` to the top of the file (currently mid-file).

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "fix: integration polish and providers typo"
```

---

## Self-Review Notes

**Spec coverage check:**
- §1-3 Background/Tech/Structure: Tasks 1-4
- §4 Design system: Tasks 2, 5-7
- §5 Layout: Tasks 9-10
- §6 P0 routes: Tasks 11-17 (Login, Today, All, Form, Detail, Calendar)
- §7 Zustand stores: Task 4
- §8 API & auth: Task 3 (API), Task 11 (login)
- §9 Component layering: Tasks 5-7 (primitives), 12 (feature)
- §10 Theme switching: Task 8 (providers), Task 10 (topbar toggle)
- §11 Data flow: Task 4 (stores enforce version/updatedAt)

**Known gaps (acceptable for P0):**
- P1 pages (stats/combos/search/trash/user-center) not implemented — per spec, P1 is separate
- Tests not written — spec §12 targets; P0 manual verification per Task 18
- Responsive breakpoints (<768px tab bar) not fully implemented — desktop-first for P0
- echarts not wired (no stats page in P0)

**Type consistency:** All stores use `Todo`/`Combo`/`Tag`/`User` from `@/types`. API methods match existing `api/*.ts` signatures.
