<script setup lang="ts">
import { ref } from 'vue'
import { useTodosStore } from '@/stores/todos'
import { useCombosStore } from '@/stores/combos'
import { MessagePlugin } from 'tdesign-vue-next'

const todosStore = useTodosStore()

const text = ref('')
const submitting = ref(false)

async function handleSubmit() {
  const trimmed = text.value.trim()
  if (!trimmed) return

  submitting.value = true
  try {
    await todosStore.createTodo({ text: trimmed })
    text.value = ''
  } catch {
    MessagePlugin.error('创建失败')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="quick-add">
    <t-input
      v-model="text"
      placeholder="添加待办，按 Enter 创建..."
      :maxlength="200"
      @keyup.enter="handleSubmit"
      :disabled="submitting"
      size="large"
      class="add-input"
    >
      <template #suffix-icon>
        <t-icon
          name="add-circle"
          size="20px"
          class="add-btn"
          :style="{ color: text.trim() ? 'var(--color-primary)' : 'var(--text-disabled)' }"
          @click="handleSubmit"
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
