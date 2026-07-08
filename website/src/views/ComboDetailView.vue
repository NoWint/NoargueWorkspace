<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCombosStore } from '@/stores/combos'
import { useTodosStore } from '@/stores/todos'
import { MessagePlugin } from 'tdesign-vue-next'
import GlassPanel from '@/components/common/GlassPanel.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import TodoItem from '@/components/todo/TodoItem.vue'

const route = useRoute()
const router = useRouter()
const combosStore = useCombosStore()
const todosStore = useTodosStore()

const comboId = computed(() => Number(route.params.id))
const combo = computed(() => combosStore.items.find((c) => c.id === comboId.value))

const comboLoading = ref(false)
const todosLoading = ref(false)
const comboNotFound = ref(false)

onMounted(async () => {
  if (combosStore.items.length === 0) {
    comboLoading.value = true
    try {
      await combosStore.fetchCombos()
    } finally {
      comboLoading.value = false
    }
  }

  if (!combo.value) {
    comboNotFound.value = true
    return
  }

  todosLoading.value = true
  try {
    // Fetch all todos and filter by comboId client-side
    await todosStore.fetchTodos()
  } finally {
    todosLoading.value = false
  }
})

const comboItems = computed(() => {
  return todosStore.items.filter((t) => t.comboId === comboId.value)
})

const completedCount = computed(() => comboItems.value.filter((t) => t.completed).length)

function goBack() {
  router.push('/')
}
</script>

<template>
  <div class="combo-detail-page">
    <div class="page-header">
      <t-button variant="text" @click="goBack">
        <template #icon><t-icon name="arrow-left" /></template>
        返回
      </t-button>
    </div>

    <t-loading v-if="comboLoading" :loading="true" size="large" />

    <template v-else-if="comboNotFound">
      <GlassPanel class="detail-card empty">
        <p>组合不存在</p>
        <t-button variant="outline" @click="goBack">返回待办</t-button>
      </GlassPanel>
    </template>

    <template v-else-if="combo">
      <GlassPanel class="combo-header-card">
        <div class="combo-header">
          <t-icon :name="combo.icon || 'folder'" size="32px" :style="{ color: combo.color }" />
          <div class="combo-header-info">
            <h2 class="combo-name">{{ combo.name }}</h2>
            <span class="combo-meta">
              {{ comboItems.length }} 个待办 · 已完成 {{ completedCount }}
            </span>
          </div>
        </div>
        <p v-if="combo.description" class="combo-desc">{{ combo.description }}</p>
      </GlassPanel>

      <div class="todo-list-section">
        <t-loading v-if="todosLoading" :loading="true" size="large" />

        <EmptyState
          v-else-if="comboItems.length === 0"
          icon="folder"
          title="组合为空"
          description="该组合中暂无待办"
        />

        <div v-else class="todo-list">
          <TodoItem v-for="todo in comboItems" :key="todo.id" :todo="todo" />
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.combo-detail-page {
  max-width: 600px;
  margin: 0 auto;
  padding: var(--spacing-lg) 0;
}

.page-header {
  margin-bottom: var(--spacing-md);
}

.detail-card {
  padding: var(--spacing-xl);
  min-height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  color: var(--text-secondary);
}

.combo-header-card {
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-md);
}

.combo-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.combo-header-info {
  flex: 1;
}

.combo-name {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.combo-meta {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-top: 2px;
}

.combo-desc {
  margin-top: var(--spacing-sm);
  font-size: var(--font-size-base);
  color: var(--text-secondary);
}

.todo-list-section {
  margin-top: var(--spacing-md);
}

.todo-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
</style>
