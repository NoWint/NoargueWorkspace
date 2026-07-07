<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<template>
  <div class="not-found-view">
    <t-icon name="error-circle" size="64px" color="#c9cdd4" />
    <h1>404</h1>
    <p class="not-found-desc">页面不存在或已被移除</p>
    <t-button theme="primary" @click="router.push('/')">返回首页</t-button>
  </div>
</template>

<style scoped>
.not-found-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: var(--spacing-md);
  color: var(--text-secondary);
}
.not-found-view h1 {
  font-size: var(--font-size-2xl);
  color: var(--text-primary);
}
.not-found-desc {
  font-size: var(--font-size-base);
}
</style>
