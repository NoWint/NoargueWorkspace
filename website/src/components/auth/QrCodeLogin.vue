<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()

const qrImage = ref<string | null>(null)
const sceneId = ref<string | null>(null)
const statusText = ref('正在生成二维码...')
const loading = ref(true)
const expired = ref(false)
let stopPolling: (() => void) | null = null

async function generateAndPoll() {
  loading.value = true
  expired.value = false
  statusText.value = '正在生成二维码...'
  qrImage.value = null
  sceneId.value = null

  try {
    const data = await authStore.loginByQrCode()
    qrImage.value = data.qrcodeUrl
    sceneId.value = data.sceneId
    statusText.value = '请使用微信扫码'
    loading.value = false

    const { stop, promise } = authStore.pollQrCodeStatus(
      data.sceneId,
      (status) => {
        if (status === 'scanned') {
          statusText.value = '已扫描，请在手机上确认'
        }
      },
    )
    stopPolling = stop
    await promise
    router.push('/')
  } catch (err) {
    loading.value = false
    if ((err as Error).message === 'expired') {
      expired.value = true
      statusText.value = '二维码已过期'
    } else {
      statusText.value = '生成二维码失败，请重试'
    }
  }
}

async function refreshQr() {
  stopPolling?.()
  stopPolling = null
  await generateAndPoll()
}

onMounted(() => {
  generateAndPoll()
})

onUnmounted(() => {
  stopPolling?.()
})
</script>

<template>
  <div class="qr-login">
    <t-loading v-if="loading" :loading="true" size="large" class="qr-loading" />

    <template v-if="!loading">
      <div v-if="qrImage && !expired" class="qr-code-wrapper">
        <img :src="qrImage" alt="登录二维码" class="qr-code" />
      </div>

      <p v-if="!expired" class="qr-status">{{ statusText }}</p>

      <div v-if="statusText === '已扫描，请在手机上确认'" class="scanned-hint">
        <t-icon name="check-circle" size="24px" color="#00b26a" />
        <span>手机端确认后自动登录</span>
      </div>

      <div v-if="expired" class="expired-state">
        <t-icon name="expired" size="48px" color="#c9cdd4" />
        <p class="expired-text">二维码已过期</p>
        <t-button theme="primary" @click="refreshQr">重新生成</t-button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.qr-login {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
}

.qr-loading {
  min-height: 200px;
}

.qr-code-wrapper {
  width: 200px;
  height: 200px;
  padding: var(--spacing-sm);
  background: #ffffff;
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-md);
}

.qr-code {
  width: 100%;
  height: 100%;
  display: block;
}

.qr-status {
  font-size: var(--font-size-base);
  color: var(--text-secondary);
}

.scanned-hint {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  color: var(--color-primary);
  font-size: var(--font-size-base);
}

.expired-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
}

.expired-text {
  font-size: var(--font-size-base);
  color: var(--text-secondary);
}
</style>
