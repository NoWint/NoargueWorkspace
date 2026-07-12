<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useTagsStore } from '@/stores/tags'
import { MessagePlugin } from 'tdesign-vue-next'
import TagForm from '@/components/tag/TagForm.vue'
import Skeleton from '@/components/common/Skeleton.vue'
import type { Tag } from '@/types'

const tagsStore = useTagsStore()

const showForm = ref(false)
const editingTag = ref<Tag | null>(null)

onMounted(() => {
  if (tagsStore.items.length === 0) {
    tagsStore.fetchTags()
  }
})

function openCreate() {
  editingTag.value = null
  showForm.value = true
}

function openEdit(tag: Tag) {
  editingTag.value = tag
  showForm.value = true
}

async function deleteTag(tag: Tag) {
  try {
    await tagsStore.deleteTag(tag.id)
    MessagePlugin.success('标签已删除')
  } catch {
    MessagePlugin.error('删除失败')
  }
}
</script>

<template>
  <div class="tag-filter">
    <div class="panel-header">
      <span class="panel-title">标签</span>
      <t-button
        variant="text"
        shape="square"
        class="header-add-btn"
        title="新建标签"
        @click="openCreate"
      >
        <t-icon name="add" size="18px" />
      </t-button>
    </div>

    <Skeleton v-if="tagsStore.loading" type="text" :count="4" />

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
        <div v-if="!tag.isSystem" class="tag-actions">
          <t-button
            variant="text"
            shape="square"
            size="small"
            class="tag-action-btn"
            title="编辑"
            @click.stop="openEdit(tag)"
          >
            <t-icon name="edit" size="12px" />
          </t-button>
          <t-popconfirm attach="body" content="确定删除此标签？" @confirm.stop="deleteTag(tag)">
            <t-button
              variant="text"
              shape="square"
              size="small"
              class="tag-action-btn"
              title="删除"
              @click.stop
            >
              <t-icon name="delete" size="12px" />
            </t-button>
          </t-popconfirm>
        </div>
        <span v-else class="system-tag-mark">系统</span>
      </div>
    </div>

    <div v-if="!tagsStore.loading && tagsStore.items.length === 0" class="empty-hint">
      暂无标签
    </div>

    <TagForm v-model:visible="showForm" :tag="editingTag" @saved="tagsStore.fetchTags()" />
  </div>
</template>

<style scoped>
.tag-filter {
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

.tag-actions {
  display: none;
  align-items: center;
  gap: 2px;
  margin-left: 2px;
  flex-shrink: 0;
}

.tag-chip:hover .tag-actions {
  display: inline-flex;
}

.tag-action-btn {
  color: inherit;
  opacity: 0.6;
  transition: opacity 0.15s;
}

.tag-action-btn:hover {
  opacity: 1;
}

.system-tag-mark {
  font-size: 10px;
  color: var(--text-disabled);
  margin-left: 2px;
  flex-shrink: 0;
}

.empty-hint {
  padding: var(--spacing-md);
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--text-disabled);
}
</style>
