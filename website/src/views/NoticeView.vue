<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { configApi } from '@/api/config'
import type { Notice } from '@/types'
import EmptyState from '@/components/common/EmptyState.vue'

const router = useRouter()
const notices = ref<Notice[]>([])
const loading = ref(false)
const expandedIndex = ref<number | null>(null)

function toggleExpand(idx: number) {
  expandedIndex.value = expandedIndex.value === idx ? null : idx
}

onMounted(async () => {
  loading.value = true
  try {
    const res = await configApi.getNotices()
    if (res.success) {
      notices.value = res.notices
    }
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="notice-page">
    <div class="page-header">
      <t-button variant="text" @click="router.back()">
        <template #icon><t-icon name="arrow-left" /></template>
        返回
      </t-button>
      <h2 class="page-title">公告</h2>
    </div>

    <t-loading :loading="loading" size="large">
      <EmptyState
        v-if="!loading && notices.length === 0"
        icon="notification"
        title="暂无公告"
      />

      <div v-else class="notice-list">
        <div
          v-for="(notice, idx) in notices"
          :key="idx"
          class="notice-card"
          @click="toggleExpand(idx)"
        >
          <div class="notice-header">
            <t-icon name="notification" size="20px" color="var(--color-primary)" />
            <div class="notice-title-area">
              <span class="notice-title">{{ notice.title }}</span>
              <span v-if="notice.date" class="notice-date">{{ notice.date }}</span>
            </div>
            <t-icon
              :name="expandedIndex === idx ? 'chevron-up' : 'chevron-down'"
              size="16px"
              color="var(--text-secondary)"
            />
          </div>
          <div v-if="expandedIndex === idx" class="notice-content">
            {{ notice.content }}
          </div>
        </div>
      </div>
    </t-loading>
  </div>
</template>

<style scoped>
.notice-page {
  max-width: 600px;
  margin: 0 auto;
  padding: var(--spacing-lg) 0;
}
.page-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-lg);
}
.page-title {
  font-size: var(--font-size-xl);
  font-weight: 600;
}
.notice-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}
.notice-card {
  padding: var(--spacing-md);
  background: var(--bg-glass);
  border-radius: var(--border-radius);
  backdrop-filter: blur(var(--glass-blur));
  cursor: pointer;
  transition: box-shadow 0.2s;
}
.notice-card:hover {
  box-shadow: var(--shadow-sm);
}
.notice-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}
.notice-title-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.notice-title {
  font-size: var(--font-size-base);
  font-weight: 500;
  color: var(--text-primary);
}
.notice-date {
  font-size: var(--font-size-xs);
  color: var(--text-disabled);
}
.notice-content {
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--border-color);
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: 1.8;
  white-space: pre-wrap;
}
</style>
