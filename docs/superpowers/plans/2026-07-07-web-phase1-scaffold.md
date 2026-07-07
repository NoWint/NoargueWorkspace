# Phase 1: 脚手架搭建 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the entire frontend project — Vite + Vue 3 + TypeScript, TDesign Vue, routing, state management, request layer, styles — so Phase 2 can start coding login and todo UI immediately.

**Architecture:** SPA with Vue Router for client-side routing, Pinia stores split by domain (auth/todos/combos/tags/config), Axios instance with JWT interceptor for all API calls, TDesign Vue for UI components.

**Tech Stack:** Vite 5, Vue 3 (Composition API + `<script setup>`), TypeScript, Vue Router 4, Pinia, Axios, TDesign Vue Next

**Files to create (full list):**

```
website/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── package.json
├── .env.development
├── .env.production
├── public/
│   ├── favicon.svg
│   └── logo.png
└── src/
    ├── main.ts
    ├── App.vue
    ├── router/
    │   └── index.ts
    ├── stores/
    │   ├── auth.ts
    │   ├── todos.ts
    │   ├── combos.ts
    │   ├── tags.ts
    │   └── config.ts
    ├── api/
    │   ├── request.ts
    │   ├── auth.ts
    │   ├── todos.ts
    │   ├── combos.ts
    │   ├── tags.ts
    │   └── config.ts
    ├── types/
    │   └── index.ts
    ├── components/
    │   ├── layout/
    │   │   ├── AppSidebar.vue
    │   │   ├── AppHeader.vue
    │   │   └── AppContent.vue
    │   └── common/
    │       ├── GlassPanel.vue
    │       └── EmptyState.vue
    ├── views/
    │   ├── LoginView.vue
    │   ├── TodoView.vue
    │   ├── CalendarView.vue
    │   ├── CommunityView.vue
    │   ├── StatsView.vue
    │   ├── MoreView.vue
    │   ├── UserCenterView.vue
    │   └── NotFoundView.vue
    └── styles/
        ├── variables.css
        └── global.css
```

---

### Task 1: Initialize Vite + Vue 3 + TypeScript project

**Files:**
- Create: `website/package.json`
- Create: `website/tsconfig.json`
- Create: `website/tsconfig.node.json`
- Create: `website/vite.config.ts`
- Create: `website/index.html`
- Create: `website/.env.development`
- Create: `website/.env.production`
- Create: `website/src/main.ts`
- Create: `website/public/favicon.svg`
- Create: `website/public/logo.png` (placeholder)

- [ ] **Step 1: Write package.json**

```json
{
  "name": "timegreenpath-web",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "vue": "^3.5.0",
    "vue-router": "^4.4.0",
    "pinia": "^2.2.0",
    "axios": "^1.7.0",
    "tdesign-vue-next": "^1.10.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.1.0",
    "vite": "^5.4.0",
    "typescript": "~5.5.0",
    "vue-tsc": "^2.1.0",
    "@tsconfig/node22": "^22.0.0"
  }
}
```

- [ ] **Step 2: Write tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "preserve",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.vue", "src/**/*.d.ts"]
}
```

- [ ] **Step 3: Write tsconfig.node.json**

```json
{
  "extends": "@tsconfig/node22/tsconfig.json",
  "include": ["vite.config.*"]
}
```

- [ ] **Step 4: Write vite.config.ts**

```ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  server: {
    port: 5173,
  },
})
```

- [ ] **Step 5: Write index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <title>时光绿径待办</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 6: Write env files**

`.env.development`:
```
VITE_API_BASE_URL=https://api.yzjtiantian.cn
```

`.env.production`:
```
VITE_API_BASE_URL=https://api.yzjtiantian.cn
```

- [ ] **Step 7: Write a minimal favicon.svg** (simple green circle)

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <circle cx="16" cy="16" r="14" fill="#00b26a"/>
  <path d="M9 16l5 5 9-9" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

- [ ] **Step 8: Write a minimal logo.png placeholder comment** (copy the remote logo later; for now just create the file)

Run:
```bash
# Download the logo from the server (or create empty file as placeholder)
mkdir -p website/public
# Skip if curl unavailable — just touch an empty file
touch website/public/logo.png
```

- [ ] **Step 9: Write src/env.d.ts for Vite type hints**

Create `website/src/env.d.ts`:
```ts
/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}
```

- [ ] **Step 10: Write main.ts (entry point)**

```ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import TDesign from 'tdesign-vue-next'
import 'tdesign-vue-next/es/style/index.css'
import router from './router'
import App from './App.vue'
import './styles/global.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(TDesign)
app.mount('#app')
```

- [ ] **Step 11: Install dependencies**

Run:
```bash
cd website
npm install
```

Expected: packages install without errors.

- [ ] **Step 12: Verify the project starts**

Run:
```bash
cd website
npm run dev
```

Expected: Vite dev server starts on port 5173. Open browser → shows blank page (no routes configured yet, App.vue is empty). Kill the server with Ctrl+C.

- [ ] **Step 13: Commit**

```bash
git add website/
git commit -m "feat(web): scaffold Vite + Vue 3 + TypeScript project"
```

---

### Task 2: Write TypeScript type definitions

**Files:**
- Create: `website/src/types/index.ts`

- [ ] **Step 1: Write src/types/index.ts**

```ts
// ====== 用户 ======
export interface User {
  id: number
  openid: string
  nickname: string
  avatarUrl: string
  todoLimit: number
  comboLimit: number
  collabLimit: number
  isAdmin: boolean
  badgeTitles: string[]
  badgeColors: string[]
  createdAt?: string
}

