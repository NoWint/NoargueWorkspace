# Phase 3: 核心待办 CRUD — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full todo management experience — three-column layout (ComboTree + TagFilter + TodoList), quick add, full create/edit form, and detail view. All stores are already initialized; this phase wires them to real UI.

**Architecture:** TodoView renders a three-column flex layout. Left panel stacks ComboTree (combos) and TagFilter (tags). Right panel has AppHeader (search), TodoQuickAdd (input), and TodoItem list. TodoForm and TodoDetail are separate routed pages. All API calls go through existing stores and API modules from Phase 1.

**Tech Stack:** Vue 3 Composition API, TDesign Vue Next (Tag, Button, Dialog, Form, DatePicker, TimePicker, Select, Popconfirm, Input, Icon, Empty, Loading), Pinia stores, Vue Router

**Files to modify:**
- `website/src/router/index.ts` — replace placeholder components with real ones
- `website/src/views/TodoView.vue` — full three-column layout
- `website/src/api/todos.ts` — add `batchUpdateTags` helper if needed (V1 uses standalone tag IDs)

**Files to create:**
- `website/src/components/combo/ComboTree.vue`
- `website/src/components/combo/ComboForm.vue`
- `website/src/components/tag/TagFilter.vue`
- `website/src/components/tag/TagForm.vue`
- `website/src/components/todo/TodoItem.vue`
- `website/src/components/todo/TodoQuickAdd.vue`
- `website/src/components/todo/TodoForm.vue` (routed page, but lives in components/todo)
- `website/src/components/todo/TodoDetail.vue` (routed page)

---

### Task 1: Create ComboTree component

**Files:**
- Create: `website/src/components/combo/ComboTree.vue`

- [ ] **Step 1: Ensure directory exists**

```bash
mkdir -p "E:\WechatDevelop\TimeGreen Path Todo\website\src\components\combo"
```

- [ ] **Step 2: Write ComboTree.vue**

Uses `useCombosStore` for data. Shows a list of combos with active selection. "全部待办" option at the top (selected when `selectedId === null`). Each combo shows icon + name. Click filters todos. Right-click/long-press context menu with edit/delete (V1 uses click-and-button pattern instead of right-click).

```vue
<script setup lang="ts">
import { onMounted } from 'vue'
import { useCombosStore } from '@/stores/combos'

const combosStore = useCombosStore()

onMounted(() => {
  if (combosStore.items.length === 0) {
    combosStore.fetchCombos()
  }
})

function selectCombo(id: number | null) {
  combosStore.selectCombo(id)
}
</script>

<template>
  <div class="combo-tree">
    <div class="panel-header">
      <span class="panel-title">组合</span>
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
      </div>
    </div>

    <div v-if="!combosStore.loading && combosStore.items.length === 0" class="empty-hint">
      暂无组合
    </div>
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
}

.empty-hint {
  padding: var(--spacing-md);
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--text-disabled);
}
</style>
```

- [ ] **Step 3: Commit**

```bash
git add website/src/components/combo/ComboTree.vue
git commit -m "feat(web): add ComboTree component with selection"
```

---

### Task 2: Create ComboForm dialog

**Files:**
- Create: `website/src/components/combo/ComboForm.vue`

- [ ] **Step 1: Write ComboForm.vue**

A TDesign Dialog with a form for creating or editing a combo. Fields: name, icon (TDesign icon picker - simplified), color. Uses `combosStore.createCombo` / `combosStore.updateCombo`.

```vue
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

const form = reactive({
  name: '',
  icon: 'folder',
  color: '#00b26a',
  description: '',
})

const submitting = ref(false)

const presetColors = [
  '#00b26a', '#2196f3', '#ff9800', '#f44336', '#9c27b0',
  '#4caf50', '#00bcd4', '#ff5722', '#607d8b', '#e91e63',
]

const presetIcons = [
  'folder', 'bookmark', 'star', 'heart', 'flag',
  'edit', 'time', 'calendar', 'user', 'mail',
]

function resetForm() {
  form.name = ''
  form.icon = 'folder'
  form.color = '#00b26a'
  form.description = ''
}

function open() {
  if (props.combo) {
    form.name = props.combo.name
    form.icon = props.combo.icon || 'folder'
    form.color = props.combo.color || '#00b26a'
    form.description = props.combo.description || ''
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
      await combosStore.createCombo({ ...form })
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
```

