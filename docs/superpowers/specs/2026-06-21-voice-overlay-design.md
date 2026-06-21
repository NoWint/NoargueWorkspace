# 语音识别遮罩动画设计

## 概述

为 todo 页的 mic FAB 按钮增加全屏黑色遮罩扩散/收缩动画，替代当前裸录音提示，提升语音交互的沉浸感和视觉品质。

## 交互流程

```
按下 FAB (mic)
  ├─ 检查麦克风权限（已有逻辑）
  ├─ 获取 FAB 中心坐标
  ├─ clip-path 圆圈从 FAB 中心 → 全屏扩散（~400ms）
  │   └─ 黑色遮罩出现，绿色波浪光晕渐入
  ├─ 中心显示 "正在聆听..."
  ├─ 开始录音（已有 manager.start）
  └─ onRecognize 回调实时更新遮罩中心文字

松手
  ├─ 停止录音（已有 manager.stop）
  ├─ clip-path 圆圈从全屏 → FAB 中心收缩（~300ms）
  │   └─ 绿色波浪光晕渐出
  └─ 动画结束后跳转 add-todo?voiceText=xxx
```

## 技术方案

### 遮罩实现：clip-path + CSS Transition

通过 `clip-path: circle()` 控制一个固定定位遮罩层的可见区域，圆心定位到 FAB 按钮中心坐标。

```css
/* 扩散状态 */
.voice-overlay.expand {
  clip-path: circle(200% at var(--cx) var(--cy));
  transition: clip-path 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* 收缩状态 */
.voice-overlay.collapse {
  clip-path: circle(0% at var(--cx) var(--cy));
  transition: clip-path 0.3s cubic-bezier(0.55, 0.085, 0.68, 0.53);
}
```

- **展开曲线** `cubic-bezier(0.34, 1.56, 0.64, 1)` — 弹性过冲效果
- **收缩曲线** `cubic-bezier(0.55, 0.085, 0.68, 0.53)` — 快速缓出
- 圆心 `--cx` `--cy` 在 touchStart 时通过 `wx.createSelectorQuery()` 获取 FAB 位置动态设置

### 波浪光晕：SVG path 动画 + radial-gradient

两层 SVG path 叠加 + 底部径向渐变光晕：

```svg
<path d="M0,25 Q15,5 30,25 T60,25 ..." fill="none" stroke="#00d68f" stroke-width="1.5" opacity="0.6">
  <animate attributeName="d" ... dur="2s" repeatCount="indefinite"/>
</path>
```

- 细线（透明度 0.6）做主波形，粗线（透明度 0.2）做变化层，模拟声波流动
- `radial-gradient(ellipse at center, rgba(0,214,143,0.2), transparent 70%)` 做底部发光晕散

### 实时识别文字

复用现有 `manager.onRecognize` 回调：

```js
manager.onRecognize = function (res) {
  that.setData({ voiceText: res.result });
};
```

遮罩层 `wx:if="{{isRecording}}"` 时显示，内容为 `{{voiceText || '正在聆听...'}}`

## 修改范围

仅需修改 todo 页面的三个文件：

### pages/todo/todo.wxml

在文件末尾（FAB 按钮之后）新增遮罩模板：

```xml
<!-- 语音识别遮罩 -->
<view wx:if="{{isRecording}}" class="voice-overlay" style="--cx:{{fabCx}}px;--cy:{{fabCy}}px;">
  <view class="voice-overlay-inner {{overlayPhase === 'expand' ? 'expand' : 'collapse'}}">
    <view class="voice-center">
      <text class="voice-hint">{{voiceText || '正在聆听...'}}</text>
    </view>
    <view class="voice-wave">
      <!-- SVG 波浪动画 -->
    </view>
    <view class="voice-glow"></view>
  </view>
</view>
```

### pages/todo/todo.wxss

新增样式：
- `.voice-overlay` — 全屏固定定位，z-index 高于一切，pointer-events
- `.voice-overlay-inner` — clip-path 动画
- `.voice-center` — 居中定位，flex 垂直水平
- `.voice-hint` — 白色文字，柔和阴影
- `.voice-wave` — SVG 波浪容器
- `.voice-glow` — 底部径向渐变光晕

### pages/todo/todo.js

新增/修改：

| 数据字段 | 说明 |
|---------|------|
| `isRecording` | 遮罩显隐控制 |
| `overlayPhase` | '' / 'expand' / 'collapse' |
| `fabCx` / `fabCy` | FAB 中心坐标 |
| `voiceText` | 实时识别文字 |

由于小程序 DOM 刚插入时 CSS transition 不会触发，采用**两阶段设置**模式：

```js
// 1. 先插入 DOM（无 phase 类，初始状态 clip-path: circle(0%)）
this.setData({ isRecording: true, overlayPhase: '' });

// 2. nextTick 后再加 expand 类触发 transition
setTimeout(() => {
  this.setData({ overlayPhase: 'expand' });
}, 50);

// 3. 收缩时同理，先设置为 '' 重置（不可见），再移除 DOM
this.setData({ overlayPhase: 'collapse' });
setTimeout(() => {
  this.setData({ isRecording: false });
}, 300); // 与收缩动画时长匹配
```

修改方法：
- `touchStart` — 检查权限 → 获取 FAB 位置 → 两阶段展开 → 调用 `manager.start`
- `touchEnd` — `manager.stop` → 触发 collapse → 动画结束后跳转
- `initRecord` 中的 `onRecognize` — 更新 `voiceText`

## 边界情况

| 场景 | 处理 |
|------|------|
| 按下后 < 200ms 松手 | 收缩动画正常执行，但不跳转 add-todo。实质是 '取消' 操作 |
| 识别结果为空 | 跳转 add-todo 时不带 voiceText 参数（现有兼容） |
| 遮罩中快速再次按下 | 不允许，isRecording 状态下 touchStart 直接 return |
| 麦克风权限未授权 | 弹窗引导（已有逻辑），不触发遮罩动画 |
| 遮罩期间页面滚动 | 遮罩 `position:fixed` 覆盖全屏，不影响滚动位置 |

## 性能考虑

- clip-path 动画使用 GPU 合成，对主线程无阻塞
- SVG 波浪仅 2 条 path + 1 个 animate 元素，动画开销可忽略
- 遮罩内容极少（一段文字 + SVG），避免引起重排
- 动画完成后通过 `wx:if` 彻底移除遮罩 DOM，避免残留

## 视觉规范

- 遮罩底色：`rgba(0, 0, 0, 0.92)` — 近黑，不是纯黑，有细微透气感
- 波浪颜色：`#00d68f` — 品牌绿，与现有绿色主题一致
- 提示文字：白色 `#fff`，字号 34rpx，透明度 0.6
- 识别文字：白色 `#fff`，字号 36rpx，不透明
- 光晕渐变：`rgba(0, 214, 143, 0.2)` → `transparent`
