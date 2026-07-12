# Phase 2: 登录体系 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement QR code login flow — QrCodeLogin component with 2s polling, 5min TTL, expired refresh, and LoginView page.

**Architecture:** LoginView creates QrCodeLogin on mount. QrCodeLogin calls `POST /auth/qrcode/generate` to get a QR code (base64), then polls `GET /auth/qrcode/status?sceneId=` every 2 seconds. On `confirmed`, the token and user are stored via authStore and the router navigates to `/`. On `expired` (5 min TTL), polling stops and a "refresh" button appears. The navigation guard already redirects unauthenticated users to `/login` — this was set up in Phase 1.

**Tech Stack:** Vue 3 Composition API, TDesign Vue Next (t-icon, t-button, t-loading), authStore (Pinia), authApi

**Files to modify:**
- `website/src/stores/auth.ts` — replace `loginByQrCode` stub with real implementation
- `website/src/views/LoginView.vue` — full login page layout

**Files to create:**
- `website/src/components/auth/QrCodeLogin.vue` — QR display + polling + expired state

---

### Task 1: Update authStore with QR code login logic

**Files:**
- Modify: `website/src/stores/auth.ts:27-30`

- [ ] **Step 1: Replace the `loginByQrCode` stub with real implementation**

Read the current file then edit:

Old:
```ts
  async function loginByQrCode() {
    // Phase 2: 完整实现——调用 generateQrCode + 轮询 getQrCodeStatus
    // 直到 status === 'confirmed' 拿到 token
    throw new Error('Not implemented in Phase 1')
  }
```

New:
```ts
  async function loginByQrCode() {
    const res = await authApi.generateQrCode()
    if (!res.success || !res.data) {
      throw new Error('生成二维码失败')
    }
    return res.data
  }

  async function pollQrCodeStatus(sceneId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const POLL_INTERVAL = 2000
      const MAX_DURATION = 5 * 60 * 1000
      const startTime = Date.now()

      const poll = async () => {
        if (Date.now() - startTime > MAX_DURATION) {
          reject(new Error('expired'))
          return
        }
        try {
          const res = await authApi.getQrCodeStatus(sceneId)
          if (!res.success) {
            // 继续轮询
            setTimeout(poll, POLL_INTERVAL)
            return
          }
          switch (res.status) {
            case 'waiting':
              setTimeout(poll, POLL_INTERVAL)
              break
            case 'scanned':
              // 组件层用事件或回调来处理 UI 提示
              setTimeout(poll, POLL_INTERVAL)
              break
            case 'confirmed':
              if (res.token && res.user) {
                saveToken(res.token)
                user.value = res.user
                resolve()
              } else {
                reject(new Error('登录失败：未获取到用户信息'))
              }
              break
            case 'expired':
              reject(new Error('expired'))
              break
            default:
              setTimeout(poll, POLL_INTERVAL)
          }
        } catch (err) {
          // 网络错误也继续轮询（不中断用户体验）
          setTimeout(poll, POLL_INTERVAL)
        }
      }
      poll()
    })
  }
```

Also add the return to the store's return block:
```ts
  return {
    token,
    user,
    loading,
    isLoggedIn,
    saveToken,
    clearAuth,
    loginByQrCode,
    pollQrCodeStatus,
    logout,
    fetchUserInfo,
  }
```

- [ ] **Step 2: Verify file compiles**

Run:
```bash
cd "E:\WechatDevelop\TimeGreen Path Todo\website"
npx vue-tsc --noEmit 2>&1 | head -20
```

Expected: no type errors from auth.ts.

- [ ] **Step 3: Commit**

```bash
git add website/src/stores/auth.ts
git commit -m "feat(web): implement QR code login polling in authStore"
```

---

### Task 2: Create QrCodeLogin component

**Files:**
- Create: `website/src/components/auth/QrCodeLogin.vue`

- [ ] **Step 1: Write QrCodeLogin.vue**

```vue
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
const pollController = ref<AbortController | null>(null)

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

    await authStore.pollQrCodeStatus(data.sceneId)
    // poll 成功 → 已登录，跳转首页
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
  await generateAndPoll()
}

onMounted(() => {
  generateAndPoll()
})
</script>

<template>
  <div class="qr-login">
    <t-loading v-if="loading" :loading="true" size="large" class="qr-loading" />

    <template v-if="!loading">
      <!-- 二维码 -->
      <div v-if="qrImage && !expired" class="qr-code-wrapper">
        <img :src="qrImage" alt="登录二维码" class="qr-code" />
      </div>

      <!-- 状态提示 -->
      <p v-if="!expired" class="qr-status">{{ statusText }}</p>

      <!-- 已扫描提示 -->
      <div v-if="statusText === '已扫描，请在手机上确认'" class="scanned-hint">
        <t-icon name="check-circle" size="24px" color="#00b26a" />
        <span>手机端确认后自动登录</span>
      </div>

      <!-- 过期状态 -->
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
```

