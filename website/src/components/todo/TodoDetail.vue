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

const priorityLabels: Record<string, string> = {
  p1: '紧急重要',
  p2: '重要不紧急',
  p3: '紧急不重要',
  p4: '不紧急不重要',
}

const priorityColors: Record<string, string> = {
  p1: '#f44336',
  p2: '#ff9800',
  p3: '#2196f3',
  p4: '#9e9e9e',
}

onMounted(async () => {
  const id = route.params.id as string
  if (!id) {
    router.push('/not-found')
    return
  }

  if (tagsStore.items.length === 0) await tagsStore.fetchTags()
  if (combosStore.items.length === 0) await combosStore.fetchCombos()

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

const tagItems = computed(() => {
  if (!todo.value?.tags?.length) return []
  return todo.value.tags
    .map((id) => tagsStore.items.find((t) => t.id === id))
    .filter(Boolean)
})

const comboName = computed(() => {
  if (!todo.value?.comboId) return ''
  const c = combosStore.items.find((c) => c.id === todo.value!.comboId)
  return c?.name || ''
})

const formatDateTime = (ts: number | string | undefined | null) => {
  if (!ts) return ''
  const d = new Date(ts)
  if (isNaN(d.getTime())) return String(ts)
  const y = d.getFullYear()
  const m = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  const h = d.getHours().toString().padStart(2, '0')
  const min = d.getMinutes().toString().padStart(2, '0')
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${y}-${m}-${day} ${h}:${min} ${weekDays[d.getDay()]}`
}

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

        <!-- 日期+时间 -->
        <section class="info-section">
          <div class="info-row">
            <t-icon name="time" size="16px" />
            <span class="info-label">创建时间</span>
            <span class="info-value">{{ formatDateTime(todo.time) }}</span>
          </div>

          <div v-if="todo.setDate" class="info-row">
            <t-icon name="calendar" size="16px" />
            <span class="info-label">截止时间</span>
            <span class="info-value">{{ todo.setDate }} {{ todo.setTime || '' }}</span>
          </div>

          <div v-if="todo.completed" class="info-row completed-row">
            <t-icon name="check-circle" size="16px" color="var(--color-success)" />
            <span class="info-label">完成时间</span>
            <span class="info-value">{{ formatDateTime(todo.completed) }}</span>
          </div>
        </section>

        <!-- 优先等级 -->
        <section v-if="todo.priority" class="info-section">
          <div class="info-row">
            <t-icon name="flag" size="16px" :style="{ color: priorityColors[todo.priority] || '#999' }" />
            <span class="info-label">优先等级</span>
            <span class="info-value">
              <t-tag :color="priorityColors[todo.priority] || '#999'" size="small">
                {{ priorityLabels[todo.priority] || todo.priority }}
              </t-tag>
            </span>
          </div>
        </section>

        <!-- 标签 -->
        <section v-if="tagItems.length" class="info-section">
          <div class="info-row">
            <t-icon name="tag" size="16px" />
            <span class="info-label">标签</span>
            <div class="tag-list">
              <t-tag
                v-for="tag in tagItems"
                :key="tag!.id"
                :color="tag!.color"
                size="small"
              >{{ tag!.name }}</t-tag>
            </div>
          </div>
        </section>

        <!-- 所属组合 -->
        <section v-if="comboName" class="info-section">
          <div class="info-row">
            <t-icon name="folder" size="16px" />
            <span class="info-label">组合</span>
            <router-link :to="`/combos/${todo.comboId}`" class="combo-link">
              {{ comboName }}
              <t-icon name="chevron-right" size="14px" />
            </router-link>
          </div>
        </section>

        <!-- 备注 -->
        <section v-if="todo.remarks" class="info-section">
          <div class="info-row remarks-row">
            <t-icon name="edit-2" size="16px" />
            <span class="info-label">备注</span>
          </div>
          <div class="remarks-content">{{ todo.remarks }}</div>
        </section>
      </div>

      <div class="detail-footer">
        <span class="meta-text">ID: {{ todo.id }}</span>
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
  margin-bottom: var(--spacing-md);
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

.info-section {
  margin-bottom: var(--spacing-md);
  padding-bottom: var(--spacing-md);
  border-bottom: 1px solid var(--border-color);
}

.info-section:last-of-type {
  border-bottom: none;
}

.info-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-base);
  color: var(--text-secondary);
  padding: 2px 0;
}

.completed-row {
  color: var(--color-success);
}

.info-label {
  color: var(--text-disabled);
  min-width: 68px;
  flex-shrink: 0;
}

.info-value {
  color: var(--text-secondary);
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}

.combo-link {
  color: var(--color-primary);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
}

.combo-link:hover {
  text-decoration: underline;
}

.remarks-row {
  margin-bottom: var(--spacing-xs);
}

.remarks-content {
  font-size: var(--font-size-base);
  color: var(--text-primary);
  white-space: pre-wrap;
  line-height: 1.6;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--bg-hover);
  border-radius: var(--border-radius);
  margin-left: 28px;
}

.detail-footer {
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--border-color);
}

.meta-text {
  font-size: var(--font-size-xs);
  color: var(--text-disabled);
}
</style>
