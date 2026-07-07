<script setup lang="ts">
defineProps<{
  blur?: number
  opacity?: number
}>()
</script>

<template>
  <div
    class="glass-panel"
    :style="{
      backdropFilter: `blur(${blur ?? 20}px) saturate(180%)`,
      background: `rgba(255, 255, 255, ${opacity ?? 0.7})`,
    }"
  >
    <slot />
  </div>
</template>

<style scoped>
.glass-panel {
  border-radius: var(--border-radius);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: var(--shadow-md);
}
</style>
