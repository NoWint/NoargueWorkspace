# Phase 4: 赋能功能 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Implement Phase 4 empower features: Trash, UserCenter, Notices, Changelog, 404 page, MoreView hub

**Architecture:** Each feature gets its own view component; update router and MoreView to wire them together. Fix config API response types to match backend shapes.

**Tech Stack:** Vue 3 + TypeScript + TDesign Vue Next + Pinia + Vue Router 4

---

### Task 1: Fix API types and Config API

**Files:**
- Modify: `website/src/types/index.ts:61-76`
- Modify: `website/src/api/config.ts`

The backend `/config/notices` returns `{ success, notices }` (not `{ success, data }`), and `/config/updates` returns `{ success, changelogList }`. Also, Notice has `{ title, date, content }` without `id`/`createdAt`, and Changelog has `{ version, date, content: string[] }`.

- [ ] **Step 1: Update types**

In `website/src/types/index.ts`, replace existing `Notice` and `Changelog`:

```typescript
// ====== 公告 ======
export interface Notice {
  title: string
  content: string
  date?: string
}

// ====== 更新日志 ======
export interface Changelog {
  version: string
  date: string
  content: string[]
}
```

- [ ] **Step 2: Update Config API**

In `website/src/api/config.ts`, replace existing code:

```typescript
import http from './request'
import type { Notice, Changelog } from '@/types'

interface NoticesResponse {
  success: boolean
  notices: Notice[]
}

interface ChangelogResponse {
  success: boolean
  changelogList: Changelog[]
}

export const configApi = {
  getNotices: () =>
    http.get<NoticesResponse>('/config/notices'),

  getChangelog: () =>
    http.get<ChangelogResponse>('/config/updates'),
}
```

---

### Task 2: Improve 404 Page

**Files:**
- Modify: `website/src/views/NotFoundView.vue`

- [ ] **Step: Replace NotFoundView content**

```vue
<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<template>
  <div class="not-found-view">
    <t-icon name="error-circle" size="64px" color="#c9cdd4" />
    <h1>404</h1>
    <p class="not-found-desc">页面不存在或已被移除</p>
    <t-button theme="primary" @click="router.push('/')">返回首页</t-button>
  </div>
</template>

<style scoped>
.not-found-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: var(--spacing-md);
  color: var(--text-secondary);
}
.not-found-view h1 {
  font-size: var(--font-size-2xl);
  color: var(--text-primary);
}
.not-found-desc {
  font-size: var(--font-size-base);
}
</style>
```

---

### Task 3: UserCenterView

**Files:**
- Modify: `website/src/views/UserCenterView.vue`

Uses `authStore.user` (already loaded after login). Display avatar, nickname, admin badge, limits (todoLimit, comboLimit, collabLimit).

- [ ] **Step: Replace UserCenterView content**

```vue
<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

const limits = [
  { label: '待办限额', value: authStore.user?.todoLimit ?? '--', icon: 'file' },
  { label: '组合限额', value: authStore.user?.comboLimit ?? '--', icon: 'folder' },
  { label: '协作限额', value: authStore.user?.collabLimit ?? '--', icon: 'team' },
]
</script>

<template>
  <div class="user-center-page">
    <div class="profile-card">
      <t-avatar
        :image="authStore.user?.avatarUrl"
        :alt="authStore.user?.nickname"
        size="72px"
        class="avatar"
      />
      <div class="profile-info">
        <h2 class="nickname">{{ authStore.user?.nickname || '未登录' }}</h2>
        <t-tag v-if="authStore.user?.isAdmin" theme="primary" size="small">管理员</t-tag>
      </div>
    </div>

    <div class="limits-section">
      <h3 class="section-title">使用限额</h3>
      <div class="limits-grid">
        <div v-for="item in limits" :key="item.label" class="limit-item">
          <t-icon :name="item.icon" size="24px" color="var(--color-primary)" />
          <div class="limit-info">
            <span class="limit-label">{{ item.label }}</span>
            <span class="limit-value">{{ item.value }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="actions-section">
      <t-button variant="outline" block @click="router.push('/trash')">
        <template #icon><t-icon name="delete" /></template>
        回收站
      </t-button>
    </div>
  </div>
</template>

<style scoped>
.user-center-page {
  max-width: 600px;
  margin: 0 auto;
  padding: var(--spacing-lg) 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}
.profile-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  padding: var(--spacing-lg);
  background: var(--bg-glass);
  border-radius: var(--border-radius);
  backdrop-filter: blur(var(--glass-blur));
}
.profile-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}
.nickname {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--text-primary);
}
.section-title {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--spacing-md);
}
.limits-section {
  padding: var(--spacing-lg);
  background: var(--bg-glass);
  border-radius: var(--border-radius);
  backdrop-filter: blur(var(--glass-blur));
}
.limits-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: var(--spacing-md);
}
.limit-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
  text-align: center;
}
.limit-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.limit-label {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}
.limit-value {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-primary);
}
.actions-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}
</style>
```

