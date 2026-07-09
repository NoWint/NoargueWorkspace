<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTodosStore } from '@/stores/todos'
import { useTagsStore } from '@/stores/tags'
import { useCombosStore } from '@/stores/combos'
import { MessagePlugin } from 'tdesign-vue-next'
import GlassPanel from '@/components/common/GlassPanel.vue'
import { uploadApi } from '@/upload'

const route = useRoute()
const router = useRouter()
const todosStore = useTodosStore()
const tagsStore = useTagsStore()
const combosStore = useCombosStore()

const isEdit = computed(() => route.name === 'TodoEdit')
const submitting = ref(false)
const loading = ref(false)
const uploading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const priorityOptions = [
  { value: 'p1', label: '紧急重要', desc: '马上做', color: '#e34d59' },
  { value: 'p2', label: '重要不紧急', desc: '计划做', color: '#2196F3' },
  { value: 'p3', label: '紧急不重要', desc: '快速处理', color: '#ff9800' },
  { value: 'p4', label: '不紧急不重要', desc: '可做可不做', color: '#999' },
]

const form = reactive({
  text: '',
  setDate: '',
  setTime: '',
  priority: 'p2',
  locationText: '',
  tags: [] as number[],
  comboId: undefined as number | undefined,
  remarks: '',
  images: [] as string[],
})

const uploadFiles = ref<Array<{ url: string; name: string; status: string }>>([])

onMounted(async () => {
  await Promise.all([
    tagsStore.items.length === 0 ? tagsStore.fetchTags() : Promise.resolve(),
    combosStore.items.length === 0 ? combosStore.fetchCombos() : Promise.resolve(),
  ])

  if (isEdit) {
    loading.value = true
    try {
      const res = await todosStore.fetchTodoById(route.params.id as string)
      if (res) {
        form.text = res.text
        form.setDate = res.setDate || ''
        form.setTime = res.setTime || ''
        form.priority = res.priority || 'p2'
        form.locationText = res.locationText || ''
        form.remarks = res.remarks || ''
        form.comboId = res.comboId || undefined
        form.tags = res.tags || []
        if (res.images?.length) {
          form.images = res.images
          uploadFiles.value = res.images.map((url: string) => ({
            url,
            name: url.split('/').pop() || 'image',
            status: 'done',
          }))
        }
      }
    } finally {
      loading.value = false
    }
  }

  // 快捷创建: 从查询参数读取预填充文本
  if (route.query.text) {
    form.text = route.query.text as string
  }
})

function triggerFileInput() {
  fileInput.value?.click()
}

function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files?.[0]) handleUpload(target.files[0])
  target.value = ''
}

async function handleUpload(file: File) {
  uploading.value = true
  try {
    const res = await uploadApi.uploadImage(file)
    if (res.success && res.url) {
      form.images.push(res.url)
      return res.url
    }
    MessagePlugin.error('上传失败')
    return ''
  } catch {
    MessagePlugin.error('上传失败')
    return ''
  } finally {
    uploading.value = false
  }
}

function handleRemoveImage(idx: number) {
  form.images.splice(idx, 1)
}