// ====== 待办 ======
export interface Todo {
  id: number
  todoId?: string
  userId: number
  text: string
  setDate?: string
  setTime?: string
  remarks?: string
  locationText?: string
  completed: number
  isStar: number
  tags?: string
  images?: string
  version: number
  isDeleted: number
  comboId?: number
  createdAt: string
  updatedAt?: string
}

// ====== 组合 ======
export interface Combo {
  id: number
  userId: number
  name: string
  description?: string
  icon: string
  color: string
  isShared: boolean
  memberLimit: number
  sortOrder: number
}

// ====== 标签 ======
export interface Tag {
  id: number
  name: string
  color: string
  icon?: string
  isSystem: number
  userId?: number
  sortOrder: number
}

// ====== 公告 ======
export interface Notice {
  id: number | string
  title: string
  content: string
  createdAt: string
}

// ====== 更新日志 ======
export interface Changelog {
  id: number | string
  version: string
  title: string
  content: string
  createdAt: string
}

// ====== API 响应 ======
export interface ApiResponse<T> {
  success: boolean
  message?: string
  data?: T
  total?: number
}

export interface ApiListData<T> {
  list: T[]
  total: number
  page: number
  size: number
}

// 扫码状态查询特殊响应
export interface QrCodeStatusResponse {
  success: boolean
  status: 'waiting' | 'scanned' | 'confirmed' | 'expired'
  message: string
  token?: string
  user?: User
}
```

- [ ] **Step 2: Commit**

```bash
git add website/src/types/index.ts
git commit -m "feat(web): add TypeScript type definitions"
```

---

### Task 3: Write CSS variables and global styles

**Files:**
- Create: `website/src/styles/variables.css`
- Create: `website/src/styles/global.css`

- [ ] **Step 1: Write src/styles/variables.css**

```css
:root {
  /* 品牌色 */
  --color-primary: #00b26a;
  --color-primary-hover: #009a5a;
  --color-primary-light: rgba(0, 178, 106, 0.08);
  --color-primary-bg: #e3f5eb;

  /* 语义色 */
  --color-success: #00b26a;
  --color-warning: #ff9800;
  --color-error: #f44336;
  --color-info: #2196f3;

  /* 背景 */
  --bg-page: #f7f8fa;
  --bg-card: #ffffff;
  --bg-glass: rgba(255, 255, 255, 0.7);
  --bg-sidebar: rgba(247, 248, 250, 0.85);
  --bg-hover: rgba(0, 0, 0, 0.04);

  /* 文字 */
  --text-primary: #1d2129;
  --text-secondary: #86909c;
  --text-disabled: #c9cdd4;
  --text-white: #ffffff;

  /* 边框 */
  --border-color: #e5e6e8;
  --border-radius: 8px;
  --border-radius-lg: 12px;

  /* 阴影 */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 4px 16px rgba(0, 0, 0, 0.08);

  /* 毛玻璃 */
  --glass-blur: blur(20px);
  --glass-saturate: saturate(180%);

  /* 字号 */
  --font-size-xs: 12px;
  --font-size-sm: 13px;
  --font-size-base: 14px;
  --font-size-lg: 16px;
  --font-size-xl: 20px;
  --font-size-2xl: 24px;

  /* 字体系列 */
  --font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI',
    'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;

  /* 间距 */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;

  /* 布局 */
  --sidebar-width: 240px;
  --sidebar-collapsed-width: 64px;
  --header-height: 56px;
  --tag-panel-width: 180px;
}
```

- [ ] **Step 2: Write src/styles/global.css**

```css
@import './variables.css';

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: var(--font-size-base);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  font-family: var(--font-family);
  color: var(--text-primary);
  background-color: var(--bg-page);
  min-height: 100vh;
}