- [ ] **Step 2: Commit**

```bash
git add website/src/components/combo/ComboForm.vue
git commit -m "feat(web): add ComboForm dialog for create/edit combo"
```

---

### Task 3: Create TagFilter component

**Files:**
- Create: `website/src/components/tag/TagFilter.vue`

- [ ] **Step 1: Ensure directory exists**

```bash
mkdir -p "E:\WechatDevelop\TimeGreen Path Todo\website\src\components\tag"
```

- [ ] **Step 2: Write TagFilter.vue**

Shows all tags as clickable chips. Selected tags are highlighted. Supports multi-select filtering. Uses `useTagsStore`.

```vue
<script setup lang="ts">
import { onMounted } from 'vue'
import { useTagsStore } from '@/stores/tags'

const tagsStore = useTagsStore()

onMounted(() => {
  if (tagsStore.items.length === 0) {
    tagsStore.fetchTags()
  }
})
</script>

<template>
  <div class="tag-filter">
    <div class="panel-header">
      <span class="panel-title">标签</span>
    </div>

    <t-loading v-if="tagsStore.loading" :loading="true" size="small" />

    <div class="tag-list">
      <div
        v-for="tag in tagsStore.items"
        :key="tag.id"
        class="tag-chip"
        :class="{ active: tagsStore.selectedIds.includes(tag.id) }"
        :style="{
          '--tag-color': tag.color,
          '--tag-bg': tag.color + '1a',
        }"
        @click="tagsStore.toggleTag(tag.id)"
      >
        <t-icon v-if="tagsStore.selectedIds.includes(tag.id)" name="check" size="14px" />
        <span class="tag-name">{{ tag.name }}</span>
      </div>
    </div>

    <div v-if="!tagsStore.loading && tagsStore.items.length === 0" class="empty-hint">
      暂无标签
    </div>
  </div>
</template>

<style scoped>
.tag-filter {
  padding: var(--spacing-sm) 0;
}

.panel-header {
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

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
  padding: 0 var(--spacing-sm);
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: var(--font-size-xs);
  color: var(--tag-color);
  background: var(--tag-bg);
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s;
  white-space: nowrap;
}

.tag-chip:hover {
  opacity: 0.8;
}

.tag-chip.active {
  background: var(--tag-color);
  color: #ffffff;
  border-color: var(--tag-color);
}

.tag-name {
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.empty-hint {
  padding: var(--spacing-md);
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--text-disabled);
}
</style>
```

- [ ] **Step 3: Commit**

```bash
git add website/src/components/tag/TagFilter.vue
git commit -m "feat(web): add TagFilter component with multi-select"
```

---

### Task 4: Create TagForm dialog

**Files:**
- Create: `website/src/components/tag/TagForm.vue`

- [ ] **Step 1: Write TagForm.vue**

Simple dialog to create/edit a tag. Fields: name, color (preset colors picker). Uses `tagsStore`.

```vue
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
```

- [ ] **Step 2: Commit**

```bash
git add website/src/components/tag/TagForm.vue
git commit -m "feat(web): add TagForm dialog for create/edit tag"
```

---

### Task 5: Create TodoItem component

**Files:**
- Create: `website/src/components/todo/TodoItem.vue`

- [ ] **Step 1: Ensure directory exists**

```bash
mkdir -p "E:\WechatDevelop\TimeGreen Path Todo\website\src\components\todo"
```

- [ ] **Step 2: Write TodoItem.vue**

Shows a single todo item with checkbox (toggle complete), star toggle, text content, tags, and date info. Actions: checkbox → toggleComplete (optimistic), star → toggleStar (optimistic), delete → Popconfirm. Tags display inline as colored dots/chips.

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTodosStore } from '@/stores/todos'
import { useTagsStore } from '@/stores/tags'
import type { Todo } from '@/types'

const props = defineProps<{
  todo: Todo
}>()

const router = useRouter()
const todosStore = useTodosStore()
const tagsStore = useTagsStore()

const completed = computed(() => props.todo.completed === 1)
const starred = computed(() => props.todo.isStar === 1)

