<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useCombosStore } from '@/stores/combos'
import { MessagePlugin } from 'tdesign-vue-next'
import ComboForm from '@/components/combo/ComboForm.vue'
import type { Combo } from '@/types'

const combosStore = useCombosStore()

const showForm = ref(false)
const editingCombo = ref<Combo | null>(null)

onMounted(() => {
  if (combosStore.items.length === 0) {
    combosStore.fetchCombos()
  }
})

function selectCombo(id: number | null) {
  combosStore.selectCombo(id)
}

function openCreate() {
  editingCombo.value = null
  showForm.value = true
}

function openEdit(combo: Combo) {
  editingCombo.value = combo
  showForm.value = true
}

async function deleteCombo(combo: Combo) {
  try {
    await combosStore.deleteCombo(combo.id)
    MessagePlugin.success('组合已删除')
  } catch {
    MessagePlugin.error('删除失败')
  }
}
</script>

<template>
  <div class="combo-tree">
    <div class="panel-header">
      <span class="panel-title">组合</span>
      <t-button
        variant="text"
        shape="square"
        class="header-add-btn"
        title="新建组合"
        @click="openCreate"
      >
        <t-icon name="add" size="18px" />
      </t-button>
    </div>

    <t-loading v-if="combosStore.loading" :loading="true" size="small" />

    <div class="combo-list">
      <!-- 全部待办 -->
      <div
        class="combo-item"
        :class="{ active: combosStore.selectedId === null }"
        @click="selectCombo(null)"
      >
        <t-icon name="list" size="18px" />
        <span class="combo-name">全部待办</span>
      </div>

      <!-- 组合列表 -->
      <div
        v-for="combo in combosStore.items"
        :key="combo.id"
        class="combo-item"
        :class="{ active: combosStore.selectedId === combo.id }"
        @click="selectCombo(combo.id)"
      >
        <t-icon :name="combo.icon || 'folder'" size="18px" :style="{ color: combo.color }" />
        <span class="combo-name">{{ combo.name }}</span>
        <div class="combo-actions">
          <t-button
            variant="text"
            shape="square"
            size="small"
            class="combo-action-btn"
            title="编辑"
            @click.stop="openEdit(combo)"
          >
            <t-icon name="edit" size="14px" />
          </t-button>
          <t-popconfirm content="确定删除此组合？" @confirm.stop="deleteCombo(combo)">
            <t-button
              variant="text"
              shape="square"
              size="small"
              class="combo-action-btn"
              title="删除"
              @click.stop
            >
              <t-icon name="delete" size="14px" />
            </t-button>
          </t-popconfirm>
        </div>
      </div>
    </div>

    <div v-if="!combosStore.loading && combosStore.items.length === 0" class="empty-hint">
      暂无组合
    </div>

    <ComboForm v-model:visible="showForm" :combo="editingCombo" @saved="combosStore.fetchCombos()" />
  </div>
</template>

<style scoped>
.combo-tree {
  padding: var(--spacing-sm) 0;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-xs) var(--spacing-sm);
  margin-bottom: var(--spacing-xs);
}

.panel-title {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.header-add-btn {
  color: var(--text-secondary);
  transition: color 0.15s;
}

.header-add-btn:hover {
  color: var(--color-primary);
}

.combo-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.combo-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-sm);
  border-radius: var(--border-radius);
  cursor: pointer;
  color: var(--text-secondary);
  transition: background 0.15s, color 0.15s;
}

.combo-item:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.combo-item.active {
  background: var(--color-primary-light);
  color: var(--color-primary);
}

.combo-name {
  font-size: var(--font-size-base);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.combo-actions {
  display: none;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.combo-item:hover .combo-actions {
  display: flex;
}

.combo-action-btn {
  color: var(--text-disabled);
  transition: color 0.15s;
}

.combo-action-btn:hover {
  color: var(--text-primary);
}

.empty-hint {
  padding: var(--spacing-md);
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--text-disabled);
}
</style>