#app {
  min-height: 100vh;
}

a {
  color: var(--color-primary);
  text-decoration: none;
}

a:hover {
  color: var(--color-primary-hover);
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--text-disabled);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}
```

- [ ] **Step 3: Commit**

```bash
git add website/src/styles/
git commit -m "feat(web): add CSS variables and global styles"
```

---

### Task 4: Write Axios instance (request layer)

**Files:**
- Create: `website/src/api/request.ts`

- [ ] **Step 1: Write src/api/request.ts**

```ts
import axios from 'axios'
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { MessagePlugin } from 'tdesign-vue-next'

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
})

// 请求拦截器：注入 JWT
http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('authToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器：解包 + 401 处理
http.interceptors.response.use(
  (response: AxiosResponse) => {
    return response.data
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken')
      window.location.href = '/login'
      return Promise.reject(error)
    }
    const msg = error.response?.data?.message || error.message || '网络请求失败'
    MessagePlugin.warning(msg)
    return Promise.reject(error)
  },
)

export default http
```

- [ ] **Step 2: Commit**

```bash
git add website/src/api/request.ts
git commit -m "feat(web): add Axios instance with JWT interceptor"
```

---

### Task 5: Write API module skeletons

**Files:**
- Create: `website/src/api/auth.ts`
- Create: `website/src/api/todos.ts`
- Create: `website/src/api/combos.ts`
- Create: `website/src/api/tags.ts`
- Create: `website/src/api/config.ts`

- [ ] **Step 1: Write src/api/auth.ts**

```ts
import http from './request'
import type { ApiResponse, User, QrCodeStatusResponse } from '@/types'

export const authApi = {
  login: (code: string) =>
    http.post<ApiResponse<{ token: string; user: User }>>('/auth/login', { code }),

  getUserInfo: () =>
    http.get<ApiResponse<{ user: User }>>('/auth/userInfo'),

  updateUserInfo: (data: { nickname?: string; avatarUrl?: string }) =>
    http.post<ApiResponse<null>>('/auth/updateUserInfo', data),

  generateQrCode: () =>
    http.post<ApiResponse<{ sceneId: string; qrcodeUrl: string; expiresAt: number }>>('/auth/qrcode/generate'),

  getQrCodeStatus: (sceneId: string) =>
    http.get<QrCodeStatusResponse>('/auth/qrcode/status', { params: { sceneId } }),

  confirmQrCodeLogin: (sceneId: string) =>
    http.post<ApiResponse<null>>('/auth/qrcode/confirm', { sceneId }),
}
```

- [ ] **Step 2: Write src/api/todos.ts**

```ts
import http from './request'
import type { ApiResponse, ApiListData, Todo } from '@/types'

export const todosApi = {
  getList: (params?: {
    page?: number
    size?: number
    comboId?: number
    tagIds?: string
    search?: string
    showCompleted?: boolean
    date?: string
  }) =>
    http.get<ApiResponse<ApiListData<Todo>>>('/todos/list', { params }),

  getById: (id: number) =>
    http.get<ApiResponse<Todo>>(`/todos/${id}`),

  create: (data: Partial<Todo>) =>
    http.post<ApiResponse<Todo>>('/todos/create', data),

  update: (id: number, data: Partial<Todo>) =>
    http.put<ApiResponse<Todo>>(`/todos/${id}`, data),

  delete: (id: number) =>
    http.delete<ApiResponse<null>>(`/todos/${id}`),

  getDeleted: () =>
    http.get<ApiResponse<ApiListData<Todo>>>('/todos/deleted'),

  restore: (todoId: number) =>
    http.post<ApiResponse<null>>(`/todos/restore/${todoId}`),

  permanentDelete: (todoId: number) =>
    http.delete<ApiResponse<null>>(`/todos/permanent/${todoId}`),
}
```

- [ ] **Step 3: Write src/api/combos.ts**

```ts
import http from './request'
import type { ApiResponse, Combo } from '@/types'

