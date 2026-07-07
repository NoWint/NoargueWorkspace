<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

const limits = [
  { label: '待办限额', value: authStore.user?.todoLimit ?? '--', icon: 'file' },
  { label: '组合限额', value: authStore.user?.comboLimit ?? '--', icon: 'folder' },
  { label: '协作限额', value: authStore.user?.collabLimit ?? '--', icon: 'team' },
]
</script>

<template>
  <div class="user-center-page">
    <div class="profile-card">
      <t-avatar
        :image="authStore.user?.avatarUrl"
        :alt="authStore.user?.nickname"
        size="72px"
        class="avatar"
      />
      <div class="profile-info">
        <h2 class="nickname">{{ authStore.user?.nickname || '未登录' }}</h2>
        <t-tag v-if="authStore.user?.isAdmin" theme="primary" size="small">管理员</t-tag>
      </div>
    </div>

    <div class="limits-section">
      <h3 class="section-title">使用限额</h3>
      <div class="limits-grid">
        <div v-for="item in limits" :key="item.label" class="limit-item">
          <t-icon :name="item.icon" size="24px" color="var(--color-primary)" />
          <div class="limit-info">
            <span class="limit-label">{{ item.label }}</span>
            <span class="limit-value">{{ item.value }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="actions-section">
      <t-button variant="outline" block @click="router.push('/trash')">
        <template #icon><t-icon name="delete" /></template>
        回收站
      </t-button>
    </div>
  </div>
</template>

<style scoped>
.user-center-page {
  max-width: 600px;
  margin: 0 auto;
  padding: var(--spacing-lg) 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}
.profile-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  padding: var(--spacing-lg);
  background: var(--bg-glass);
  border-radius: var(--border-radius);
  backdrop-filter: blur(var(--glass-blur));
}
.profile-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}
.nickname {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--text-primary);
}
.section-title {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--spacing-md);
}
.limits-section {
  padding: var(--spacing-lg);
  background: var(--bg-glass);
  border-radius: var(--border-radius);
  backdrop-filter: blur(var(--glass-blur));
}
.limits-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: var(--spacing-md);
}
.limit-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
  text-align: center;
}
.limit-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.limit-label {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}
.limit-value {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-primary);
}
.actions-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}
</style>
