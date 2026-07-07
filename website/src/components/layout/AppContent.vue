<script setup lang="ts">
import AppHeader from './AppHeader.vue'
</script>

<template>
  <div class="content-wrapper">
    <AppHeader />
    <main class="content-area">
      <router-view />
    </main>
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
</style>
