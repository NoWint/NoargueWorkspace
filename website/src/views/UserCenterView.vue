<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { MessagePlugin } from 'tdesign-vue-next'

const authStore = useAuthStore()
const router = useRouter()

const editingNickname = ref(false)
const nicknameInput = ref(authStore.user?.nickname || '')
const saving = ref(false)

const limits = [
  { label: '待办限额', value: authStore.user?.todoLimit ?? '--', icon: 'file' },
  { label: '组合限额', value: authStore.user?.comboLimit ?? '--', icon: 'folder' },
  { label: '协作限额', value: authStore.user?.collabLimit ?? '--', icon: 'team' },
]

async function saveNickname() {
  const trimmed = nicknameInput.value.trim()
  if (!trimmed) {
    MessagePlugin.warning('昵称不能为空')
    return
  }
  saving.value = true
  try {
    await authStore.updateProfile({ nickname: trimmed })
    MessagePlugin.success('昵称已更新')
    editingNickname.value = false
  } catch {
    MessagePlugin.error('更新失败')
  } finally {
    saving.value = false
  }
}

function cancelEdit() {
  nicknameInput.value = authStore.user?.nickname || ''
  editingNickname.value = false
}
</script>

<template>
  <div class="user-center-page">
    <!-- 个人信息卡片 -->
    <div class="profile-card">
      <t-avatar
        :image="authStore.user?.avatarUrl"
        :alt="authStore.user?.nickname"
        size="72px"
        class="avatar"
      />
      <div class="profile-info">
        <div class="nickname-row">
          <template v-if="editingNickname">
            <t-input
              v-model="nicknameInput"
              size="small"
              maxlength="20"
              class="nickname-input"
              @keyup.enter="saveNickname"
            />
            <t-button size="small" :loading="saving" @click="saveNickname">保存</t-button>
            <t-button size="small" variant="outline" @click="cancelEdit">取消</t-button>
          </template>
          <template v-else>
            <h2 class="nickname">{{ authStore.user?.nickname || '未登录' }}</h2>
            <t-button size="small" variant="text" @click="editingNickname = true">
              <template #icon><t-icon name="edit" /></template>
            </t-button>
          </template>
        </div>
        <div class="badge-row">
          <t-tag v-if="authStore.user?.isAdmin" theme="primary" size="small">管理员</t-tag>
          <t-tag
            v-for="(badge, idx) in authStore.user?.badgeTitles"
            :key="idx"
            size="small"
            :color="authStore.user?.badgeColors?.[idx]"
            style="margin-right: 4px;"
          >{{ badge }}</t-tag>
        </div>
      </div>
    </div>

    <!-- 使用限额 -->
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

    <!-- 快捷入口 -->
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
  flex: 1;
}
.nickname-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}
.nickname {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--text-primary);
}
.nickname-input {
  width: 160px;
}
.badge-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
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
