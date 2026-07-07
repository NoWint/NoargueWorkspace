<script setup lang="ts">
import { useRoute } from 'vue-router'
import { computed } from 'vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppContent from '@/components/layout/AppContent.vue'

const route = useRoute()
const isFullscreen = computed(() => route.meta.fullscreen)
</script>

<template>
  <template v-if="isFullscreen">
    <router-view />
  </template>
  <template v-else>
    <div class="app-layout">
      <AppSidebar class="app-sidebar" />
      <div class="app-main">
        <AppContent />
      </div>
    </div>
  </template>
</template>

<style scoped>
.app-layout {
  display: flex;
  min-height: 100vh;
}

.app-sidebar {
  flex-shrink: 0;
}

.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

@media (max-width: 767px) {
  .app-sidebar {
    display: none;
  }
}
</style>
