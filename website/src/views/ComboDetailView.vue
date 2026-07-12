<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCombosStore } from '@/stores/combos'
import { useTodosStore } from '@/stores/todos'
import { MessagePlugin } from 'tdesign-vue-next'
import GlassPanel from '@/components/common/GlassPanel.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import TodoItem from '@/components/todo/TodoItem.vue'
import { combosApi } from '@/api/combos'
import { collabApi } from '@/api/collab'
import { todosApi } from '@/api/todos'

const route = useRoute()
const router = useRouter()
const combosStore = useCombosStore()
const todosStore = useTodosStore()

const comboId = computed(() => Number(route.params.id))
const comboMeta = computed(() => combosStore.items.find((c) => c.id === comboId.value))

const comboDetail = ref<any>(null)
const comboLoading = ref(false)
const todosLoading = ref(false)
const comboNotFound = ref(false)
const comboTodos = ref<any[]>([])
const showMembers = ref(false)

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

onMounted(async () => {
  if (combosStore.items.length === 0) {
    comboLoading.value = true
    try {
      await combosStore.fetchCombos()
    } finally {
      comboLoading.value = false
    }
  }

  // Fetch full combo detail from API
  comboLoading.value = true
  try {
    const res = await combosApi.getById(comboId.value)
    if (res.success && res.combo) {
      comboDetail.value = res.combo
    } else {
      comboNotFound.value = true
      return
    }
  } catch {
    comboNotFound.value = true
    return
  } finally {
    comboLoading.value = false
  }

  // 普通组合: 从普通待办表中筛选; 共享组合: 从共享待办表中拉取
  todosLoading.value = true
  try {
    if (comboDetail.value?.isShared) {
      comboTodos.value = comboDetail.value.sharedTodos || []
    } else {
      const res = await todosApi.getList({ comboId: comboId.value })
      if (res.success && res.todos) {
        comboTodos.value = res.todos
      }
    }
  } finally {
    todosLoading.value = false
  }
})

const comboItems = computed(() => {
  if (!comboDetail.value?.isShared) return comboTodos.value
  // 共享待办: 映射 myCompletedAt 到 completed 字段以便 TodoItem 兼容
  return (comboTodos.value || []).map((t: any) => ({
    ...t,
    id: t.id,
    isStar: !!t.isStar,
    completed: t.myCompletedAt ? 1 : 0,
    tags: t.tags || [],
    priority: t.priority || 'p2',
    setDate: t.setDate,
    images: t.images || [],
  }))
})

const completedCount = computed(() => comboItems.value.filter((t) => t.completed).length)

const role = computed(() => comboDetail.value?.userRole || comboMeta.value?.role || null)
const canManage = computed(() => role.value === 'owner' || role.value === 'admin')
const isOwner = computed(() => role.value === 'owner')

function goBack() {
  router.push('/')
}

async function handleLeave() {
  try {
    await collabApi.leave(comboId.value)
    MessagePlugin.success('已退出组合')
    await combosStore.fetchCombos()
    router.push('/')
  } catch {
    MessagePlugin.error('退出失败')
  }
}

function copyShareCode() {
  if (!comboDetail.value?.shareCode) return
  navigator.clipboard.writeText(comboDetail.value.shareCode)
  MessagePlugin.success('邀请码已复制')
}
</script>

