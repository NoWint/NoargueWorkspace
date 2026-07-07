<script setup lang="ts">
defineProps<{
  icon?: string
  title?: string
  description?: string
}>()
</script>

<template>
  <div class="empty-state">
    <t-icon v-if="icon" :name="icon" size="64px" color="#c9cdd4" />
    <p class="empty-title">{{ title || '暂无数据' }}</p>
    <p v-if="description" class="empty-desc">{{ description }}</p>
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
  color: var(--text-secondary);
}
.empty-title {
  margin-top: var(--spacing-md);
  font-size: var(--font-size-lg);
}
.empty-desc {
  margin-top: var(--spacing-xs);
  font-size: var(--font-size-sm);
}
</style>
