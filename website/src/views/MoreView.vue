<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import GlassPanel from '@/components/common/GlassPanel.vue'

const router = useRouter()
const authStore = useAuthStore()

interface NavItem {
  label: string
  icon: string
  path: string
  desc?: string
}

const dataItems: NavItem[] = [
  { label: '用户中心', icon: 'user', path: '/user-center', desc: '个人信息与限额' },
  { label: '回收站', icon: 'delete', path: '/trash', desc: '已删除的待办' },
]

const infoItems: NavItem[] = [
  { label: '公告', icon: 'notification', path: '/notices', desc: '系统公告' },
  { label: '更新日志', icon: 'file', path: '/changelogs', desc: '版本更新记录' },
]

function handleLogout() {
  authStore.logout()
}
</script>

<template>
  <div class="more-page">
    <h2 class="page-title">更多</h2>

    <!-- 数据管理 -->
    <section class="section">
      <h3 class="section-title">数据管理</h3>
      <div class="nav-grid">
        <div
          v-for="item in dataItems"
          :key="item.path"
          class="nav-card"
          @click="router.push(item.path)"
        >
          <t-icon :name="item.icon" size="28px" color="var(--color-primary)" />
          <span class="nav-label">{{ item.label }}</span>
          <span v-if="item.desc" class="nav-desc">{{ item.desc }}</span>
        </div>
      </div>
    </section>

    <!-- 信息 -->
    <section class="section">
      <h3 class="section-title">信息</h3>
      <div class="nav-grid">
        <div
          v-for="item in infoItems"
          :key="item.path"
          class="nav-card"
          @click="router.push(item.path)"
        >
          <t-icon :name="item.icon" size="28px" color="var(--color-primary)" />
          <span class="nav-label">{{ item.label }}</span>
          <span v-if="item.desc" class="nav-desc">{{ item.desc }}</span>
        </div>
      </div>
    </section>

    <!-- 关于 -->
    <section class="section">
      <h3 class="section-title">关于</h3>
      <GlassPanel class="about-card">
        <div class="about-row">
          <span class="about-label">应用名称</span>
          <span class="about-value">时光绿径待办</span>
        </div>
        <div class="about-row">
          <span class="about-label">版本</span>
          <span class="about-value">Web v1.0.0</span>
        </div>
        <div class="about-row">
          <span class="about-label">登录用户</span>
          <span class="about-value">{{ authStore.user?.nickname || '未登录' }}</span>
        </div>
      </GlassPanel>
    </section>

    <!-- 退出登录 -->
    <section class="section">
      <t-button variant="outline" block theme="danger" @click="handleLogout">
        退出登录
      </t-button>
    </section>
  </div>
</template>

<style scoped>
.more-page {
  max-width: 640px;
  margin: 0 auto;
  padding: var(--spacing-lg) 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}
.page-title {
  font-size: var(--font-size-xl);
  font-weight: 600;
}
.section-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: var(--spacing-md);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.nav-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-md);
}
.nav-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-lg) var(--spacing-sm);
  background: var(--bg-glass);
  border-radius: var(--border-radius);
  backdrop-filter: var(--glass-blur) var(--glass-saturate);
  -webkit-backdrop-filter: var(--glass-blur) var(--glass-saturate);
  cursor: pointer;
  transition: transform var(--duration-fast) var(--ease-out),
              box-shadow var(--duration-fast) var(--ease-out);
  text-align: center;
}
.nav-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-card-hover);
}
.nav-label {
  font-size: var(--font-size-base);
  color: var(--text-primary);
  font-weight: 500;
}
.nav-desc {
  font-size: var(--font-size-xs);
  color: var(--text-disabled);
}
.about-card {
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}
.about-row {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-base);
}
.about-label {
  color: var(--text-secondary);
}
.about-value {
  color: var(--text-primary);
  font-weight: 500;
}
</style>