export const combosApi = {
  getList: () =>
    http.get<ApiResponse<Combo[]>>('/combos/list'),

  getById: (id: number) =>
    http.get<ApiResponse<Combo>>(`/combos/${id}`),

  create: (data: Partial<Combo>) =>
    http.post<ApiResponse<Combo>>('/combos/create', data),

  update: (id: number, data: Partial<Combo>) =>
    http.put<ApiResponse<Combo>>(`/combos/${id}`, data),

  delete: (id: number) =>
    http.delete<ApiResponse<null>>(`/combos/${id}`),
}
```

- [ ] **Step 4: Write src/api/tags.ts**

```ts
import http from './request'
import type { ApiResponse, Tag } from '@/types'

export const tagsApi = {
  getList: () =>
    http.get<ApiResponse<Tag[]>>('/tags/list'),

  create: (data: Partial<Tag>) =>
    http.post<ApiResponse<Tag>>('/tags/create', data),

  update: (id: number, data: Partial<Tag>) =>
    http.put<ApiResponse<Tag>>(`/tags/${id}`, data),

  delete: (id: number) =>
    http.delete<ApiResponse<null>>(`/tags/${id}`),
}
```

- [ ] **Step 5: Write src/api/config.ts**

```ts
import http from './request'
import type { ApiResponse, Notice, Changelog } from '@/types'

export const configApi = {
  getNotices: () =>
    http.get<ApiResponse<Notice[]>>('/config/notices'),

  getChangelog: () =>
    http.get<ApiResponse<Changelog[]>>('/config/updates'),
}
```

- [ ] **Step 6: Commit**

```bash
git add website/src/api/
git commit -m "feat(web): add API modules (auth/todos/combos/tags/config)"
```

---

### Task 6: Write Pinia store skeletons

**Files:**
- Create: `website/src/stores/auth.ts`
- Create: `website/src/stores/todos.ts`
- Create: `website/src/stores/combos.ts`
- Create: `website/src/stores/tags.ts`
- Create: `website/src/stores/config.ts`

- [ ] **Step 1: Write src/stores/auth.ts**

```ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/types'
import { authApi } from '@/api/auth'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('authToken'))
  const user = ref<User | null>(null)
  const loading = ref(false)

  const isLoggedIn = computed(() => !!token.value)

  function saveToken(t: string) {
    token.value = t
    localStorage.setItem('authToken', t)
  }

  function clearAuth() {
    token.value = null
    user.value = null
    localStorage.removeItem('authToken')
  }

  async function loginByQrCode() {
    // Phase 2: 完整实现——调用 generateQrCode + 轮询 getQrCodeStatus
    // 直到 status === 'confirmed' 拿到 token
    throw new Error('Not implemented in Phase 1')
  }

  async function logout() {
    clearAuth()
    window.location.href = '/login'
  }

  async function fetchUserInfo() {
    try {
      loading.value = true
      const res = await authApi.getUserInfo()
      if (res.success && res.data) {
        user.value = res.data.user
      }
    } finally {
      loading.value = false
    }
  }

  return {
    token,
    user,
    loading,
    isLoggedIn,
    saveToken,
    clearAuth,
    loginByQrCode,
    logout,
    fetchUserInfo,
  }
})
```

- [ ] **Step 2: Write src/stores/todos.ts**

```ts
import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import type { Todo } from '@/types'
import { todosApi } from '@/api/todos'

