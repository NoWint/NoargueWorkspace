<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTodosStore } from '@/stores/todos'
import { useTagsStore } from '@/stores/tags'
import type { Todo } from '@/types'

const props = defineProps<{
  todo: Todo
  comboId?: number | string
  highlightKeywords?: string
  parentPath?: string
  navigateTo?: string
}>()

const router = useRouter()
const todosStore = useTodosStore()
const tagsStore = useTagsStore()

const completed = computed(() => !!props.todo.completed)
const starred = computed(() => !!props.todo.isStar)

const priorityLabel: Record<string, string> = {
  p1: '紧急重要',
  p2: '重要不紧急',
  p3: '紧急不重要',
  p4: '不紧急不重要',
}

const priorityColor: Record<string, string> = {
  p1: '#e34d59',
  p2: '#2196F3',
  p3: '#ff9800',
  p4: '#999',
}

const priorityClass = computed(() => {
  if (!props.todo.priority) return ''
  return `priority-p${props.todo.priority}`
})

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
  if (props.navigateTo) {
    router.push(props.navigateTo)
  } else if (props.comboId) {
    router.push(`/todos/${props.todo.id}?comboId=${props.comboId}`)
  } else {
    router.push(`/todos/${props.todo.id}`)
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function highlightedText(): string {
  const text = props.todo.text || ''
  if (!props.highlightKeywords) return escapeHtml(text)
  const kws = props.highlightKeywords.trim().split(/\s+/).filter(Boolean)
  if (!kws.length) return escapeHtml(text)
  let result = escapeHtml(text)
  kws.forEach((kw) => {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`(${escaped})`, 'gi')
    result = result.replace(regex, '<mark>$1</mark>')
  })
  return result
}
</script>

<template>
  <div class="todo-item" :class="[priorityClass, { completed }]">
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
        <span class="text-content" v-if="!highlightKeywords">{{ todo.text }}</span>
        <span class="text-content highlightable" v-else v-html="highlightedText()" />
        <span class="star-wrapper" @click.stop="handleToggleStar">
          <t-icon
            :name="starred ? 'star-filled' : 'star'"
            :color="starred ? '#ff9800' : undefined"
            size="14px"
            class="star-icon"
          />
        </span>
      </div>

      <div class="todo-meta">
        <span class="todo-priority-dot" v-if="todo.priority" :style="{ background: priorityColor[todo.priority] }" />
        <div v-if="tagItems.length" class="todo-tags">
          <span
            v-for="tag in tagItems"
            :key="tag!.id"
            class="todo-tag"
          >
            <span class="todo-tag-dot" :style="{ background: tag!.color }" />
            <span class="todo-tag-label">{{ tag!.name.slice(0, 2) }}</span>
          </span>
        </div>
        <span v-if="hasDate" class="todo-date">{{ todo.setDate }}</span>
      </div>
      <div v-if="parentPath" class="todo-parent-path">{{ parentPath }}</div>
    </div>

    <div class="todo-actions">
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

/* 优先级左侧边框（与 add-todo 配色一致） */
.todo-item.priority-p1 {
  border-left: 3px solid #e34d59;
}
.todo-item.priority-p2 {
  border-left: 3px solid #2196F3;
}
.todo-item.priority-p3 {
  border-left: 3px solid #ff9800;
}
.todo-item.priority-p4 {
  border-left: 3px solid #999;
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
  font-weight: 500;
}

.completed .text-content {
  text-decoration: line-through;
  color: var(--text-disabled);
}

.star-icon {
  flex-shrink: 0;
}

.star-wrapper {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  flex-shrink: 0;
  line-height: 0;
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
  gap: 6px;
}

.todo-tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.todo-tag-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.todo-tag-label {
  font-size: 11px;
  color: var(--text-secondary);
  line-height: 1;
}

.todo-priority-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.todo-date {
  font-size: var(--font-size-xs);
  color: var(--text-disabled);
}

.todo-parent-path {
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.highlightable :deep(mark) {
  background: #fff3cd;
  color: #856404;
  padding: 0 2px;
  border-radius: 2px;
}

[data-theme='dark'] .highlightable :deep(mark) {
  background: #664d03;
  color: #ffd700;
}

.todo-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: var(--spacing-xs);
  margin-top: 2px;
  opacity: 0;
  transition: opacity var(--duration-fast) var(--ease-out);
}

.todo-item:hover .todo-actions {
  opacity: 1;
}

.action-btn {
  cursor: pointer;
  color: var(--text-secondary);
  padding: 2px;
  border-radius: 4px;
  transition: color var(--duration-fast) var(--ease-out),
              background var(--duration-fast) var(--ease-out),
              transform var(--duration-fast) var(--ease-out);
}

.action-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.action-btn:active {
  transform: scale(0.9);
}

.action-btn.danger:hover {
  color: var(--color-error);
}

[data-theme='dark'] .todo-item:hover {
  background: var(--bg-hover);
}
</style>
