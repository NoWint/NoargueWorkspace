<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useCombosStore } from '@/stores/combos'
import { MessagePlugin } from 'tdesign-vue-next'
import type { Combo } from '@/types'

const combosStore = useCombosStore()

const props = defineProps<{
  visible: boolean
  combo?: Combo | null  // null = create mode
}>()

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void
  (e: 'saved'): void
}>()

const isEdit = () => !!props.combo

const form = reactive({
  name: '',
  icon: 'folder',
  color: '#00b26a',
  description: '',
  isShared: false,
})

const submitting = ref(false)

const presetColors = [
  '#00B26A', '#1890FF', '#722ED1', '#FA8C16',
  '#C8CA4F', '#13C2C2', '#f44336', '#607d8b',
]

const presetIcons = [
  'folder', 'work', 'book', 'star', 'cart', 'command',
  'terminal-rectangle-1', 'verified', 'heart', 'city-1', 'tea',
  'flag', 'calendar', 'user', 'mail', 'edit',
]

function resetForm() {
  form.name = ''
  form.icon = 'folder'
  form.color = '#00b26a'
  form.description = ''
  form.isShared = false
}

function open() {
  if (props.combo) {
    form.name = props.combo.name
    form.icon = props.combo.icon || 'folder'
    form.color = props.combo.color || '#00b26a'
    form.description = props.combo.description || ''
    form.isShared = props.combo.isShared || false
  } else {
    resetForm()
  }
}

async function handleSubmit() {
  if (!form.name.trim()) {
    MessagePlugin.warning('请输入组合名称')
    return
  }
  submitting.value = true
  try {
    if (props.combo) {
      await combosStore.updateCombo(props.combo.id, { ...form })
      MessagePlugin.success('组合已更新')
    } else {
      await combosStore.createCombo({
        name: form.name.trim(),
        icon: form.icon,
        color: form.color,
        description: form.description,
        isShared: form.isShared,
      })
      MessagePlugin.success('组合已创建')
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
    :header="combo ? '编辑组合' : '新建组合'"
    :confirm-btn="{ content: '保存', loading: submitting }"
    :cancel-btn="'取消'"
    @confirm="handleSubmit"
    @close="handleCancel"
    @opened="open"
  >
    <div class="combo-form">
      <t-form :data="form" layout="vertical">
        <t-form-item label="名称">
          <t-input v-model="form.name" placeholder="组合名称" maxlength="20" />
        </t-form-item>

        <!-- 共享开关：仅创建时可见 -->
        <t-form-item v-if="!combo" label="启用协作模式">
          <div class="switch-row">
            <t-switch v-model="form.isShared" />
            <span class="switch-hint">与其他用户共享组合内待办</span>
          </div>
          <p v-if="form.isShared" class="shared-tip">
            <t-icon name="info-circle" size="14px" color="#00b26a" />
            创建组合后才可邀请成员加入
          </p>
        </t-form-item>

        <t-form-item label="图标">
          <div class="icon-grid">
            <div
              v-for="icon in presetIcons"
              :key="icon"
              class="icon-option"
              :class="{ selected: form.icon === icon }"
              @click="form.icon = icon"
            >
              <t-icon :name="icon" size="20px" />
            </div>
          </div>
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

        <t-form-item label="备注">
          <t-input v-model="form.description" placeholder="可选" maxlength="100" />
        </t-form-item>
      </t-form>
    </div>
  </t-dialog>
</template>

<style scoped>
.combo-form {
  min-height: 200px;
}

.switch-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.switch-hint {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.shared-tip {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--font-size-xs);
  color: #00b26a;
  margin-top: var(--spacing-xs);
}

.icon-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}

.icon-option {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--border-radius);
  border: 2px solid transparent;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.15s;
}

.icon-option:hover {
  background: var(--bg-hover);
}

.icon-option.selected {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-primary-light);
}

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
