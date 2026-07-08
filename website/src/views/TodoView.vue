<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useTodosStore } from '@/stores/todos'
import { useTagsStore } from '@/stores/tags'
import GlassPanel from '@/components/common/GlassPanel.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ComboTree from '@/components/combo/ComboTree.vue'
import TagFilter from '@/components/tag/TagFilter.vue'
import TodoQuickAdd from '@/components/todo/TodoQuickAdd.vue'
import TodoItem from '@/components/todo/TodoItem.vue'

const todosStore = useTodosStore()
const tagsStore = useTagsStore()

onMounted(() => {
  todosStore.fetchTodos()
})

// Re-fetch when tag filter changes
watch(
  () => tagsStore.selectedIds,
  () => {
    todosStore.filter.tagIds = [...tagsStore.selectedIds]
    todosStore.fetchTodos()
  },
  { deep: true },
)
</script>

<template>
  <div class="todo-view">
    <!-- 左侧面板：组合 + 标签 -->
    <aside class="todo-sidebar">
      <GlassPanel class="sidebar-panel">
        <ComboTree />
        <div class="panel-divider" />
        <TagFilter />
      </GlassPanel>
    </aside>

    <!-- 主区域 -->
    <main class="todo-main">
      <!-- 快速添加 -->
      <TodoQuickAdd class="quick-add-section" />

      <!-- 待办列表 -->
      <div class="todo-list-section">
        <t-loading v-if="todosStore.loading" :loading="true" size="large" />

        <EmptyState
          v-else-if="todosStore.items.length === 0"
          icon="check"
          title="暂无待办"
          description="在上方输入框添加新待办"
        />

        <div v-else class="todo-list">
          <TodoItem
            v-for="todo in todosStore.items"
            :key="todo.id"
            :todo="todo"
          />
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.todo-view {
  display: flex;
  gap: var(--spacing-lg);
  height: 100%;
}

.todo-sidebar {
  width: var(--tag-panel-width);
  flex-shrink: 0;
}

.sidebar-panel {
  padding: var(--spacing-sm);
}

.panel-divider {
  height: 1px;
  background: var(--border-color);
  margin: var(--spacing-sm) 0;
}

.todo-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.quick-add-section {
  flex-shrink: 0;
}

.todo-list-section {
  flex: 1;
  overflow-y: auto;
}

.todo-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

@media (max-width: 767px) {
  .todo-sidebar {
    display: none;
  }
}
</style>
