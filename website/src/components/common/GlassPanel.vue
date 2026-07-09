<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  variant?: 'glass' | 'liquid' | 'elevated' | 'outlined'
  blur?: number
  opacity?: number
}>(), {
  variant: 'glass',
  blur: 40,
})

const classes = computed(() => {
  return [`panel-${props.variant}`]
})

const inlineStyle = computed(() => {
  if (props.variant !== 'liquid') return undefined
  return {
    backdropFilter: `blur(${props.blur}px) saturate(120%)`,
    WebkitBackdropFilter: `blur(${props.blur}px) saturate(120%)`,
  }
})
</script>

<template>
  <div
    class="glass-panel"
    :class="classes"
    :style="inlineStyle"
  >
    <slot />
  </div>
</template>

<style scoped>
/* .glass-panel — compatible alias kept for external class usage */
.glass-panel {
  border-radius: var(--radius-card);
  transition: box-shadow var(--duration-normal) var(--ease-out),
              transform var(--duration-normal) var(--ease-out);
}

/* === Classic frosted glass === */
.panel-glass {
  background: var(--bg-glass);
  backdrop-filter: var(--glass-blur) var(--glass-saturate);
  -webkit-backdrop-filter: var(--glass-blur) var(--glass-saturate);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-sm);
}

/* === Liquid glass — deeper blur, lighter tint, inner glow === */
.panel-liquid {
  position: relative;
  background: var(--bg-glass);
  backdrop-filter: var(--glass-blur-strong) var(--glass-saturate-strong);
  -webkit-backdrop-filter: var(--glass-blur-strong) var(--glass-saturate-strong);
  border: 1px solid rgba(255, 255, 255, 0.25);
  box-shadow: var(--shadow-md),
              inset 0 1px 0 rgba(255, 255, 255, 0.3);
  overflow: hidden;
}

.panel-liquid::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.25) 0%,
    rgba(255, 255, 255, 0.05) 40%,
    transparent 60%
  );
  pointer-events: none;
}

.panel-liquid:hover {
  box-shadow: var(--shadow-elevated),
              inset 0 1px 0 rgba(255, 255, 255, 0.4);
  transform: translateY(-1px);
}

/* === Elevated === */
.panel-elevated {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-md);
}

/* === Outlined === */
.panel-outlined {
  background: transparent;
  border: 1px solid var(--border-color);
}

/* === Dark mode === */
[data-theme='dark'] .panel-glass {
  background: var(--bg-glass);
}

[data-theme='dark'] .panel-liquid {
  background: var(--bg-glass);
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: var(--shadow-md),
              inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

[data-theme='dark'] .panel-liquid::before {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.08) 0%,
    transparent 50%
  );
}

[data-theme='dark'] .panel-liquid:hover {
  box-shadow: var(--shadow-elevated),
              inset 0 1px 0 rgba(255, 255, 255, 0.1);
}
</style>
