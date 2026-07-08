<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useTagsStore } from '@/stores/tags'
import { MessagePlugin } from 'tdesign-vue-next'
import type { Tag } from '@/types'

const tagsStore = useTagsStore()

const props = defineProps<{
  visible: boolean
  tag?: Tag | null
}>()

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void
  (e: 'saved'): void
}>()

const form = reactive({
  name: '',
  color: '#00b26a',
})

const submitting = ref(false)

const presetColors = [
  '#00b26a', '#2196f3', '#ff9800', '#f44336', '#9c27b0',
  '#4caf50', '#00bcd4', '#ff5722', '#607d8b', '#e91e63',
]

function open() {
  if (props.tag) {
    form.name = props.tag.name
    form.color = props.tag.color || '#00b26a'
  } else {
    form.name = ''
    form.color = '#00b26a'
  }
}

async function handleSubmit() {
  if (!form.name.trim()) {
    MessagePlugin.warning('请输入标签名称')
    return
  }
  submitting.value = true
  try {
    if (props.tag) {
      await tagsStore.updateTag(props.tag.id, { ...form })
      MessagePlugin.success('标签已更新')
    } else {
      await tagsStore.createTag({ ...form })
      MessagePlugin.success('标签已创建')
    }
    emit('saved')
    emit('update:visible', false)
  } catch {
    MessagePlugin.error('操作失败')
  } finally {
    submitting.value = false
  }
}

function handleCancel() {
  emit('update:visible', false)
}
</script>

<template>
  <t-dialog
    attach="body"
    :visible="visible"
    :header="tag ? '编辑标签' : '新建标签'"
    :confirm-btn="{ content: '保存', loading: submitting }"
    :cancel-btn="'取消'"
    @confirm="handleSubmit"
    @close="handleCancel"
    @opened="open"
  >
    <t-form :data="form" layout="vertical">
      <t-form-item label="名称">
        <t-input v-model="form.name" placeholder="标签名称" maxlength="10" />
      </t-form-item>

      <t-form-item label="颜色">
        <div class="color-grid">
          <div
            v-for="color in presetColors"
            :key="color"
            class="color-option"
            :class="{ selected: form.color === color }"
            :style="{ background: color }"
            @click="form.color = color"
          />
        </div>
      </t-form-item>
    </t-form>
  </t-dialog>
</template>

<style scoped>
.color-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}

.color-option {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  border: 3px solid transparent;
  transition: border-color 0.15s;
}

.color-option:hover {
  opacity: 0.8;
}

.color-option.selected {
  border-color: var(--text-primary);
}
</style>