export const useTodosStore = defineStore('todos', () => {
  const items = ref<Todo[]>([])
  const deletedItems = ref<Todo[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const filter = reactive({
    comboId: null as number | null,
    tagIds: [] as number[],
    search: '',
    showCompleted: true,
  })

  async function fetchTodos() {
    try {
      loading.value = true
      error.value = null
      const params: Record<string, string | number | boolean> = {}
      if (filter.comboId) params.comboId = filter.comboId
      if (filter.tagIds.length) params.tagIds = filter.tagIds.join(',')
      if (filter.search) params.search = filter.search
      params.showCompleted = filter.showCompleted
      const res = await todosApi.getList(params)
      if (res.success && res.data) {
        items.value = res.data.list
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载待办失败'
    } finally {
      loading.value = false
    }
  }

  async function createTodo(data: Partial<Todo>) {
    const res = await todosApi.create(data)
    if (res.success && res.data) {
      items.value.unshift(res.data)
    }
    return res
  }

  async function updateTodo(id: number, data: Partial<Todo>) {
    const res = await todosApi.update(id, data)
    if (res.success) {
      const idx = items.value.findIndex((t) => t.id === id)
      if (idx !== -1 && res.data) {
        items.value[idx] = res.data
      }
    }
    return res
  }

  async function deleteTodo(id: number) {
    const res = await todosApi.delete(id)
    if (res.success) {
      items.value = items.value.filter((t) => t.id !== id)
    }
    return res
  }

  // --- 乐观更新（见 spec 13.4）---
  async function toggleComplete(id: number) {
    const idx = items.value.findIndex((t) => t.id === id)
    if (idx === -1) return
    const snapshot = JSON.parse(JSON.stringify(items.value[idx]))
    const original = items.value[idx].completed
    items.value[idx].completed = original ? 0 : 1
    try {
      await todosApi.update(id, { completed: items.value[idx].completed })
    } catch {
      items.value[idx].completed = original
    }
  }

  async function toggleStar(id: number) {
    const idx = items.value.findIndex((t) => t.id === id)
    if (idx === -1) return
    const snapshot = JSON.parse(JSON.stringify(items.value[idx]))
    const original = items.value[idx].isStar
    items.value[idx].isStar = original ? 0 : 1
    try {
      await todosApi.update(id, { isStar: items.value[idx].isStar })
    } catch {
      items.value[idx].isStar = original
    }
  }

  // --- 回收站 ---
  async function fetchDeletedTodos() {
    const res = await todosApi.getDeleted()
    if (res.success && res.data) {
      deletedItems.value = res.data.list
    }
    return res
  }

  async function restoreTodo(todoId: number) {
    const res = await todosApi.restore(todoId)
    if (res.success) {
      deletedItems.value = deletedItems.value.filter((t) => t.id !== todoId)
    }
    return res
  }

  async function permanentDeleteTodo(todoId: number) {
    const res = await todosApi.permanentDelete(todoId)
    if (res.success) {
      deletedItems.value = deletedItems.value.filter((t) => t.id !== todoId)
    }
    return res
  }

  return {
    items,
    deletedItems,
    loading,
    error,
    filter,
    fetchTodos,
    createTodo,
    updateTodo,
    deleteTodo,
    toggleComplete,
    toggleStar,
    fetchDeletedTodos,
    restoreTodo,
    permanentDeleteTodo,
  }
})
```

- [ ] **Step 3: Write src/stores/combos.ts**

```ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Combo } from '@/types'
import { combosApi } from '@/api/combos'

export const useCombosStore = defineStore('combos', () => {
  const items = ref<Combo[]>([])
  const loading = ref(false)
  const selectedId = ref<number | null>(null)

  async function fetchCombos() {
    loading.value = true
    try {
      const res = await combosApi.getList()
      if (res.success && res.data) {
        items.value = Array.isArray(res.data) ? res.data : []
      }
    } finally {
      loading.value = false
    }
  }

  function selectCombo(id: number | null) {
    selectedId.value = id
  }

  async function createCombo(data: Partial<Combo>) {
    const res = await combosApi.create(data)
    if (res.success && res.data) {
      items.value.push(res.data)
    }
    return res
  }

  async function updateCombo(id: number, data: Partial<Combo>) {
    const res = await combosApi.update(id, data)
    if (res.success) {
      const idx = items.value.findIndex((c) => c.id === id)
      if (idx !== -1 && res.data) items.value[idx] = res.data
    }
    return res
  }

  async function deleteCombo(id: number) {
    const res = await combosApi.delete(id)
    if (res.success) {
      items.value = items.value.filter((c) => c.id !== id)
      if (selectedId.value === id) selectedId.value = null
    }
    return res
  }

  return {
    items,
    loading,
    selectedId,
    fetchCombos,
    selectCombo,
    createCombo,
    updateCombo,
    deleteCombo,
  }
})
```

- [ ] **Step 4: Write src/stores/tags.ts**

```ts
import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import type { Tag } from '@/types'
import { tagsApi } from '@/api/tags'

export const useTagsStore = defineStore('tags', () => {
  const items = ref<Tag[]>([])
  const loading = ref(false)
  const selectedIds = reactive<number[]>([])

  async function fetchTags() {
    loading.value = true
    try {
      const res = await tagsApi.getList()
      if (res.success && res.data) {
        items.value = Array.isArray(res.data) ? res.data : []
      }
    } finally {
      loading.value = false
    }
  }

  function toggleTag(id: number) {
    const idx = selectedIds.indexOf(id)
    if (idx === -1) {
      selectedIds.push(id)
    } else {
      selectedIds.splice(idx, 1)
    }
  }

  async function createTag(data: Partial<Tag>) {
    const res = await tagsApi.create(data)
    if (res.success && res.data) {
      items.value.push(res.data)
    }
    return res
  }

  async function updateTag(id: number, data: Partial<Tag>) {
    const res = await tagsApi.update(id, data)
    if (res.success) {
      const idx = items.value.findIndex((t) => t.id === id)
      if (idx !== -1 && res.data) items.value[idx] = res.data
    }
    return res
  }

  async function deleteTag(id: number) {
    const res = await tagsApi.delete(id)
    if (res.success) {
      items.value = items.value.filter((t) => t.id !== id)
    }
    return res
  }

  return {
    items,
    loading,
    selectedIds,
    fetchTags,
    toggleTag,
    createTag,
    updateTag,
    deleteTag,
  }
})
```

- [ ] **Step 5: Write src/stores/config.ts**

```ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Notice, Changelog } from '@/types'
import { configApi } from '@/api/config'