---

### Task 4: TrashView (回收站)

**Files:**
- Create: `website/src/views/TrashView.vue`

Use `todosStore.fetchDeletedTodos()`, `todosStore.restoreTodo()`, `todosStore.permanentDeleteTodo()`. List deleted items with restore/permanent-delete buttons per item. Show empty state when no deleted todos.

- [ ] **Step: Create TrashView**

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTodosStore } from '@/stores/todos'
import { MessagePlugin } from 'tdesign-vue-next'

const router = useRouter()
const todosStore = useTodosStore()
const loading = ref(false)

onMounted(async () => {
  loading.value = true
  try {
    await todosStore.fetchDeletedTodos()
  } finally {
    loading.value = false
  }
})

async function handleRestore(id: number) {
  try {
    await todosStore.restoreTodo(id)
    MessagePlugin.success('已恢复')
  } catch {
    MessagePlugin.error('恢复失败')
  }
}

async function handlePermanentDelete(id: number) {
  try {
    await todosStore.permanentDeleteTodo(id)
    MessagePlugin.success('已永久删除')
  } catch {
    MessagePlugin.error('删除失败')
  }
}
</script>

<template>
  <div class="trash-page">
    <div class="page-header">
      <t-button variant="text" @click="router.back()">
        <template #icon><t-icon name="arrow-left" /></template>
        返回
      </t-button>
      <h2 class="page-title">回收站</h2>
    </div>

    <t-loading :loading="loading" size="large">
      <div v-if="todosStore.deletedItems.length === 0" class="empty-trash">
        <t-icon name="delete" size="48px" color="#c9cdd4" />
        <p>回收站为空</p>
      </div>

      <div v-else class="trash-list">
        <div v-for="todo in todosStore.deletedItems" :key="todo.id" class="trash-item">
          <div class="trash-item-text">
            <p class="todo-text">{{ todo.text }}</p>
            <p class="todo-meta">{{ todo.setDate || '无日期' }}</p>
          </div>
          <div class="trash-item-actions">
            <t-button variant="outline" size="small" @click="handleRestore(todo.id)">
              <template #icon><t-icon name="rollback" /></template>
              恢复
            </t-button>
            <t-popconfirm content="永久删除后不可恢复" @confirm="handlePermanentDelete(todo.id)">
              <t-button variant="outline" size="small" theme="danger">
                <template #icon><t-icon name="delete" /></template>
                删除
              </t-button>
            </t-popconfirm>
          </div>
        </div>
      </div>
    </t-loading>
  </div>
</template>

