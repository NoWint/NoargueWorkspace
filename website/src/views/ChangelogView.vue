<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { configApi } from '@/api/config'
import type { Changelog } from '@/types'
import EmptyState from '@/components/common/EmptyState.vue'

const router = useRouter()
const changelogs = ref<Changelog[]>([])
const loading = ref(false)
const expandedIndex = ref<number | null>(null)

function toggleExpand(idx: number) {
  expandedIndex.value = expandedIndex.value === idx ? null : idx
}

onMounted(async () => {
  loading.value = true
  try {
    const res = await configApi.getChangelog()
    if (res.success) {
      changelogs.value = res.changelogList
    }
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="changelog-page">
    <div class="page-header">
      <t-button variant="text" @click="router.back()">
        <template #icon><t-icon name="arrow-left" /></template>
        返回
      </t-button>
      <h2 class="page-title">更新日志</h2>
    </div>

    <t-loading :loading="loading" size="large">
      <EmptyState
        v-if="!loading && changelogs.length === 0"
        icon="file"
        title="暂无更新日志"
      />

      <div v-else class="changelog-list">
        <div
          v-for="(log, idx) in changelogs"
          :key="idx"
          class="changelog-card"
          @click="toggleExpand(idx)"
        >
          <div class="changelog-header">
            <t-tag theme="primary" variant="light" size="small">v{{ log.version }}</t-tag>
            <span class="changelog-date">{{ log.date }}</span>
            <t-icon
              :name="expandedIndex === idx ? 'chevron-up' : 'chevron-down'"
              size="16px"
              color="var(--text-secondary)"
              class="expand-icon"
            />
          </div>
          <div v-if="expandedIndex === idx" class="changelog-content">
            <div v-for="(item, iidx) in log.content" :key="iidx" class="change-item">
              {{ item }}
            </div>
          </div>
        </div>
      </div>
    </t-loading>
  </div>
</template>

<style scoped>
.changelog-page {
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
.changelog-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}
.changelog-card {
  padding: var(--spacing-md);
  background: var(--bg-glass);
  border-radius: var(--border-radius);
  backdrop-filter: blur(var(--glass-blur));
  cursor: pointer;
  transition: box-shadow 0.2s;
}
.changelog-card:hover {
  box-shadow: var(--shadow-sm);
}
.changelog-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}
.changelog-date {
  flex: 1;
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}
.changelog-content {
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}
.change-item {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: 1.6;
  padding-left: var(--spacing-sm);
  border-left: 2px solid var(--color-primary-light);
}
</style>
