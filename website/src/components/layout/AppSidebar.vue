<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { computed } from 'vue'
import GlassPanel from '@/components/common/GlassPanel.vue'

const router = useRouter()
const route = useRoute()

const navItems = [
  { path: '/', name: '待办', icon: 'check' },
  { path: '/calendar', name: '日历', icon: 'calendar' },
  { path: '/community', name: '社区', icon: 'chat' },
  { path: '/stats', name: '统计', icon: 'chart-bar' },
  { path: '/more', name: '更多', icon: 'ellipsis' },
]

function navigate(path: string) {
  router.push(path)
}
</script>

<template>
  <GlassPanel class="sidebar">
    <div class="sidebar-logo" @click="router.push('/')">
      <t-icon name="leaf" size="24px" class="logo-icon" />
      <span class="logo-text">时光绿径</span>
    </div>

    <nav class="sidebar-nav">
      <div
        v-for="item in navItems"
        :key="item.path"
        class="nav-item"
        :class="{ active: route.path.startsWith(item.path) && (item.path !== '/' ? true : route.path === '/') }"
        @click="navigate(item.path)"
      >
        <t-icon :name="item.icon" size="20px" />
        <span class="nav-label">{{ item.name }}</span>
      </div>
    </nav>
  </GlassPanel>
</template>

<style scoped>
.sidebar {
  width: var(--sidebar-width);
  height: 100vh;
  position: sticky;
  top: 0;
  display: flex;
  flex-direction: column;
  padding: var(--spacing-md);
  border-right: 1px solid var(--border-color);
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-xs);
  margin-bottom: var(--spacing-lg);
  cursor: pointer;
}

.logo-icon {
  color: var(--color-primary);
}

.logo-text {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--text-primary);
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-sm);
  border-radius: var(--border-radius);
  cursor: pointer;
  color: var(--text-secondary);
  transition: background 0.2s, color 0.2s;
}

.nav-item:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.nav-item.active {
  background: var(--color-primary-light);
  color: var(--color-primary);
}

.nav-label {
  font-size: var(--font-size-base);
}
</style>
