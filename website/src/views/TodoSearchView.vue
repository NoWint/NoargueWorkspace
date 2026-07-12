<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTodosStore } from '@/stores/todos'
import { todosApi } from '@/api/todos'
import GlassPanel from '@/components/common/GlassPanel.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import TodoItem from '@/components/todo/TodoItem.vue'
import { MessagePlugin } from 'tdesign-vue-next'

const route = useRoute()
const router = useRouter()
const todosStore = useTodosStore()

const keywords = ref('')
const results = ref<any[]>([])
const searched = ref(false)
const loading = ref(false)
const showBackTop = ref(false)
const parentFetching = ref(false)
let debounceTimer: ReturnType<typeof setTimeout> | null = null

onMounted(() => {
  if (route.query.q) {
    keywords.value = route.query.q as string
    doSearch()
  }
})

watch(keywords, (val) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  if (!val.trim()) {
    results.value = []
    searched.value = false
    return
  }
  debounceTimer = setTimeout(() => {
    doSearch()
  }, 300)
})

async function getTodoById(id: number): Promise<{ text: string; parentId?: number } | null> {
  try {
    const res = await todosApi.getById(id)
    if (res.success && res.todo) {
      return { text: res.todo.text, parentId: res.todo.parentId }
    }
  } catch {}
  return null
}

async function enrichWithParentPaths(items: any[]): Promise<any[]> {
  const parentCache = new Map<number, string>()
  const parentRefs = new Map<number, number | undefined>()

  const idsToFetch = new Set<number>()
  items.forEach((r) => {
    if (r.parentId) idsToFetch.add(Number(r.parentId))
  })

  if (idsToFetch.size === 0) return items

  parentFetching.value = true
  try {
    const fetched = new Set<number>()
    const queue = [...idsToFetch]
    while (queue.length > 0) {
      const batch = [...queue]
      queue.length = 0
      const results = await Promise.all(
        batch.map(async (id) => {
          if (fetched.has(id)) return null
          fetched.add(id)
          return getTodoById(id)
        })
      )
      for (let i = 0; i < batch.length; i++) {
        const r = results[i]
        if (r) {
          parentCache.set(batch[i], r.text)
          parentRefs.set(batch[i], r.parentId)
          if (r.parentId && !fetched.has(r.parentId)) {
            queue.push(r.parentId)
          }
        }
      }
    }
  } finally {
    parentFetching.value = false
  }

  return items.map((r) => {
    if (!r.parentId) return r
    const path: string[] = []
    let currentId = Number(r.parentId)
    let rootParentId = currentId
    while (currentId && parentCache.has(currentId)) {
      path.unshift(parentCache.get(currentId)!)
      rootParentId = currentId
      currentId = parentRefs.get(currentId) ?? 0
    }
    return {
      ...r,
      parentPath: path.length > 0 ? '🗂️ ' + path.join(' → ') + ' 的子待办' : undefined,
      navigateTo: `/todos/${rootParentId}`,
    }
  })
}

async function doSearch() {
  const kw = keywords.value.trim()
  if (!kw) return
  loading.value = true
  searched.value = true
  try {
    const res = await todosApi.getList({ search: kw, pageSize: 200 })
    if (res.success && res.todos) {
      results.value = await enrichWithParentPaths(res.todos)
    }
  } finally {
    loading.value = false
  }
}

function onScroll(e: Event) {
  const target = e.target as HTMLElement
  showBackTop.value = target.scrollTop > 300
}

function scrollToTop() {
  const container = document.querySelector('.search-results')
  container?.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<template>
  <div class="search-page">
    <GlassPanel class="search-card">
      <div class="search-header">
        <t-button variant="text" @click="router.push('/')">
          <template #icon><t-icon name="arrow-left" /></template>
          返回
        </t-button>
        <h2 class="search-title">搜索待办</h2>
      </div>

      <div class="search-input-wrap">
        <t-input
          v-model="keywords"
          placeholder="搜索待办事项（空格分隔关键词）"
          size="large"
          clearable
          autofocus
        >
          <template #prefix-icon><t-icon name="search" /></template>
        </t-input>
      </div>

      <p v-if="searched && !loading && !parentFetching" class="search-count">
        找到了 {{ results.length }} 项待办
      </p>
    </GlassPanel>

    <div class="search-results" @scroll="onScroll">
      <t-loading v-if="loading || parentFetching" :loading="true" size="large" />

      <EmptyState
        v-else-if="searched && results.length === 0"
        icon="search"
        title="没有找到相关待办"
        description="试试其他关键词"
      />

      <div v-else-if="results.length > 0" class="result-list">
        <TodoItem
          v-for="todo in results"
          :key="todo.id"
          :todo="todo"
          :highlight-keywords="keywords"
          :parent-path="todo.parentPath"
          :navigate-to="todo.navigateTo"
        />
      </div>
    </div>

    <t-fab
      v-if="showBackTop"
      icon="arrow-up"
      @click="scrollToTop"
    />
  </div>
</template>

<style scoped>
.search-page {
  max-width: 720px;
  margin: 0 auto;
  padding: var(--spacing-lg) 0;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.search-card {
  padding: var(--spacing-lg);
  flex-shrink: 0;
}

.search-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.search-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  margin: 0;
}

.search-input-wrap {
  margin-bottom: var(--spacing-sm);
}

.search-count {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin: 0;
}

.search-results {
  flex: 1;
  overflow-y: auto;
  margin-top: var(--spacing-md);
}

.result-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
</style>
