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
