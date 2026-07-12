<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const tabItems = [
  { path: '/', name: '待办', icon: 'check' },
  { path: '/calendar', name: '日历', icon: 'calendar' },
  { path: '/community', name: '社区', icon: 'chat' },
  { path: '/stats', name: '统计', icon: 'chart-bar' },
  { path: '/more', name: '更多', icon: 'ellipsis' },
]

function navigate(path: string) {
  router.push(path)
}

function isActive(itemPath: string): boolean {
  if (itemPath === '/') return route.path === '/'
  return route.path.startsWith(itemPath)
}
</script>

<template>
  <nav class="mobile-tabbar">
    <div
      v-for="item in tabItems"
      :key="item.path"
      class="tab-item"
      :class="{ active: isActive(item.path) }"
      @click="navigate(item.path)"
    >
      <t-icon :name="item.icon" size="22px" />
      <span class="tab-label">{{ item.name }}</span>
    </div>
  </nav>
</template>

<style scoped>
.mobile-tabbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: var(--z-sticky);
  display: flex;
  background: var(--bg-card);
  border-top: 1px solid var(--border-color);
  padding-bottom: env(safe-area-inset-bottom);
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  height: 56px;
  cursor: pointer;
  color: var(--text-secondary);
  transition: color var(--duration-fast) var(--ease-out);
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.tab-item.active {
  color: var(--color-primary);
}

.tab-label {
  font-size: 10px;
  line-height: 1;
}
</style>
