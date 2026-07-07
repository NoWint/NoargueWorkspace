<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
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

const isEdit = computed(() => !!route.params.id)
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