<style scoped>
.trash-page {
  max-width: 600px;
  margin: 0 auto;
  padding: var(--spacing-lg) 0;
}
.page-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-lg);
}
.page-title {
  font-size: var(--font-size-xl);
  font-weight: 600;
}
.empty-trash {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-xl);
  color: var(--text-secondary);
}
.trash-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}
.trash-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md);
  background: var(--bg-glass);
  border-radius: var(--border-radius);
  backdrop-filter: blur(var(--glass-blur));
}
.trash-item-text {
  flex: 1;
  min-width: 0;
}
.todo-text {
  font-size: var(--font-size-base);
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.todo-meta {
  font-size: var(--font-size-xs);
  color: var(--text-disabled);
  margin-top: 2px;
}
.trash-item-actions {
  display: flex;
  gap: var(--spacing-xs);
  flex-shrink: 0;
  margin-left: var(--spacing-md);
}
</style>
```

---

### Task 5: NoticeView (公告)

**Files:**
- Create: `website/src/views/NoticeView.vue`

Fetch from `configApi.getNotices()`. Show list of notice cards with title, date, and expandable content.

- [ ] **Step: Create NoticeView**

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { configApi } from '@/api/config'
import type { Notice } from '@/types'
import EmptyState from '@/components/common/EmptyState.vue'

const router = useRouter()
const notices = ref<Notice[]>([])
const loading = ref(false)
const expandedIndex = ref<number | null>(null)

function toggleExpand(idx: number) {
  expandedIndex.value = expandedIndex.value === idx ? null : idx
}

onMounted(async () => {
  loading.value = true
  try {
    const res = await configApi.getNotices()
    if (res.success) {
      notices.value = res.notices
    }
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="notice-page">
    <div class="page-header">
      <t-button variant="text" @click="router.back()">
        <template #icon><t-icon name="arrow-left" /></template>
        返回
      </t-button>
      <h2 class="page-title">公告</h2>
    </div>

    <t-loading :loading="loading" size="large">
      <EmptyState
        v-if="!loading && notices.length === 0"
        icon="notification"
        title="暂无公告"
      />

      <div v-else class="notice-list">
        <div
          v-for="(notice, idx) in notices"
          :key="idx"
          class="notice-card"
          @click="toggleExpand(idx)"
        >
          <div class="notice-header">
            <t-icon name="notification" size="20px" color="var(--color-primary)" />
            <div class="notice-title-area">
              <span class="notice-title">{{ notice.title }}</span>
              <span v-if="notice.date" class="notice-date">{{ notice.date }}</span>
            </div>
            <t-icon
              :name="expandedIndex === idx ? 'chevron-up' : 'chevron-down'"
              size="16px"
              color="var(--text-secondary)"
            />
          </div>
          <div v-if="expandedIndex === idx" class="notice-content">
            {{ notice.content }}
          </div>
        </div>
      </div>
    </t-loading>
  </div>
</template>

<style scoped>
.notice-page {
  max-width: 600px;
  margin: 0 auto;
  padding: var(--spacing-lg) 0;
}
.page-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-lg);
}
.page-title {
  font-size: var(--font-size-xl);
  font-weight: 600;
}
.notice-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}
.notice-card {
  padding: var(--spacing-md);
  background: var(--bg-glass);
  border-radius: var(--border-radius);
  backdrop-filter: blur(var(--glass-blur));
  cursor: pointer;
  transition: box-shadow 0.2s;
}
.notice-card:hover {
  box-shadow: var(--shadow-sm);
}
.notice-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}
.notice-title-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.notice-title {
  font-size: var(--font-size-base);
  font-weight: 500;
  color: var(--text-primary);
}
.notice-date {
  font-size: var(--font-size-xs);
  color: var(--text-disabled);
}
.notice-content {
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--border-color);
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: 1.8;
  white-space: pre-wrap;
}
</style>
```

---

### Task 6: ChangelogView (更新日志)

**Files:**
- Create: `website/src/views/ChangelogView.vue`

Fetch from `configApi.getChangelog()`. Show version list with expandable details. Each entry shows version number, date, and list of change items.

- [ ] **Step: Create ChangelogView**

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { configApi } from '@/api/config'
import type { Changelog } from '@/types'
import EmptyState from '@/components/common/EmptyState.vue'

const router = useRouter()
const changelogs = ref<Changelog[]>([])
const loading = ref(false)
const expandedIndex = ref<number | null>(null)

function toggleExpand(idx: number) {
  expandedIndex.value = expandedIndex.value === idx ? null : idx
}

onMounted(async () => {
  loading.value = true
  try {
    const res = await configApi.getChangelog()
    if (res.success) {
      changelogs.value = res.changelogList
    }
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="changelog-page">
    <div class="page-header">
      <t-button variant="text" @click="router.back()">
        <template #icon><t-icon name="arrow-left" /></template>
        返回
      </t-button>
      <h2 class="page-title">更新日志</h2>
    </div>

    <t-loading :loading="loading" size="large">
      <EmptyState
        v-if="!loading && changelogs.length === 0"
        icon="file"
        title="暂无更新日志"
      />

      <div v-else class="changelog-list">
        <div
          v-for="(log, idx) in changelogs"
          :key="idx"
          class="changelog-card"
          @click="toggleExpand(idx)"
        >
          <div class="changelog-header">
            <t-tag theme="primary" variant="light" size="small">v{{ log.version }}</t-tag>
            <span class="changelog-date">{{ log.date }}</span>
            <t-icon
              :name="expandedIndex === idx ? 'chevron-up' : 'chevron-down'"
              size="16px"
              color="var(--text-secondary)"
              class="expand-icon"
            />
          </div>
          <div v-if="expandedIndex === idx" class="changelog-content">
            <div v-for="(item, iidx) in log.content" :key="iidx" class="change-item">
              {{ item }}
            </div>
          </div>
        </div>
      </div>
    </t-loading>
  </div>
</template>

<style scoped>
.changelog-page {
  max-width: 600px;
  margin: 0 auto;
  padding: var(--spacing-lg) 0;
}
.page-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-lg);
}
.page-title {
  font-size: var(--font-size-xl);
  font-weight: 600;
}
.changelog-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}
.changelog-card {
  padding: var(--spacing-md);
  background: var(--bg-glass);
  border-radius: var(--border-radius);
  backdrop-filter: blur(var(--glass-blur));
  cursor: pointer;
  transition: box-shadow 0.2s;
}
.changelog-card:hover {
  box-shadow: var(--shadow-sm);
}
.changelog-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}
.changelog-date {
  flex: 1;
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}
.changelog-content {
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}
.change-item {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: 1.6;
  padding-left: var(--spacing-sm);
  border-left: 2px solid var(--color-primary-light);
}
</style>
```

---

### Task 7: MoreView (更多 — 导航枢纽)

**Files:**
- Modify: `website/src/views/MoreView.vue`

- [ ] **Step: Replace MoreView content**

```vue
<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const navItems = [
  { label: '用户中心', icon: 'user', path: '/user-center' },
  { label: '回收站', icon: 'delete', path: '/trash' },
  { label: '公告', icon: 'notification', path: '/notices' },
  { label: '更新日志', icon: 'file', path: '/changelogs' },
]

