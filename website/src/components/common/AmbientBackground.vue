<script setup lang="ts">
/**
 * AmbientBackground — 液态玻璃氛围背景
 *
 * Renders slowly floating gradient blobs behind page content.
 * Pure CSS animation, no JS overhead. Full dark mode support.
 */
</script>

<template>
  <div class="ambient-bg" aria-hidden="true">
    <div class="blob blob-1" />
    <div class="blob blob-2" />
    <div class="blob blob-3" />
  </div>
</template>

<style scoped>
.ambient-bg {
  position: fixed;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
}

.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 1;
}

.blob-1 {
  width: 400px;
  height: 400px;
  background: var(--blob-color-1);
  top: -10%;
  left: -5%;
  animation: float-blob-1 25s ease-in-out infinite;
}

.blob-2 {
  width: 350px;
  height: 350px;
  background: var(--blob-color-2);
  bottom: -8%;
  right: -5%;
  animation: float-blob-2 30s ease-in-out infinite;
}

.blob-3 {
  width: 250px;
  height: 250px;
  background: var(--blob-color-3);
  top: 50%;
  left: 50%;
  animation: float-blob-3 20s ease-in-out infinite;
}

@keyframes float-blob-1 {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  33% {
    transform: translate(60px, -40px) scale(1.1);
  }
  66% {
    transform: translate(-30px, 50px) scale(0.95);
  }
}

@keyframes float-blob-2 {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  33% {
    transform: translate(-50px, -30px) scale(1.08);
  }
  66% {
    transform: translate(40px, 40px) scale(0.95);
  }
}

@keyframes float-blob-3 {
  0%, 100% {
    transform: translate(-50%, -50%) scale(1);
  }
  25% {
    transform: translate(-40%, -60%) scale(1.15);
  }
  50% {
    transform: translate(-60%, -45%) scale(0.9);
  }
  75% {
    transform: translate(-45%, -55%) scale(1.05);
  }
}

@media (prefers-reduced-motion: reduce) {
  .blob {
    animation: none;
  }
}
</style>