// 解析标签 JSON
const tagIds = computed<number[]>(() => {
  if (!props.todo.tags) return []
  try {
    return JSON.parse(props.todo.tags) as number[]
  } catch {
    return []
  }
})

const tagItems = computed(() => {
  return tagIds.value
    .map((id) => tagsStore.items.find((t) => t.id === id))
    .filter(Boolean)
})

const hasDate = computed(() => !!props.todo.setDate)

function handleToggleComplete() {
  todosStore.toggleComplete(props.todo.id)
}

function handleToggleStar() {
  todosStore.toggleStar(props.todo.id)
}

function handleDelete() {
  todosStore.deleteTodo(props.todo.id)
}

function goDetail() {
  router.push(`/todos/${props.todo.id}`)
}
</script>

<template>
  <div class="todo-item" :class="{ completed }">
    <!-- 复选框 -->
    <label class="todo-checkbox" @click.stop="handleToggleComplete">
      <t-icon
        :name="completed ? 'check-circle-filled' : 'circle'"
        :color="completed ? 'var(--color-success)' : 'var(--text-disabled)'"
        size="20px"
        class="checkbox-icon"
      />
    </label>

    <!-- 主内容 -->
    <div class="todo-body" @click="goDetail">
      <div class="todo-text">
        <span class="text-content">{{ todo.text }}</span>
        <t-icon
          v-if="starred"
          name="star-filled"
          size="14px"
          color="#ff9800"
          class="star-icon"
          @click.stop="handleToggleStar"
        />
      </div>

      <div class="todo-meta">
        <div v-if="tagItems.length" class="todo-tags">
          <span
            v-for="tag in tagItems"
            :key="tag!.id"
            class="todo-tag-dot"
            :style="{ background: tag!.color }"
          />
        </div>
        <span v-if="hasDate" class="todo-date">{{ todo.setDate }}</span>
      </div>
    </div>

    <!-- 操作 -->
    <div class="todo-actions">
      <t-tooltip :content="starred ? '取消星标' : '星标'">
        <t-icon
          :name="starred ? 'star-filled' : 'star'"
          :color="starred ? '#ff9800' : undefined"
          size="16px"
          class="action-btn"
          @click.stop="handleToggleStar"
        />
      </t-tooltip>
      <t-popconfirm content="确定删除此待办？" @confirm="handleDelete">
        <t-icon name="delete" size="16px" class="action-btn danger" />
      </t-popconfirm>
    </div>
  </div>
</template>

<style scoped>
.todo-item {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--border-radius);
  transition: background 0.15s;
}

.todo-item:hover {
  background: var(--bg-hover);
}

.todo-checkbox {
  flex-shrink: 0;
  margin-top: 2px;
  cursor: pointer;
  line-height: 0;
}

.checkbox-icon {
  transition: color 0.15s;
}

.todo-body {
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.todo-text {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-base);
  color: var(--text-primary);
  line-height: 1.5;
}

.completed .text-content {
  text-decoration: line-through;
  color: var(--text-disabled);
}

.star-icon {
  flex-shrink: 0;
  cursor: pointer;
}

.todo-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-top: 2px;
}

.todo-tags {
  display: flex;
  align-items: center;
  gap: 3px;
}

.todo-tag-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.todo-date {
  font-size: var(--font-size-xs);
  color: var(--text-disabled);
}

.todo-actions {
  display: none;
  flex-shrink: 0;
  align-items: center;
  gap: var(--spacing-xs);
  margin-top: 2px;
}

.todo-item:hover .todo-actions {
  display: flex;
}

.action-btn {
  cursor: pointer;
  color: var(--text-secondary);
  padding: 2px;
  border-radius: 4px;
  transition: color 0.15s, background 0.15s;
}

.action-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.action-btn.danger:hover {
  color: var(--color-error);
}
</style>
```

- [ ] **Step 3: Commit**

```bash
git add website/src/components/todo/TodoItem.vue
git commit -m "feat(web): add TodoItem component with complete/star/delete"
```

---

### Task 6: Create TodoQuickAdd component

**Files:**
- Create: `website/src/components/todo/TodoQuickAdd.vue`

- [ ] **Step 1: Write TodoQuickAdd.vue**

An inline input with send/circle button. On enter, creates a new todo with plain text (no date/tags — that's for the full form). Emits `created` event.

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useTodosStore } from '@/stores/todos'
import { useCombosStore } from '@/stores/combos'
import { MessagePlugin } from 'tdesign-vue-next'

const todosStore = useTodosStore()
const combosStore = useCombosStore()

const text = ref('')
const submitting = ref(false)

async function handleSubmit() {
  const trimmed = text.value.trim()
  if (!trimmed) return

  submitting.value = true
  try {
    await todosStore.createTodo({
      text: trimmed,
      comboId: combosStore.selectedId ?? undefined,
    })
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
```

