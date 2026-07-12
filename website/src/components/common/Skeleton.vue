<template>
  <div class="skeleton" :class="[`skeleton-${type}`]" v-bind="$attrs">
    <div v-for="i in count" :key="i" class="skeleton-item" :style="{ animationDelay: `${(i - 1) * 0.1}s` }" />
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  type?: 'todo' | 'card' | 'text'
  count?: number
}>(), {
  type: 'todo',
  count: 3,
})
</script>

<style scoped>
.skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}
.skeleton-item {
  background: linear-gradient(90deg, var(--bg-hover) 25%, var(--border-color) 50%, var(--bg-hover) 75%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s infinite;
  border-radius: var(--radius-sm);
}
.skeleton-todo .skeleton-item {
  height: 48px;
}
.skeleton-card .skeleton-item {
  height: 120px;
  border-radius: var(--radius-card);
}
.skeleton-text .skeleton-item {
  height: 16px;
}
@keyframes skeleton-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