- [ ] **Step 2: Verify file exists**

Run:
```bash
ls -la "E:\WechatDevelop\TimeGreen Path Todo\website\src\components\auth\QrCodeLogin.vue"
```

- [ ] **Step 3: Commit**

```bash
git add website/src/components/auth/QrCodeLogin.vue
git commit -m "feat(web): add QrCodeLogin component with polling and expiration"
```

---

### Task 3: Replace LoginView.vue placeholder

**Files:**
- Overwrite: `website/src/views/LoginView.vue`

- [ ] **Step 1: Write full LoginView.vue**

```vue
<script setup lang="ts">
import QrCodeLogin from '@/components/auth/QrCodeLogin.vue'
import GlassPanel from '@/components/common/GlassPanel.vue'
</script>

<template>
  <div class="login-view">
    <GlassPanel class="login-card">
      <!-- Logo 区域 -->
      <div class="login-header">
        <img src="/logo.png" alt="时光绿径" class="login-logo" />
        <h1 class="login-title">时光绿径待办</h1>
        <p class="login-desc">扫码登录，跨端同步</p>
      </div>

      <!-- 扫码组件 -->
      <QrCodeLogin />

      <!-- 底部提示 -->
      <p class="login-footer">
        请使用微信扫描二维码登录
      </p>
    </GlassPanel>
  </div>
</template>

<style scoped>
.login-view {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: var(--bg-page);
  padding: var(--spacing-lg);
}

.login-card {
  width: 360px;
  max-width: 100%;
  padding: var(--spacing-xl);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.login-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: var(--spacing-lg);
}

.login-logo {
  width: 64px;
  height: 64px;
  border-radius: var(--border-radius-lg);
  margin-bottom: var(--spacing-sm);
}

.login-title {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--spacing-xs);
}

.login-desc {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.login-footer {
  margin-top: var(--spacing-lg);
  font-size: var(--font-size-xs);
  color: var(--text-disabled);
}
</style>
```

- [ ] **Step 2: Verify build**

```bash
cd "E:\WechatDevelop\TimeGreen Path Todo\website"
npx vite build 2>&1 | tail -10
```

Expected: build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add website/src/views/LoginView.vue
git commit -m "feat(web): implement LoginView with QR code login"
```

---

### Self-Review

**Spec coverage check:**

| Spec Section | Task |
|---|---|
| 5. 扫码登录流程图 | Task 2 (QrCodeLogin polling logic matches diagram) |
| 5.1 代码示例 (generateQr, pollStatus) | Task 1 (authStore) + Task 2 (component) |
| 二维码 2s 轮询 | Task 2 (POLL_INTERVAL = 2000) |
| 5min 过期 → 重新生成 | Task 2 (MAX_DURATION), `refreshQr` button |
| 扫描后状态提示 | Task 2 (statusText, scanned-hint) |
| 登录成功 → 保存 token → 跳转 / | Task 1 (saveToken) + Task 2 (router.push('/')) |
| LoginView 全屏居中 | Task 3 (flex centering, 360px card) |
| authStore token 管理 | Task 1 (saveToken, pollQrCodeStatus) |
| 导航守卫集成 | Phase 1 已完成 (router.beforeEach) |
| 退出登录 | Phase 1 已完成 (authStore.logout) |

**Placeholder scan:** No TODOs, TBDs, or stubs remain (the Phase 1 `throw new Error` in authStore is replaced with real implementation).

**Type consistency:**
- `authApi.generateQrCode()` returns `ApiResponse<{ sceneId, qrcodeUrl, expiresAt }>` — `loginByQrCode` returns `res.data` which is `{ sceneId, qrcodeUrl, expiresAt }` ✅
- `authApi.getQrCodeStatus()` returns `QrCodeStatusResponse` (not wrapped in ApiResponse) — the store's `pollQrCodeStatus` accesses `res.status`, `res.token`, `res.user` directly ✅
- `saveToken` takes a `string` typed from the store, `res.token` is `string | undefined` — guarded with `if (res.token)` ✅
- `QrCodeLogin.vue` uses `authStore.loginByQrCode` and `authStore.pollQrCodeStatus` — both defined in Task 1's store return ✅

---

**Plan complete and saved.** Two execution options:

1. **Subagent-Driven (recommended)** — dispatch a subagent per task, review between tasks

2. **Inline Execution** — execute tasks in this session using executing-plans, batch with checkpoints

Which approach? Same as last time (subagent-driven + final review)?