- [ ] **Step 2: Commit**

```bash
git add website/src/components/todo/TodoQuickAdd.vue
git commit -m "feat(web): add TodoQuickAdd inline creation component"
```

---

### Task 7: Create TodoForm page

**Files:**
- Create: `website/src/components/todo/TodoForm.vue` (used as a routed page)

- [ ] **Step 1: Write TodoForm.vue**

Full form for creating/editing a todo. Fields: text (required), setDate (DatePicker), setTime (TimePicker), tags (multi-select from tagsStore), combo (Select from combosStore), remarks (Textarea). Route is `/todos/add` for create, `/todos/:id/edit` for edit.

```vue
<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTodosStore } from '@/stores/todos'
import { useTagsStore } from '@/stores/tags'
import { useCombosStore } from '@/stores/combos'
import { MessagePlugin } from 'tdesign-vue-next'
import GlassPanel from '@/components/common/GlassPanel.vue'

const route = useRoute()
const router = useRouter()
const todosStore = useTodosStore()
const tagsStore = useTagsStore()
const combosStore = useCombosStore()

const isEdit = !!route.params.id
const submitting = ref(false)
const loading = ref(false)

const form = reactive({
  text: '',
  setDate: '',
  setTime: '',
  remarks: '',
  tags: [] as number[],
  comboId: undefined as number | undefined,
})

onMounted(async () => {
  await Promise.all([
    tagsStore.items.length === 0 ? tagsStore.fetchTags() : Promise.resolve(),
    combosStore.items.length === 0 ? combosStore.fetchCombos() : Promise.resolve(),
  ])

  if (isEdit) {
    loading.value = true
    try {
      const res = await todosStore.fetchTodoById(Number(route.params.id))
      if (res) {
        form.text = res.text
        form.setDate = res.setDate || ''
        form.setTime = res.setTime || ''
        form.remarks = res.remarks || ''
        form.comboId = res.comboId || undefined
        if (res.tags) {
          try { form.tags = JSON.parse(res.tags) as number[] } catch { form.tags = [] }
        }
      }
    } finally {
      loading.value = false
    }
  }
})

async function handleSubmit() {
  if (!form.text.trim()) {
    MessagePlugin.warning('请输入待办内容')
    return
  }

  submitting.value = true
  try {
    const payload = {
      text: form.text.trim(),
      setDate: form.setDate || undefined,
      setTime: form.setTime || undefined,
      remarks: form.remarks || undefined,
      tags: form.tags.length ? JSON.stringify(form.tags) : undefined,
      comboId: form.comboId,
    }

    if (isEdit) {
      await todosStore.updateTodo(Number(route.params.id), payload)
      MessagePlugin.success('已更新')
    } else {
      await todosStore.createTodo(payload)
      MessagePlugin.success('已创建')
    }
    router.push('/')
  } catch {
    MessagePlugin.error('操作失败')
  } finally {
    submitting.value = false
  }
}

function goBack() {
  router.back()
}
</script>

<template>
  <div class="todo-form-page">
    <GlassPanel class="form-card">
      <div class="form-header">
        <t-button variant="text" @click="goBack">
          <template #icon><t-icon name="arrow-left" /></template>
          返回
        </t-button>
        <h2 class="form-title">{{ isEdit ? '编辑待办' : '新建待办' }}</h2>
      </div>

      <t-loading v-if="isEdit && loading" :loading="true" size="large" />

      <t-form v-else :data="form" layout="vertical" class="todo-form">
        <t-form-item label="内容" name="text">
          <t-textarea v-model="form.text" placeholder="待办内容" :maxlength="200" :rows="3" />
        </t-form-item>

        <div class="form-row">
          <t-form-item label="日期" class="form-half">
            <t-date-picker v-model="form.setDate" placeholder="选择日期" clearable />
          </t-form-item>
          <t-form-item label="时间" class="form-half">
            <t-time-picker v-model="form.setTime" placeholder="选择时间" clearable />
          </t-form-item>
        </div>

        <t-form-item label="标签">
          <t-select
            v-model="form.tags"
            :options="tagsStore.items.map(t => ({ label: t.name, value: t.id }))"
            placeholder="选择标签"
            multiple
            clearable
          />
        </t-form-item>

        <t-form-item label="组合">
          <t-select
            v-model="form.comboId"
            :options="[
              { label: '无', value: undefined },
              ...combosStore.items.map(c => ({ label: c.name, value: c.id })),
            ]"
            placeholder="选择组合"
            clearable
          />
        </t-form-item>

        <t-form-item label="备注">
          <t-textarea v-model="form.remarks" placeholder="备注信息" :maxlength="500" :rows="2" />
        </t-form-item>

        <div class="form-actions">
          <t-button theme="primary" :loading="submitting" @click="handleSubmit">
            {{ isEdit ? '保存修改' : '创建待办' }}
          </t-button>
          <t-button variant="outline" @click="goBack">取消</t-button>
        </div>
      </t-form>
    </GlassPanel>
  </div>
</template>

<style scoped>
.todo-form-page {
  max-width: 600px;
  margin: 0 auto;
  padding: var(--spacing-lg) 0;
}

.form-card {
  padding: var(--spacing-lg);
}

.form-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-lg);
}

.form-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
}

.todo-form {
  margin-top: var(--spacing-md);
}

.form-row {
  display: flex;
  gap: var(--spacing-md);
}

.form-half {
  flex: 1;
}

.form-actions {
  display: flex;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-lg);
}
</style>
```