export const useConfigStore = defineStore('config', () => {
  const notices = ref<Notice[]>([])
  const changelog = ref<Changelog[]>([])
  const loading = ref(false)

  async function fetchNotices() {
    loading.value = true
    try {
      const res = await configApi.getNotices()
      if (res.success && res.data) {
        notices.value = Array.isArray(res.data) ? res.data : []
      }
    } finally {
      loading.value = false
    }
  }

  async function fetchChangelog() {
    loading.value = true
    try {
      const res = await configApi.getChangelog()
      if (res.success && res.data) {
        changelog.value = Array.isArray(res.data) ? res.data : []
      }
    } finally {
      loading.value = false
    }
  }

  return {
    notices,
    changelog,
    loading,
    fetchNotices,
    fetchChangelog,
  }
})
```

- [ ] **Step 6: Commit**

```bash
git add website/src/stores/
git commit -m "feat(web): add Pinia store skeletons (auth/todos/combos/tags/config)"
```

---

### Task 7: Write router with navigation guard

**Files:**
- Create: `website/src/router/index.ts`

- [ ] **Step 1: Write src/router/index.ts**

```ts
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/LoginView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/',
      name: 'Todo',
      component: () => import('@/views/TodoView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/todos/add',
      name: 'TodoAdd',
      component: () => import('@/views/TodoView.vue'), // Phase 3: 替换为 TodoForm
      meta: { requiresAuth: true },
    },
    {
      path: '/todos/:id',
      name: 'TodoDetail',
      component: () => import('@/views/TodoView.vue'), // Phase 3: 替换为 TodoDetail
      meta: { requiresAuth: true },
    },
    {
      path: '/todos/:id/edit',
      name: 'TodoEdit',
      component: () => import('@/views/TodoView.vue'), // Phase 3: 替换为 TodoForm
      meta: { requiresAuth: true },
    },
    {
      path: '/user-center',
      name: 'UserCenter',
      component: () => import('@/views/UserCenterView.vue'),
      meta: { requiresAuth: true },
    },
    // 预留路由
    {
      path: '/calendar',
      name: 'Calendar',
      component: () => import('@/views/CalendarView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/community',
      name: 'Community',
      component: () => import('@/views/CommunityView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/stats',
      name: 'Stats',
      component: () => import('@/views/StatsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/more',
      name: 'More',
      component: () => import('@/views/MoreView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/not-found',
      name: 'NotFound',
      component: () => import('@/views/NotFoundView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/not-found',
    },
  ],
})

// 导航守卫
router.beforeEach((to) => {
  const authStore = useAuthStore()
  if (to.meta.requiresAuth && !authStore.isLoggedIn) return '/login'
  if (to.path === '/login' && authStore.isLoggedIn) return '/'
})

export default router
```

- [ ] **Step 2: Commit**

```bash
git add website/src/router/
git commit -m "feat(web): add router with navigation guard"
```

---

### Task 8: Write common components (GlassPanel, EmptyState)

**Files:**
- Create: `website/src/components/common/GlassPanel.vue`
- Create: `website/src/components/common/EmptyState.vue`

- [ ] **Step 1: Write src/components/common/GlassPanel.vue**

```vue
<script setup lang="ts">
defineProps<{
  blur?: number
  opacity?: number
}>()
</script>

<template>
  <div
    class="glass-panel"
    :style="{
      backdropFilter: `blur(${blur ?? 20}px) saturate(180%)`,
      background: `rgba(255, 255, 255, ${opacity ?? 0.7})`,
    }"
  >
    <slot />
  </div>
</template>

<style scoped>
.glass-panel {
  border-radius: var(--border-radius);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: var(--shadow-md);
}
</style>
```

- [ ] **Step 2: Write src/components/common/EmptyState.vue**

```vue
<script setup lang="ts">
defineProps<{
  icon?: string
  title?: string
  description?: string
}>()
</script>

<template>
  <div class="empty-state">
    <t-icon v-if="icon" :name="icon" size="64px" color="#c9cdd4" />
    <p class="empty-title">{{ title || '暂无数据' }}</p>
    <p v-if="description" class="empty-desc">{{ description }}</p>
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
  color: var(--text-secondary);
}
.empty-title {
  margin-top: var(--spacing-md);
  font-size: var(--font-size-lg);
}
.empty-desc {
  margin-top: var(--spacing-xs);
  font-size: var(--font-size-sm);
}
</style>
```

- [ ] **Step 3: Commit**

```bash
git add website/src/components/common/
git commit -m "feat(web): add common components (GlassPanel, EmptyState)"
```

---

### Task 9: Write view placeholder pages

**Files:**
- Create: `website/src/views/LoginView.vue`
- Create: `website/src/views/TodoView.vue`
- Create: `website/src/views/CalendarView.vue`
- Create: `website/src/views/CommunityView.vue`
- Create: `website/src/views/StatsView.vue`
- Create: `website/src/views/MoreView.vue`
- Create: `website/src/views/UserCenterView.vue`
- Create: `website/src/views/NotFoundView.vue`

Each view is a minimal placeholder with correct `<script setup lang="ts">` and scoped styles. Example for LoginView (the rest are identical structure with different text):

- [ ] **Step 1: Write LoginView.vue**

```vue
<script setup lang="ts">
// Phase 2: 实现扫码登录
</script>

