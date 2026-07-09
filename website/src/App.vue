<script setup lang="ts">
import { useRoute } from 'vue-router'
import { computed } from 'vue'
import { ConfigProvider } from 'tdesign-vue-next'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppContent from '@/components/layout/AppContent.vue'
import MobileTabBar from '@/components/layout/MobileTabBar.vue'
import AmbientBackground from '@/components/common/AmbientBackground.vue'
import { useTheme } from '@/composables/useTheme'

// Initialize theme system (applies saved/system theme on mount)
useTheme()

const route = useRoute()
const isFullscreen = computed(() => route.meta.fullscreen)

const globalConfig = {
  // TDesign brand color is already overridden via CSS variables in variables.css
}
</script>

<template>
  <t-config-provider :global-config="globalConfig">
    <template v-if="isFullscreen">
      <transition name="page-fade" mode="out-in">
        <router-view />
      </transition>
    </template>
    <template v-else>
      <div class="app-layout">
        <AmbientBackground />
        <AppSidebar class="app-sidebar" />
        <div class="app-main">
          <AppContent />
        </div>
        <MobileTabBar class="mobile-tabbar" />
      </div>
    </template>
  </t-config-provider>
</template>

<style scoped>
.app-layout {
  display: flex;
  min-height: 100vh;
  padding-bottom: 0;
  position: relative;
  z-index: 1;
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

.mobile-tabbar {
  display: none;
}

@media (max-width: 767px) {
  .app-sidebar {
    display: none;
  }
  .app-main {
    padding-bottom: 56px;
  }
  .mobile-tabbar {
    display: flex;
  }
}
</style>

<!-- Global transition styles (not scoped) -->
<style>
/* Page transition */
.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity var(--duration-normal) var(--ease-out),
              transform var(--duration-normal) var(--ease-out);
}

.page-fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.page-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* Respect reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  .page-fade-enter-active,
  .page-fade-leave-active {
    transition: none;
  }
  .page-fade-enter-from,
  .page-fade-leave-to {
    transform: none;
  }
}
</style>