Note: `TodoForm.vue` calls `todosStore.fetchTodoById(id)` — this method doesn't exist yet. Add it first.

- [ ] **Step 2 (prerequisite): Add `fetchTodoById` to todosStore**

Read `E:\WechatDevelop\TimeGreen Path Todo\website\src\stores\todos.ts` and add:

```ts
  async function fetchTodoById(id: number): Promise<Todo | null> {
    try {
      const res = await todosApi.getById(id)
      if (res.success && res.data) return res.data
      return null
    } catch {
      return null
    }
  }
```

Add to the return block:
```ts
    fetchTodoById,
```

- [ ] **Step 3: Commit**

```bash
git add website/src/components/todo/TodoForm.vue website/src/stores/todos.ts
git commit -m "feat(web): add TodoForm page with full create/edit form"
```

---

### Task 8: Create TodoDetail page

**Files:**
- Create: `website/src/components/todo/TodoDetail.vue` (used as a routed page)

- [ ] **Step 1: Write TodoDetail.vue**

Shows full todo details: text, date/time, tags, combo, remarks, star status. Action buttons: edit, delete (with confirm), star toggle. Uses `todosStore.fetchTodoById`.

```vue
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTodosStore } from '@/stores/todos'
import { useTagsStore } from '@/stores/tags'
import { useCombosStore } from '@/stores/combos'
import { MessagePlugin } from 'tdesign-vue-next'
import GlassPanel from '@/components/common/GlassPanel.vue'
import type { Todo } from '@/types'

const route = useRoute()
const router = useRouter()
const todosStore = useTodosStore()
const tagsStore = useTagsStore()
const combosStore = useCombosStore()

const todo = ref<Todo | null>(null)
const loading = ref(true)

onMounted(async () => {
  const id = Number(route.params.id)
  if (!id) {
    router.push('/not-found')
    return
  }

  try {
    const result = await todosStore.fetchTodoById(id)
    if (result) {
      todo.value = result
    } else {
      router.push('/not-found')
    }
  } finally {
    loading.value = false
  }
})

const tagIds = computed<number[]>(() => {
  if (!todo.value?.tags) return []
  try { return JSON.parse(todo.value.tags) as number[] } catch { return [] }
})

const tagItems = computed(() => {
  return tagIds.value
    .map((id) => tagsStore.items.find((t) => t.id === id))
    .filter(Boolean)
})

const comboName = computed(() => {
  if (!todo.value?.comboId) return ''
  const c = combosStore.items.find((c) => c.id === todo.value!.comboId)
  return c?.name || ''
})

async function handleDelete() {
  if (!todo.value) return
  try {
    await todosStore.deleteTodo(todo.value.id)
    MessagePlugin.success('已删除')
    router.push('/')
  } catch {
    MessagePlugin.error('删除失败')
  }
}

function goEdit() {
  router.push(`/todos/${route.params.id}/edit`)
}

function goBack() {
  router.back()
}
</script>

<template>
  <div class="detail-page">
    <GlassPanel v-if="loading" class="detail-card">
      <t-loading :loading="true" size="large" />
    </GlassPanel>

    <GlassPanel v-else-if="todo" class="detail-card">
      <!-- 头部 -->
      <div class="detail-header">
        <t-button variant="text" @click="goBack">
          <template #icon><t-icon name="arrow-left" /></template>
          返回
        </t-button>
        <div class="header-actions">
          <t-button variant="outline" size="small" @click="goEdit">
            <template #icon><t-icon name="edit" /></template>
            编辑
          </t-button>
          <t-popconfirm content="确定删除此待办？" @confirm="handleDelete">
            <t-button variant="outline" size="small" theme="danger">
              <template #icon><t-icon name="delete" /></template>
              删除
            </t-button>
          </t-popconfirm>
        </div>
      </div>

      <!-- 正文 -->
      <div class="detail-body">
        <div class="detail-text">{{ todo.text }}</div>

        <div class="detail-info">
          <div v-if="todo.setDate" class="info-row">
            <t-icon name="calendar" size="16px" />
            <span>{{ todo.setDate }} {{ todo.setTime || '' }}</span>
          </div>

          <div v-if="tagItems.length" class="info-row">
            <t-icon name="tag" size="16px" />
            <div class="tag-list">
              <t-tag
                v-for="tag in tagItems"
                :key="tag!.id"
                :color="tag!.color"
                size="small"
              >{{ tag!.name }}</t-tag>
            </div>
          </div>

          <div v-if="comboName" class="info-row">
            <t-icon name="folder" size="16px" />
            <span>{{ comboName }}</span>
          </div>

          <div v-if="todo.remarks" class="info-row remarks">
            <t-icon name="file" size="16px" />
            <span>{{ todo.remarks }}</span>
          </div>
        </div>
      </div>

      <div class="detail-footer">
        <span class="meta-text">创建于 {{ todo.createdAt }}</span>
      </div>
    </GlassPanel>

    <GlassPanel v-else class="detail-card empty">
      <p>待办不存在</p>
    </GlassPanel>
  </div>
</template>

<style scoped>
.detail-page {
  max-width: 600px;
  margin: 0 auto;
  padding: var(--spacing-lg) 0;
}

.detail-card {
  padding: var(--spacing-lg);
  min-height: 200px;
}

.detail-card.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-lg);
}

.header-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.detail-body {
  padding: var(--spacing-md) 0;
}

.detail-text {
  font-size: var(--font-size-lg);
  color: var(--text-primary);
  line-height: 1.6;
  margin-bottom: var(--spacing-lg);
  white-space: pre-wrap;
  word-break: break-word;
}

.detail-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.info-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-base);
  color: var(--text-secondary);
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}

.info-row.remarks {
  align-items: flex-start;
}

.detail-footer {
  margin-top: var(--spacing-lg);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--border-color);
}

.meta-text {
  font-size: var(--font-size-xs);
  color: var(--text-disabled);
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add website/src/components/todo/TodoDetail.vue
git commit -m "feat(web): add TodoDetail page with display and actions"
```

