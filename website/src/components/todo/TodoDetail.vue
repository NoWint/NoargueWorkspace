<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTodosStore } from '@/stores/todos'
import { useTagsStore } from '@/stores/tags'
import { useCombosStore } from '@/stores/combos'
import { MessagePlugin } from 'tdesign-vue-next'
import GlassPanel from '@/components/common/GlassPanel.vue'
import type { Todo } from '@/types'

const route = useRoute()
const router = useRouter()
const todosStore = useTodosStore()
const tagsStore = useTagsStore()
const combosStore = useCombosStore()

const todo = ref<Todo | null>(null)
const loading = ref(true)

onMounted(async () => {
  const id = route.params.id as string
  if (!id) {
    router.push('/not-found')
    return
  }

  try {
    const result = await todosStore.fetchTodoById(id)
    if (result) {
      todo.value = result
    } else {
      router.push('/not-found')
    }
  } finally {
    loading.value = false
  }
})

const tagIds = computed<number[]>(() => {
  if (!todo.value?.tags || !todo.value.tags.length) return []
  return todo.value.tags
})

const tagItems = computed(() => {
  return tagIds.value
    .map((id) => tagsStore.items.find((t) => t.id === id))
    .filter(Boolean)
})

const comboName = computed(() => {
  if (!todo.value?.comboId) return ''
  const c = combosStore.items.find((c) => c.id === todo.value!.comboId)
  return c?.name || ''
})

async function handleDelete() {
  if (!todo.value) return
  try {
    await todosStore.deleteTodo(todo.value.id)
    MessagePlugin.success('已删除')
    router.push('/')
  } catch {
    MessagePlugin.error('删除失败')
  }
}

function goEdit() {
  router.push(`/todos/${route.params.id}/edit`)
}

function goBack() {
  router.back()
}
</script>

<template>
  <div class="detail-page">
    <GlassPanel v-if="loading" class="detail-card">
      <t-loading :loading="true" size="large" />
    </GlassPanel>

    <GlassPanel v-else-if="todo" class="detail-card">
      <div class="detail-header">
        <t-button variant="text" @click="goBack">
          <template #icon><t-icon name="arrow-left" /></template>
          返回
        </t-button>
        <div class="header-actions">
          <t-button variant="outline" size="small" @click="goEdit">
            <template #icon><t-icon name="edit" /></template>
            编辑
          </t-button>
          <t-popconfirm attach="body" content="确定删除此待办？" @confirm="handleDelete">
            <t-button variant="outline" size="small" theme="danger">
              <template #icon><t-icon name="delete" /></template>
              删除
            </t-button>
          </t-popconfirm>
        </div>
      </div>

      <div class="detail-body">
        <div class="detail-text">{{ todo.text }}</div>

        <div class="detail-info">
          <div v-if="todo.setDate" class="info-row">
            <t-icon name="calendar" size="16px" />
            <span>{{ todo.setDate }} {{ todo.setTime || '' }}</span>
          </div>

          <div v-if="tagItems.length" class="info-row">
            <t-icon name="tag" size="16px" />
            <div class="tag-list">
              <t-tag
                v-for="tag in tagItems"
                :key="tag!.id"
                :color="tag!.color"
                size="small"
              >{{ tag!.name }}</t-tag>
            </div>
          </div>

          <div v-if="comboName" class="info-row">
            <t-icon name="folder" size="16px" />
            <span>{{ comboName }}</span>
          </div>

          <div v-if="todo.remarks" class="info-row remarks">
            <t-icon name="file" size="16px" />
            <span>{{ todo.remarks }}</span>
          </div>
        </div>
      </div>

      <div class="detail-footer">
        <span class="meta-text">创建于 {{ todo.createdAt }}</span>
      </div>
    </GlassPanel>

    <GlassPanel v-else class="detail-card empty">
      <p>待办不存在</p>
    </GlassPanel>
  </div>
</template>

<style scoped>
.detail-page {
  max-width: 600px;
  margin: 0 auto;
  padding: var(--spacing-lg) 0;
}

.detail-card {
  padding: var(--spacing-lg);
  min-height: 200px;
}

.detail-card.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-lg);
}

.header-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.detail-body {
  padding: var(--spacing-md) 0;
}

.detail-text {
  font-size: var(--font-size-lg);
  color: var(--text-primary);
  line-height: 1.6;
  margin-bottom: var(--spacing-lg);
  white-space: pre-wrap;
  word-break: break-word;
}

.detail-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.info-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-base);
  color: var(--text-secondary);
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}

.info-row.remarks {
  align-items: flex-start;
}

.detail-footer {
  margin-top: var(--spacing-lg);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--border-color);
}

.meta-text {
  font-size: var(--font-size-xs);
  color: var(--text-disabled);
}
</style>
