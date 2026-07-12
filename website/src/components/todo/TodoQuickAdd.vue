<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const text = ref('')

function handleKeydown(val: string, context: { e: KeyboardEvent }) {
  if (context.e.key === 'Enter') {
    handleEnter()
  }
}

function handleEnter() {
  const trimmed = text.value.trim()
  if (!trimmed) return
  router.push(`/todos/add?text=${encodeURIComponent(trimmed)}`)
  text.value = ''
}
</script>

<template>
  <div class="quick-add">
    <t-input
      v-model="text"
      placeholder="输入待办，按 Enter 跳转新建页..."
      :maxlength="200"
      @keydown="handleKeydown"
      size="large"
      class="add-input"
    >
      <template #suffix-icon>
        <t-icon
          name="add-circle"
          size="20px"
          class="add-btn"
          :style="{ color: text.trim() ? 'var(--color-primary)' : 'var(--text-disabled)' }"
          @click="handleEnter"
        />
      </template>
    </t-input>
  </div>
</template>

<style scoped>
.quick-add {
  padding: 0 var(--spacing-md);
}

.add-btn {
  cursor: pointer;
  transition: color 0.15s;
}
</style>
