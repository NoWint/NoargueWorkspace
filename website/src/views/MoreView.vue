<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const navItems = [
  { label: '用户中心', icon: 'user', path: '/user-center' },
  { label: '回收站', icon: 'delete', path: '/trash' },
  { label: '公告', icon: 'notification', path: '/notices' },
  { label: '更新日志', icon: 'file', path: '/changelogs' },
]

function handleLogout() {
  authStore.logout()
}
</script>

<template>
  <div class="more-page">
    <h2 class="page-title">更多</h2>

    <div class="nav-grid">
      <div
        v-for="item in navItems"
        :key="item.path"
        class="nav-card"
        @click="router.push(item.path)"
      >
        <t-icon :name="item.icon" size="28px" color="var(--color-primary)" />
        <span class="nav-label">{{ item.label }}</span>
      </div>
    </div>

    <div class="logout-section">
      <t-button variant="outline" block theme="danger" @click="handleLogout">
        退出登录
      </t-button>
    </div>
  </div>
</template>

<style scoped>
.more-page {
  max-width: 600px;
  margin: 0 auto;
  padding: var(--spacing-lg) 0;
}
.page-title {
  font-size: var(--font-size-xl);
  font-weight: 600;
  margin-bottom: var(--spacing-lg);
}
.nav-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-xl);
}
.nav-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-lg) var(--spacing-sm);
  background: var(--bg-glass);
  border-radius: var(--border-radius);
  backdrop-filter: blur(var(--glass-blur));
  cursor: pointer;
  transition: box-shadow 0.2s;
}
.nav-card:hover {
  box-shadow: var(--shadow-sm);
}
.nav-label {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}
.logout-section {
  margin-top: var(--spacing-lg);
}
</style>
