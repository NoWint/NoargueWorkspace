<script setup lang="ts">
import { onMounted, watch, TransitionGroup } from 'vue'
import { useTodosStore } from '@/stores/todos'
import { useTagsStore } from '@/stores/tags'
import GlassPanel from '@/components/common/GlassPanel.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import Skeleton from '@/components/common/Skeleton.vue'
import ComboTree from '@/components/combo/ComboTree.vue'
import TagFilter from '@/components/tag/TagFilter.vue'
import TodoQuickAdd from '@/components/todo/TodoQuickAdd.vue'
import TodoItem from '@/components/todo/TodoItem.vue'
import { useResizable } from '@/composables/useResizable'

const { width: tagPanelWidth, onHandleMouseDown } = useResizable({
  storageKey: 'tag-panel-width',
  defaultWidth: 180,
  minWidth: 140,
  maxWidth: 300,
})

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
    <aside class="todo-sidebar" :style="{ width: tagPanelWidth + 'px' }">
      <GlassPanel class="sidebar-panel">
        <ComboTree />
        <div class="panel-divider" />
        <TagFilter />
      </GlassPanel>
      <div
        class="resize-handle"
        @mousedown="onHandleMouseDown"
      />
    </aside>

    <!-- 主区域 -->
    <main class="todo-main">
      <!-- 快速添加 -->
      <TodoQuickAdd class="quick-add-section" />

      <!-- 待办列表 -->
      <div class="todo-list-section">
        <Skeleton v-if="todosStore.loading" type="todo" :count="4" />

        <EmptyState
          v-else-if="todosStore.items.length === 0"
          icon="check"
          title="暂无待办"
          description="在上方输入框添加新待办"
        />

        <TransitionGroup v-else name="todo-stagger" tag="div" class="todo-list">
          <TodoItem
            v-for="(todo, index) in todosStore.items"
            :key="todo.id"
            :todo="todo"
            :style="`--stagger-delay: ${index * 30}ms`"
          />
        </TransitionGroup>
      </div>
    </main>

  </div>
</template>

<style scoped>
.todo-view {
  display: flex;
  gap: var(--spacing-md);
  height: 100%;
}

.todo-sidebar {
  width: var(--tag-panel-width);
  flex-shrink: 0;
  position: relative;
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

.todo-stagger-enter-active {
  transition: opacity var(--duration-normal) var(--ease-out),
              transform var(--duration-normal) var(--ease-out);
  transition-delay: var(--stagger-delay, 0ms);
}
.todo-stagger-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
@media (prefers-reduced-motion: reduce) {
  .todo-stagger-enter-active {
    transition: none;
  }
  .todo-stagger-enter-from {
    transform: none;
  }
}

.resize-handle {
  position: absolute;
  top: 0;
  right: 0;
  width: 4px;
  height: 100%;
  cursor: col-resize;
  transition: background 0.15s;
  z-index: 10;
}

.resize-handle:hover,
.resize-handle:active {
  background: var(--color-primary);
  opacity: 0.5;
}

@media (max-width: 767px) {
  .todo-sidebar {
    display: none;
  }
}
</style>