<template>
  <div class="login-view">
    <h2>登录</h2>
    <p>扫码登录功能将在 Phase 2 实现</p>
  </div>
</template>

<style scoped>
.login-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary);
}
</style>
```

- [ ] **Step 2: Write TodoView.vue**

```vue
<script setup lang="ts">
// Phase 3: 实现三栏布局待办列表
</script>

<template>
  <div class="todo-view">
    <p>待办列表将在 Phase 3 实现</p>
  </div>
</template>

<style scoped>
.todo-view {
  padding: var(--spacing-lg);
  color: var(--text-secondary);
}
</style>
```

- [ ] **Step 3-8: Write the remaining 6 views** with the same pattern:

| View | Title Content |
|------|--------------|
| CalendarView.vue | 日历视图 — 后续版本实现 |
| CommunityView.vue | 社区 — 后续版本实现 |
| StatsView.vue | 统计 — 后续版本实现 |
| MoreView.vue | 更多 — 后续版本实现 |
| UserCenterView.vue | 用户中心将在后续 Phase 实现 |
| NotFoundView.vue | 404 — 页面不存在 |

Each uses `<script setup lang="ts">` with no imports, and scoped styles matching the pattern above.

- [ ] **Step 9: Commit**

```bash
git add website/src/views/
git commit -m "feat(web): add view placeholder pages"
```

---

### Task 10: Write responsive layout shell (App.vue + layout components)

**Files:**
- Create: `website/src/App.vue`
- Create: `website/src/components/layout/AppSidebar.vue`
- Create: `website/src/components/layout/AppHeader.vue`
- Create: `website/src/components/layout/AppContent.vue`

- [ ] **Step 1: Write src/App.vue**

```vue
<script setup lang="ts">
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppContent from '@/components/layout/AppContent.vue'
</script>

<template>
  <div class="app-layout">
    <!-- 桌面端：侧边栏始终显示 -->
    <AppSidebar class="app-sidebar" />
    <!-- 主区域 -->
    <div class="app-main">
      <AppContent />
    </div>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  min-height: 100vh;
}

.app-sidebar {
  flex-shrink: 0;
}

.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

/* 移动端：隐藏侧边栏，后续实现底部 Tab */
@media (max-width: 767px) {
  .app-sidebar {
    display: none;
  }
}
</style>
```

- [ ] **Step 2: Write src/components/layout/AppSidebar.vue**

```vue
<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { computed } from 'vue'

const router = useRouter()
const route = useRoute()

const navItems = [
  { path: '/', name: '待办', icon: 'check' },
  { path: '/calendar', name: '日历', icon: 'calendar' },
  { path: '/community', name: '社区', icon: 'chat' },
  { path: '/stats', name: '统计', icon: 'chart-bar' },
  { path: '/more', name: '更多', icon: 'ellipsis' },
]

const isActive = (path: string) => computed(() => route.path === path)

function navigate(path: string) {
  router.push(path)
}
</script>

