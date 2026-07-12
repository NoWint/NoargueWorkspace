<script setup lang="ts">
import QrCodeLogin from '@/components/auth/QrCodeLogin.vue'
import GlassPanel from '@/components/common/GlassPanel.vue'
</script>

<template>
  <div class="login-view">
    <GlassPanel class="login-card">
      <div class="login-header">
        <div class="login-logo-placeholder">
          <span class="login-logo-text">TG</span>
        </div>
        <h1 class="login-title">时光绿径待办</h1>
        <p class="login-desc">扫码登录，跨端同步</p>
      </div>

      <QrCodeLogin />

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

.login-logo-placeholder {
  width: 64px;
  height: 64px;
  border-radius: var(--border-radius-lg);
  margin-bottom: var(--spacing-sm);
  background: linear-gradient(135deg, var(--color-primary), #008f55);
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-logo-text {
  color: #ffffff;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 1px;
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

[data-theme='dark'] .login-view {
  background: var(--bg-page);
}
</style>
