<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

const searchText = ref('')

// 当输入非空时自动跳转到搜索页
watch(searchText, (val) => {
  if (val.trim()) {
    router.push(`/search?q=${encodeURIComponent(val.trim())}`)
  }
})
</script>

<template>
  <header class="app-header">
    <div class="header-left">
      <t-input
        v-model="searchText"
        placeholder="搜索待办事项（空格分隔关键词）"
        clearable
        size="medium"
        class="search-input"
      >
        <template #prefix-icon><t-icon name="search" size="16px" /></template>
      </t-input>
    </div>
    <div class="header-right">
      <t-avatar
        v-if="authStore.user"
        :image="authStore.user.avatarUrl"
        :alt="authStore.user.nickname"
        size="32px"
        class="user-avatar"
        @click="router.push('/user-center')"
      />
    </div>
  </header>
</template>

<style scoped>
.app-header {
  height: var(--header-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--spacing-lg);
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-card);
}

.header-left {
  flex: 1;
  max-width: 400px;
}

.search-input {
  width: 100%;
}

.header-right {
  display: flex;
  align-items: center;
}

.user-avatar {
  cursor: pointer;
}

[data-theme='dark'] .app-header {
  background: var(--bg-card);
  border-color: var(--border-color);
}
</style>