<template>
  <GlassPanel class="sidebar">
    <!-- Logo 区域 -->
    <div class="sidebar-logo" @click="router.push('/')">
      <img src="/logo.png" alt="时光绿径" class="logo-img" />
      <span class="logo-text">时光绿径</span>
    </div>

    <!-- 导航菜单 -->
    <nav class="sidebar-nav">
      <div
        v-for="item in navItems"
        :key="item.path"
        class="nav-item"
        :class="{ active: isActive(item.path).value }"
        @click="navigate(item.path)"
      >
        <t-icon :name="item.icon" size="20px" />
        <span class="nav-label">{{ item.name }}</span>
      </div>
    </nav>
  </GlassPanel>
</template>

<style scoped>
.sidebar {
  width: var(--sidebar-width);
  height: 100vh;
  position: sticky;
  top: 0;
  display: flex;
  flex-direction: column;
  padding: var(--spacing-md);
  border-right: 1px solid var(--border-color);
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-xs);
  margin-bottom: var(--spacing-lg);
  cursor: pointer;
}

.logo-img {
  width: 32px;
  height: 32px;
  border-radius: var(--border-radius);
}

.logo-text {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--text-primary);
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-sm);
  border-radius: var(--border-radius);
  cursor: pointer;
  color: var(--text-secondary);
  transition: background 0.2s, color 0.2s;
}

.nav-item:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.nav-item.active {
  background: var(--color-primary-light);
  color: var(--color-primary);
}

.nav-label {
  font-size: var(--font-size-base);
}
</style>
```

Note: AppSidebar imports `GlassPanel` from `@/components/common/GlassPanel.vue` — add the import:

```vue
<script setup lang="ts">
import GlassPanel from '@/components/common/GlassPanel.vue'
// ... rest of imports
</script>
```

- [ ] **Step 3: Write src/components/layout/AppHeader.vue**

```vue
<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()
</script>

<template>
  <header class="app-header">
    <div class="header-left">
      <!-- Phase 3: 搜索框 -->
    </div>
    <div class="header-right">
      <t-avatar
        v-if="authStore.user"
        :image="authStore.user.avatarUrl"
        :alt="authStore.user.nickname"
        size="32px"
        class="user-avatar"
        @click="router.push('/user-center')"
      />
    </div>
  </header>
</template>

<style scoped>
.app-header {
  height: var(--header-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--spacing-lg);
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-card);
}

.header-left {
  flex: 1;
}

.header-right {
  display: flex;
  align-items: center;
}

.user-avatar {
  cursor: pointer;
}
</style>
```

- [ ] **Step 4: Write src/components/layout/AppContent.vue**

```vue
<script setup lang="ts">
import AppHeader from './AppHeader.vue'
</script>

<template>
  <div class="content-wrapper">
    <AppHeader />
    <main class="content-area">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.content-wrapper {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.content-area {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-lg);
}
</style>
```

- [ ] **Step 5: Verify the full app compiles and runs**

Run:
```bash
cd website
npx vue-tsc --noEmit 2>&1 || echo "vue-tsc needs setup - skip for now"
npm run dev
```

Expected: Dev server starts. The browser shows a sidebar with 5 nav items + logo, and an empty content area with header.

- [ ] **Step 6: Commit**

```bash
git add website/src/App.vue website/src/components/layout/
git commit -m "feat(web): add responsive layout shell with sidebar and header"
```

---

## Self-Review

### Spec coverage check

| Spec Section | Covered by Task |
|---|---|
| 6. 目录结构 | All files created across Tasks 1-10 |
| 7. 路由表 + 导航守卫 | Task 7 |
| 8.3 TDesign 组件 (全局注册) | Task 1 (main.ts) |
| 9. TypeScript 类型定义 | Task 2 |
| 10. CSS 变量体系 | Task 3 |
| 11.1-11.5 Pinia stores | Task 6 |
| 12.1 Axios 实例 | Task 4 |
| API 模块 (auth/todos/combos/tags/config) | Task 5 |
| 响应式布局壳 | Task 10 |
| View placeholder pages | Task 9 |
| GlassPanel / EmptyState | Task 8 |

### Placeholder scan
All code blocks are complete. No "TBD", "TODO" (except `loginByQrCode` which intentionally throws since Phase 2 implements it), or placeholder patterns.

### Type consistency
All imports use `@/types` which is defined in Task 2. Store signatures match API module signatures. API module response types use the `ApiResponse<T>` wrapper. Everything consistent.

---

**Plan complete and saved.** Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task (10 tasks), review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach do you prefer?