<template>
  <div class="combo-detail-page">
    <div class="page-header">
      <t-button variant="text" @click="goBack">
        <template #icon><t-icon name="arrow-left" /></template>
        返回
      </t-button>
    </div>

    <t-loading v-if="comboLoading" :loading="true" size="large" />

    <template v-else-if="comboNotFound">
      <GlassPanel class="detail-card empty">
        <p>组合不存在</p>
        <t-button variant="outline" @click="goBack">返回待办</t-button>
      </GlassPanel>
    </template>

    <template v-else-if="comboDetail || comboMeta">
      <!-- 组合信息卡片 -->
      <GlassPanel class="combo-header-card">
        <div class="combo-header">
          <t-icon :name="(comboDetail || comboMeta)!.icon || 'folder'" size="32px" :style="{ color: (comboDetail || comboMeta)!.color }" />
          <div class="combo-header-info">
            <div class="combo-title-row">
              <h2 class="combo-name">{{ (comboDetail || comboMeta)!.name }}</h2>
              <span v-if="comboMeta?.isMember || comboDetail?.userRole" class="shared-badge">共享</span>
              <span
                v-if="role"
                class="role-badge"
                :style="{ background: roleColor[role] }"
              >{{ roleLabel[role] }}</span>
            </div>
            <span class="combo-meta">
              {{ comboItems.length }} 个待办 · 已完成 {{ completedCount }}
            </span>
          </div>
        </div>
        <p v-if="(comboDetail || comboMeta)!.description" class="combo-desc">{{ (comboDetail || comboMeta)!.description }}</p>

        <!-- 邀请码 -->
        <div v-if="comboDetail?.shareCode" class="share-code-row">
          <t-icon name="link" size="14px" />
          <span class="share-code-label">邀请码：</span>
          <code class="share-code">{{ comboDetail.shareCode }}</code>
          <t-button variant="text" size="small" @click="copyShareCode">复制</t-button>
        </div>

        <!-- 操作按钮 -->
        <div v-if="comboMeta?.isMember" class="combo-actions-row">
          <t-button variant="outline" size="small" theme="danger" @click="handleLeave">
            退出组合
          </t-button>
        </div>
      </GlassPanel>

      <!-- 成员列表（折叠） -->
      <GlassPanel v-if="comboDetail?.members?.length" class="members-card">
        <div class="members-header" @click="showMembers = !showMembers">
          <h3 class="section-title">成员（{{ comboDetail.members.length }}）</h3>
          <t-icon :name="showMembers ? 'chevron-up' : 'chevron-down'" size="16px" color="var(--text-disabled)" />
        </div>
        <div v-if="showMembers" class="member-list">
          <div v-for="member in comboDetail.members" :key="member.id" class="member-item">
            <t-avatar :image="member.avatarUrl" :alt="member.nickname" size="32px" />
            <span class="member-name">{{ member.nickname }}</span>
            <span
              class="role-badge"
              :style="{ background: roleColor[member.role] }"
            >{{ roleLabel[member.role] }}</span>
          </div>
        </div>
      </GlassPanel>

      <!-- 待办列表 -->
      <div class="todo-list-section">
        <t-loading v-if="todosLoading" :loading="true" size="large" />

        <EmptyState
          v-else-if="comboItems.length === 0"
          icon="folder"
          title="组合为空"
          description="该组合中暂无待办"
        />

        <TransitionGroup v-else name="todo-stagger" tag="div" class="todo-list">
          <TodoItem
            v-for="(todo, index) in comboItems"
            :key="todo.id"
            :todo="todo"
            :combo-id="comboDetail?.isShared ? comboId : undefined"
            :style="`--stagger-delay: ${index * 30}ms`"
          />
        </TransitionGroup>
      </div>
    </template>
  </div>
</template>

<style scoped>
.combo-detail-page {
  max-width: 720px;
  margin: 0 auto;
  padding: var(--spacing-lg) 0;
}

.page-header {
  margin-bottom: var(--spacing-md);
}

.detail-card {
  padding: var(--spacing-xl);
  min-height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  color: var(--text-secondary);
}

.combo-header-card {
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-md);
}

.combo-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.combo-header-info {
  flex: 1;
}

.combo-title-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.combo-name {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.combo-meta {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-top: 2px;
}

.combo-desc {
  margin-top: var(--spacing-sm);
  font-size: var(--font-size-base);
  color: var(--text-secondary);
}

.share-code-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  margin-top: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--bg-hover);
  border-radius: var(--border-radius);
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.share-code-label {
  flex-shrink: 0;
}

.share-code {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-primary);
  letter-spacing: 2px;
}

.combo-actions-row {
  margin-top: var(--spacing-md);
  display: flex;
  gap: var(--spacing-sm);
}

.members-card {
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-md);
}

.section-title {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 var(--spacing-sm) 0;
}

.member-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.member-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xs) 0;
}

.member-name {
  flex: 1;
  font-size: var(--font-size-base);
  color: var(--text-primary);
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

.todo-list-section {
  margin-top: var(--spacing-md);
}

.todo-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.todo-stagger-enter-active {
  transition: opacity var(--duration-normal) var(--ease-out),
              transform var(--duration-normal) var(--ease-out);
  transition-delay: var(--stagger-delay, 0ms);
}
.todo-stagger-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
@media (prefers-reduced-motion: reduce) {
  .todo-stagger-enter-active {
    transition: none;
  }
  .todo-stagger-enter-from {
    transform: none;
  }
}
</style>