---

### Task 9: Update router with real components

**Files:**
- Modify: `website/src/router/index.ts` — replace placeholder lazy imports for `/todos/add`, `/todos/:id`, `/todos/:id/edit`

- [ ] **Step 1: Edit router to use real component paths**

Read the current router file, then edit the route definitions:

Old (placeholders):
```ts
    {
      path: '/todos/add',
      name: 'TodoAdd',
      component: () => import('@/views/TodoView.vue'), // Phase 3: 替换为 TodoForm
      meta: { requiresAuth: true },
    },
    {
      path: '/todos/:id',
      name: 'TodoDetail',
      component: () => import('@/views/TodoView.vue'), // Phase 3: 替换为 TodoDetail
      meta: { requiresAuth: true },
    },
    {
      path: '/todos/:id/edit',
      name: 'TodoEdit',
      component: () => import('@/views/TodoView.vue'), // Phase 3: 替换为 TodoForm
      meta: { requiresAuth: true },
    },
```

New:
```ts
    {
      path: '/todos/add',
      name: 'TodoAdd',
      component: () => import('@/components/todo/TodoForm.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/todos/:id',
      name: 'TodoDetail',
      component: () => import('@/components/todo/TodoDetail.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/todos/:id/edit',
      name: 'TodoEdit',
      component: () => import('@/components/todo/TodoForm.vue'),
      meta: { requiresAuth: true },
    },
```

