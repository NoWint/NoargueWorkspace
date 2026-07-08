<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTodosStore } from '@/stores/todos'
import { useTagsStore } from '@/stores/tags'
import type { Todo } from '@/types'

const props = defineProps<{
  todo: Todo
}>()

const router = useRouter()
const todosStore = useTodosStore()
const tagsStore = useTagsStore()

const completed = computed(() => !!props.todo.completed)
const starred = computed(() => !!props.todo.isStar)

const tagIds = computed<number[]>(() => {
  if (!props.todo.tags) return []
  return props.todo.tags
})

const tagItems = computed(() => {
  return tagIds.value
    .map((id) => tagsStore.items.find((t) => t.id === id))
    .filter(Boolean)
})

const hasDate = computed(() => !!props.todo.setDate)

function handleToggleComplete() {
  todosStore.toggleComplete(props.todo.id)
}

function handleToggleStar() {
  todosStore.toggleStar(props.todo.id)
}

function handleDelete() {
  todosStore.deleteTodo(props.todo.id)
}

function goDetail() {
  router.push(`/todos/${props.todo.id}`)
}
</script>

<template>
  <div class="todo-item" :class="{ completed }">
    <label class="todo-checkbox" @click.stop="handleToggleComplete">
      <t-icon
        :name="completed ? 'check-circle-filled' : 'circle'"
        :color="completed ? 'var(--color-success)' : 'var(--text-disabled)'"
        size="20px"
        class="checkbox-icon"
      />
    </label>

    <div class="todo-body" @click="goDetail">
      <div class="todo-text">
        <span class="text-content">{{ todo.text }}</span>
        <t-icon
          v-if="starred"
          name="star-filled"
          size="14px"
          color="#ff9800"
          class="star-icon"
          @click.stop="handleToggleStar"
        />
      </div>

      <div class="todo-meta">
        <div v-if="tagItems.length" class="todo-tags">
          <span
            v-for="tag in tagItems"
            :key="tag!.id"
            class="todo-tag-dot"
            :style="{ background: tag!.color }"
          />
        </div>
        <span v-if="hasDate" class="todo-date">{{ todo.setDate }}</span>
      </div>
    </div>

    <div class="todo-actions">
      <t-tooltip attach="body" :content="starred ? '取消星标' : '星标'">
        <t-icon
          :name="starred ? 'star-filled' : 'star'"
          :color="starred ? '#ff9800' : undefined"
          size="16px"
          class="action-btn"
          @click.stop="handleToggleStar"
        />
      </t-tooltip>
      <t-popconfirm attach="body" trigger="click" content="确定删除此待办？" @confirm="handleDelete">
        <t-icon name="delete" size="16px" class="action-btn danger" />
      </t-popconfirm>
    </div>
  </div>
</template>

<style scoped>
.todo-item {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--border-radius);
  transition: background 0.15s;
}

.todo-item:hover {
  background: var(--bg-hover);
}

.todo-checkbox {
  flex-shrink: 0;
  margin-top: 2px;
  cursor: pointer;
  line-height: 0;
}

.checkbox-icon {
  transition: color 0.15s;
}

.todo-body {
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.todo-text {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-base);
  color: var(--text-primary);
  line-height: 1.5;
}

.completed .text-content {
  text-decoration: line-through;
  color: var(--text-disabled);
}

.star-icon {
  flex-shrink: 0;
  cursor: pointer;
}

.todo-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-top: 2px;
}

.todo-tags {
  display: flex;
  align-items: center;
  gap: 3px;
}

.todo-tag-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.todo-date {
  font-size: var(--font-size-xs);
  color: var(--text-disabled);
}

.todo-actions {
  display: none;
  flex-shrink: 0;
  align-items: center;
  gap: var(--spacing-xs);
  margin-top: 2px;
}

.todo-item:hover .todo-actions {
  display: flex;
}

.action-btn {
  cursor: pointer;
  color: var(--text-secondary);
  padding: 2px;
  border-radius: 4px;
  transition: color 0.15s, background 0.15s;
}

.action-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.action-btn.danger:hover {
  color: var(--color-error);
}
</style>