async function handleSubmit() {
  if (!form.text.trim()) {
    MessagePlugin.warning('请输入待办内容')
    return
  }
  if (!form.setDate) {
    MessagePlugin.warning('请选择日期')
    return
  }

  submitting.value = true
  try {
    const payload: Record<string, unknown> = {
      text: form.text.trim(),
      setDate: form.setDate,
      setTime: form.setTime || undefined,
      priority: form.priority,
      locationText: form.locationText || undefined,
      tagIds: form.tags,
      comboId: form.comboId || null,
      remarks: form.remarks || undefined,
      images: form.images.length ? form.images : undefined,
    }

    if (isEdit) {
      await todosStore.updateTodo(route.params.id as string, payload)
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
        <!-- 内容 -->
        <t-form-item label="内容" name="text">
          <t-textarea v-model="form.text" placeholder="待办内容" :maxlength="200" :rows="3" />
        </t-form-item>

        <!-- 日期+时间 -->
        <div class="form-row">
          <t-form-item label="日期" class="form-half">
            <t-date-picker v-model="form.setDate" placeholder="选择日期" clearable />
          </t-form-item>
          <t-form-item label="时间" class="form-half">
            <t-time-picker v-model="form.setTime" placeholder="选择时间" clearable />
          </t-form-item>
        </div>

        <!-- 优先等级 -->
        <t-form-item label="优先等级">
          <div class="priority-grid">
            <div
              v-for="opt in priorityOptions"
              :key="opt.value"
              class="priority-option"
              :class="{ active: form.priority === opt.value }"
              @click="form.priority = opt.value"
            >
              <span class="priority-dot" :style="{ background: opt.color }" />
              <div class="priority-text">
                <span class="priority-label">{{ opt.label }}</span>
                <span class="priority-desc">{{ opt.desc }}</span>
              </div>
            </div>
          </div>
        </t-form-item>

        <!-- 地点 -->
        <t-form-item label="地点">
          <t-input v-model="form.locationText" placeholder="添加地点" clearable>
            <template #prefix-icon><t-icon name="location" /></template>
          </t-input>
        </t-form-item>

        <!-- 标签 -->
        <t-form-item label="标签">
          <t-select
            v-model="form.tags"
            :options="tagsStore.items.map(t => ({ label: t.name, value: t.id }))"
            placeholder="选择标签"
            multiple
            clearable
          />
        </t-form-item>

        <!-- 组合 -->
        <t-form-item label="组合">
          <t-select
            v-model="form.comboId"
            :options="[
              { label: '无', value: undefined as any },
              ...combosStore.items.map(c => ({ label: c.name, value: c.id })),
            ]"
            placeholder="选择组合"
            clearable
          />
        </t-form-item>

        <!-- 附加图片 -->
        <t-form-item label="附加图片">
          <div class="image-upload-area">
            <div class="image-list">
              <div
                v-for="(img, idx) in form.images"
                :key="idx"
                class="image-preview"
              >
                <img :src="img" class="preview-img" alt="待办图片" />
                <t-icon
                  name="close"
                  class="image-remove"
                  size="16px"
                  @click="handleRemoveImage(idx)"
                />
              </div>
              <t-button
                variant="outline"
                class="upload-btn"
                :loading="uploading"
                @click="triggerFileInput"
              >
                <t-icon name="add" /> 添加图片
              </t-button>
            </div>
            <input
              ref="fileInput"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              class="file-input-hidden"
              @change="onFileChange"
            />
            <p class="image-upload-tip">
              图片由第三方图床托管，图片连续60天未访问将被自动清理
            </p>
          </div>
        </t-form-item>

        <!-- 备注 -->
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
  max-width: 720px;
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

/* 优先等级 2x2 网格 */
.priority-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-xs);
  width: 100%;
}

.priority-option {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: all 0.15s;
}

.priority-option:hover {
  border-color: var(--color-primary);
}

.priority-option.active {
  background: var(--color-primary-light, rgba(0, 178, 106, 0.1));
  border-color: var(--color-primary);
}

.priority-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.priority-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.priority-label {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--text-primary);
  line-height: 1.3;
}

.priority-desc {
  font-size: var(--font-size-xs);
  color: var(--text-disabled);
  line-height: 1.2;
}

/* 图片上传 */
.image-upload-area {
  width: 100%;
}

.image-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  align-items: flex-start;
}

.image-preview {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: var(--border-radius);
  overflow: hidden;
  border: 1px solid var(--border-color);
}

.preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-remove {
  position: absolute;
  top: 2px;
  right: 2px;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  border-radius: 50%;
  cursor: pointer;
}

.upload-btn {
  width: 80px;
  height: 80px;
  border: 1px dashed var(--border-color);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: var(--font-size-xs);
  color: var(--text-disabled);
}

.file-input-hidden {
  display: none;
}

.image-upload-tip {
  font-size: var(--font-size-xs);
  color: var(--text-disabled);
  margin-top: var(--spacing-xs);
  line-height: 1.5;
}

.form-actions {
  display: flex;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-lg);
}
</style>