- [ ] **Step 2: Commit**

```bash
git add website/src/router/index.ts
git commit -m "feat(web): update router to use real TodoForm/TodoDetail components"
```

---

### Task 10: Implement TodoView three-column layout

**Files:**
- Overwrite: `website/src/views/TodoView.vue`
- Modify: `website/src/components/layout/AppHeader.vue` — wire search to todosStore filter

- [ ] **Step 1: Write TodoView.vue**

Three-column layout: left (ComboTree + TagFilter), center (TodoQuickAdd + TodoItem list), right reserved (optional). Uses stores for data binding.

```vue
<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useTodosStore } from '@/stores/todos'
import { useCombosStore } from '@/stores/combos'
import { useTagsStore } from '@/stores/tags'
import GlassPanel from '@/components/common/GlassPanel.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ComboTree from '@/components/combo/ComboTree.vue'
import TagFilter from '@/components/tag/TagFilter.vue'
import TodoQuickAdd from '@/components/todo/TodoQuickAdd.vue'
import TodoItem from '@/components/todo/TodoItem.vue'

const todosStore = useTodosStore()
const combosStore = useCombosStore()
const tagsStore = useTagsStore()

onMounted(() => {
  todosStore.fetchTodos()
})

// Re-fetch when filter changes
watch(
  () => combosStore.selectedId,
  () => {
    todosStore.filter.comboId = combosStore.selectedId
    todosStore.fetchTodos()
  },
)

watch(
  () => tagsStore.selectedIds,
  () => {
    todosStore.filter.tagIds = [...tagsStore.selectedIds]
    todosStore.fetchTodos()
  },
  { deep: true },
)
</script>

<template>
  <div class="todo-view">
    <!-- 左侧面板：组合 + 标签 -->
    <aside class="todo-sidebar">
      <GlassPanel class="sidebar-panel">
        <ComboTree />
        <div class="panel-divider" />
        <TagFilter />
      </GlassPanel>
    </aside>

    <!-- 主区域 -->
    <main class="todo-main">
      <!-- 快速添加 -->
      <TodoQuickAdd class="quick-add-section" />

      <!-- 待办列表 -->
      <div class="todo-list-section">
        <t-loading v-if="todosStore.loading" :loading="true" size="large" />

        <EmptyState
          v-else-if="todosStore.items.length === 0"
          icon="check"
          title="暂无待办"
          description="在上方输入框添加新待办"
        />

        <div v-else class="todo-list">
          <TodoItem
            v-for="todo in todosStore.items"
            :key="todo.id"
            :todo="todo"
          />
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.todo-view {
  display: flex;
  gap: var(--spacing-lg);
  height: 100%;
}

.todo-sidebar {
  width: var(--tag-panel-width);
  flex-shrink: 0;
}

.sidebar-panel {
  padding: var(--spacing-sm);
}

.panel-divider {
  height: 1px;
  background: var(--border-color);
  margin: var(--spacing-sm) 0;
}

.todo-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.quick-add-section {
  flex-shrink: 0;
}

.todo-list-section {
  flex: 1;
  overflow-y: auto;
}

.todo-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

/* 响应式 */
@media (max-width: 767px) {
  .todo-sidebar {
    display: none;
  }
}
</style>
```

- [ ] **Step 2: Wire search in AppHeader**

Read `E:\WechatDevelop\TimeGreen Path Todo\website\src\components\layout\AppHeader.vue` and add:

After the script setup block a search input:

