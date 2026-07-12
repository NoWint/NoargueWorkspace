<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { computed } from 'vue'
import AppHeader from './AppHeader.vue'

const route = useRoute()
const router = useRouter()

// Detail/form pages don't show the header search bar
const isFullPage = computed(() => {
  const fullPages = ['TodoDetail', 'TodoAdd', 'TodoEdit', 'UserCenter', 'Trash', 'Notices', 'Changelogs']
  return route.name && fullPages.some(name => route.name === name)
})

// 只在首页添加待办显示 FAB
const showFab = computed(() => route.name === 'Todo')
</script>

<template>
  <div class="content-wrapper">
    <AppHeader v-if="!isFullPage" />
    <main class="content-area">
      <transition name="content-fade" mode="out-in">
        <router-view />
      </transition>
    </main>
    <!-- 添加待办 FAB -->
    <t-fab
      v-if="showFab"
      icon="add"
      text="新建待办"
      @click="router.push('/todos/add')"
    />
  </div>
</template>

<style scoped>
.content-wrapper {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.content-area {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-lg);
}

@media (max-width: 767px) {
  .content-area {
    padding: var(--page-padding-mobile);
  }
}

@media (min-width: 768px) and (max-width: 1023px) {
  .content-area {
    padding: var(--page-padding-tablet);
  }
}

@media (min-width: 1024px) {
  .content-area {
    padding: var(--page-padding-desktop);
  }
}

.content-fade-enter-active,
.content-fade-leave-active {
  transition: opacity var(--duration-normal) var(--ease-out);
}
.content-fade-enter-from,
.content-fade-leave-to {
  opacity: 0;
}
@media (prefers-reduced-motion: reduce) {
  .content-fade-enter-active,
  .content-fade-leave-active {
    transition: none;
  }
}
</style>
