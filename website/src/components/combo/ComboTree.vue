<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useCombosStore } from '@/stores/combos'
import { MessagePlugin } from 'tdesign-vue-next'
import ComboForm from '@/components/combo/ComboForm.vue'
import Skeleton from '@/components/common/Skeleton.vue'
import type { Combo } from '@/types'
import type { ComboWithMeta } from '@/stores/combos'

const router = useRouter()
const route = useRoute()
const combosStore = useCombosStore()

const showForm = ref(false)
const editingCombo = ref<Combo | null>(null)

const roleLabel: Record<string, string> = {
  owner: '超管',
  admin: '管理',
  member: '成员',
}

const roleColor: Record<string, string> = {
  owner: '#f44336',
  admin: '#ff9800',
  member: '#2196f3',
}

const ownCombos = computed(() => combosStore.items.filter((c) => !c.isMember && !c.isShared))
const sharedCombos = computed(() => combosStore.items.filter((c) => c.isMember || c.isShared))

onMounted(() => {
  if (combosStore.items.length === 0) {
    combosStore.fetchCombos()
  }
})

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

function isActive(combo: ComboWithMeta): boolean {
  return route.path === `/combos/${combo.id}`
}
</script>

<template>
  <div class="combo-tree">
    <div class="panel-header">
      <span class="panel-title">我的组合</span>
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

    <Skeleton v-if="combosStore.loading" type="text" :count="3" />

    <div class="combo-list">
      <router-link to="/" class="combo-item" :class="{ active: route.path === '/' }">
        <t-icon name="list" size="18px" />
        <span class="combo-name">全部待办</span>
      </router-link>

      <!-- 个人组合 -->
      <template v-for="combo in ownCombos" :key="combo.id">
        <router-link
          :to="`/combos/${combo.id}`"
          class="combo-item"
          :class="{ active: isActive(combo) }"
        >
          <t-icon :name="combo.icon || 'folder'" size="18px" :style="{ color: combo.color }" />
          <span class="combo-name">{{ combo.name }}</span>
          <div class="combo-actions" @click.stop>
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
            <t-popconfirm attach="body" content="确定删除此组合？" @confirm="deleteCombo(combo)">
              <t-button
                variant="text"
                shape="square"
                size="small"
                class="combo-action-btn"
                title="删除"
              >
                <t-icon name="delete" size="14px" />
              </t-button>
            </t-popconfirm>
          </div>
        </router-link>
      </template>
    </div>

    <!-- 共享组合 -->
    <div v-if="sharedCombos.length" class="shared-section">
      <div class="section-label">
        <span class="panel-title">共享组合</span>
      </div>
      <div class="combo-list">
        <router-link
          v-for="combo in sharedCombos"
          :key="combo.id"
          :to="`/combos/${combo.id}`"
          class="combo-item"
          :class="{ active: isActive(combo) }"
        >
          <t-icon :name="combo.icon || 'folder'" size="18px" :style="{ color: combo.color }" />
          <span class="combo-name">{{ combo.name }}</span>
          <span
            class="role-badge"
            :style="{ background: roleColor[combo.role || 'member'] }"
          >{{ roleLabel[combo.role || 'member'] }}</span>
        </router-link>
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

.shared-section {
  margin-top: var(--spacing-xs);
  padding-top: var(--spacing-xs);
  border-top: 1px solid var(--border-color);
}

.section-label {
  padding: var(--spacing-xs) var(--spacing-sm);
  margin-bottom: var(--spacing-xs);
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
  text-decoration: none;
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

.shared-badge {
  font-size: 10px;
  color: #ffffff;
  background: var(--color-primary, #00b26a);
  border-radius: 8px;
  padding: 1px 6px;
  line-height: 1.4;
  flex-shrink: 0;
}

.role-badge {
  font-size: 10px;
  color: #ffffff;
  border-radius: 8px;
  padding: 1px 6px;
  line-height: 1.4;
  flex-shrink: 0;
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