function handleLogout() {
  authStore.logout()
}
</script>

<template>
  <div class="more-page">
    <h2 class="page-title">更多</h2>

    <div class="nav-grid">
      <div
        v-for="item in navItems"
        :key="item.path"
        class="nav-card"
        @click="router.push(item.path)"
      >
        <t-icon :name="item.icon" size="28px" color="var(--color-primary)" />
        <span class="nav-label">{{ item.label }}</span>
      </div>
    </div>

    <div class="logout-section">
      <t-button variant="outline" block theme="danger" @click="handleLogout">
        退出登录
      </t-button>
    </div>
  </div>
</template>

<style scoped>
.more-page {
  max-width: 600px;
  margin: 0 auto;
  padding: var(--spacing-lg) 0;
}
.page-title {
  font-size: var(--font-size-xl);
  font-weight: 600;
  margin-bottom: var(--spacing-lg);
}
.nav-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-xl);
}
.nav-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-lg) var(--spacing-sm);
  background: var(--bg-glass);
  border-radius: var(--border-radius);
  backdrop-filter: blur(var(--glass-blur));
  cursor: pointer;
  transition: box-shadow 0.2s;
}
.nav-card:hover {
  box-shadow: var(--shadow-sm);
}
.nav-label {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}
.logout-section {
  margin-top: var(--spacing-lg);
}
</style>
```

---

### Task 8: Update Router

**Files:**
- Modify: `website/src/router/index.ts`

Add routes for `/trash`, `/notices`, `/changelogs`.

- [ ] **Step: Add routes**

In the `routes` array, after the `/user-center` route, add:

```typescript
{
  path: '/trash',
  name: 'Trash',
  component: () => import('@/views/TrashView.vue'),
  meta: { requiresAuth: true },
},
{
  path: '/notices',
  name: 'Notices',
  component: () => import('@/views/NoticeView.vue'),
  meta: { requiresAuth: true },
},
{
  path: '/changelogs',
  name: 'Changelogs',
  component: () => import('@/views/ChangelogView.vue'),
  meta: { requiresAuth: true },
},
```