```vue
<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { useTodosStore } from '@/stores/todos'
import { ref } from 'vue'

const authStore = useAuthStore()
const router = useRouter()
const todosStore = useTodosStore()

const searchText = ref('')

function handleSearch() {
  todosStore.filter.search = searchText.value
  todosStore.fetchTodos()
}

function clearSearch() {
  searchText.value = ''
  todosStore.filter.search = ''
  todosStore.fetchTodos()
}
</script>

<template>
  <header class="app-header">
    <div class="header-left">
      <t-input
        v-model="searchText"
        placeholder="搜索待办..."
        size="medium"
        class="search-input"
        @keyup.enter="handleSearch"
        @suffix-icon-click="clearSearch"
      >
        <template #suffix-icon>
          <t-icon :name="searchText ? 'close-circle' : 'search'" size="16px" />
        </template>
      </t-input>
    </div>
    <div class="header-right">
      <t-avatar
        v-if="authStore.user"
        :image="authStore.user.avatarUrl"
        :alt="authStore.user.nickname"
        size="32px"
        class="user-avatar"
        @click="router.push('/user-center')"
      />
    </div>
  </header>
</template>

<style scoped>
.app-header {
  height: var(--header-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--spacing-lg);
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-card);
}

.header-left {
  flex: 1;
  max-width: 400px;
}

.search-input {
  width: 100%;
}

.header-right {
  display: flex;
  align-items: center;
}

.user-avatar {
  cursor: pointer;
}
</style>
```

- [ ] **Step 3: Build and verify**

```bash
cd "E:\WechatDevelop\TimeGreen Path Todo\website"
npx vite build 2>&1 | tail -15
```

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add website/src/views/TodoView.vue website/src/components/layout/AppHeader.vue
git commit -m "feat(web): implement TodoView three-column layout with search"
```

---

### Self-Review

**Spec coverage check:**

| Spec Section | Component/Task |
|---|---|
| 8.1 TodoView (ComboTree + TagFilter + TodoQuickAdd + TodoItem) | Task 10 (TodoView layout) |
| 8.2 ComboTree — loading/empty/error | Task 1 (ComboTree) |
| 8.2 TagFilter — loading/empty/error | Task 3 (TagFilter) |
| 8.2 TodoItem — complete/star/delete with optimistic update | Task 5 (TodoItem) |
| 8.2 QrCodeLogin (not in Phase 3) | Phase 2 |
| 13.3 Error handling (try-catch pattern) | All tasks |
| 13.4 Optimistic update (toggleComplete/fillStar) | Task 5 (via store) |
| 10.3 Responsive breakpoints (sidebar hidden on mobile) | Task 10 |
| 7.1 Route: `/` → TodoView | Phase 1 |
| 7.1 Route: `/todos/add` → TodoForm | Task 9 |
| 7.1 Route: `/todos/:id` → TodoDetail | Task 9 |
| 7.1 Route: `/todos/:id/edit` → TodoForm | Task 9 |
| 11.2 todosStore.fetchTodoById | Task 7 (prerequisite) |
| 8.3 TDesign components (Tag, DatePicker, etc.) | All tasks |
| ComboForm dialog | Task 2 |
| TagForm dialog | Task 4 |
| AppHeader search integration | Task 10 |

**Placeholder scan:** No TODOs, TBDs, or stubs remain. All components are fully implemented.

**Type consistency:**
- All component imports reference existing files (ComboTree from `@/components/combo/ComboTree.vue`, etc.)
- All store methods match existing signatures (`useCombosStore().selectCombo(id)`, `useTodosStore().toggleComplete(id)`, etc.)
- `Todo.tags` is a string (JSON-encoded), components correctly `JSON.parse()` it to get tag IDs
- `Todo.completed` and `Todo.isStar` are `number` (0/1), not boolean — components use `=== 1` comparison
- All API modules return `ApiResponse<T>` — stores correctly access `.success` and `.data`
- `todosStore.fetchTodoById` is added as a prerequisite in Task 7 — not present but needed for TodoForm and TodoDetail

---

**Plan complete and saved.** Two execution options:

1. **Subagent-Driven (recommended)** — dispatch a subagent per task, review between tasks

2. **Inline Execution** — execute tasks in this session, batch with checkpoints

Which approach? Same subagent-driven pattern?
