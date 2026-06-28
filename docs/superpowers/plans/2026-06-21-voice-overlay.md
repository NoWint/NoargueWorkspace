# 语音识别遮罩动画实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development or executing-plans to implement this plan task-by-task.

**Goal:** 为 todo 页 mic FAB 增加全屏黑色 clip-path 扩散/收缩遮罩，替代当前裸录音提示

**Architecture:** 修改 todo 页的 3 个文件（wxml/wxss/js），遮罩用 clip-path circle() CSS Transition 控制伸缩，波浪用多 bar CSS 动画模拟（微信小程序不支持 inline SVG）

**Tech Stack:** WeChat Mini Program + TDesign FAB + WechatSI 语音插件

---

### Task 1: 添加遮罩和波浪的 CSS 样式（todo.wxss）

**Files:**
- Modify: `pages/todo/todo.wxss` — 文件末尾追加

- [ ] **Step 1: 在 todo.wxss 末尾追加 voice-overlay 相关样式**

```css
/* ===========================
   语音识别遮罩动画
   =========================== */

.voice-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 15000;
  pointer-events: auto;
}

.voice-overlay-inner {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.92);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  clip-path: circle(0% at var(--cx, 50%) var(--cy, 50%));
  -webkit-clip-path: circle(0% at var(--cx, 50%) var(--cy, 50%));
}

.voice-overlay-inner.expand {
  clip-path: circle(200% at var(--cx, 50%) var(--cy, 50%));
  -webkit-clip-path: circle(200% at var(--cx, 50%) var(--cy, 50%));
  transition: clip-path 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  -webkit-transition: -webkit-clip-path 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.voice-overlay-inner.collapse {
  clip-path: circle(0% at var(--cx, 50%) var(--cy, 50%));
  -webkit-clip-path: circle(0% at var(--cx, 50%) var(--cy, 50%));
  transition: clip-path 0.3s cubic-bezier(0.55, 0.085, 0.68, 0.53);
  -webkit-transition: -webkit-clip-path 0.3s cubic-bezier(0.55, 0.085, 0.68, 0.53);
}

/* 中心文字区域 */
.voice-center {
  position: relative;
  z-index: 2;
  text-align: center;
  padding: 0 60rpx;
  width: 100%;
  box-sizing: border-box;
}

.voice-hint {
  display: block;
  font-size: 36rpx;
  color: #ffffff;
  line-height: 1.6;
  text-shadow: 0 4rpx 20rpx rgba(0, 214, 143, 0.3);
  word-break: break-all;
}

.voice-hint.placeholder {
  font-size: 34rpx;
  opacity: 0.6;
  font-weight: 400;
}

/* 波浪容器 */
.voice-wave {
  position: absolute;
  bottom: 160rpx;
  left: 10%;
  right: 10%;
  height: 80rpx;
  overflow: hidden;
  z-index: 1;
}

.voice-wave-bar {
  position: absolute;
  bottom: 0;
  width: 6rpx;
  border-radius: 3rpx;
  background: linear-gradient(to top, #00d68f, rgba(0, 214, 143, 0.1));
  animation: voiceWaveAnim 1.2s ease-in-out infinite;
  transform-origin: bottom;
}

@keyframes voiceWaveAnim {
  0%, 100% {
    height: 12rpx;
    opacity: 0.3;
  }
  50% {
    height: 72rpx;
    opacity: 1;
  }
}

/* 底部光晕 */
.voice-glow {
  position: absolute;
  bottom: 100rpx;
  left: 5%;
  right: 5%;
  height: 160rpx;
  background: radial-gradient(ellipse at center, rgba(0, 214, 143, 0.15) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}
```

- [ ] **Step 2: 提交 CSS 变更**

```bash
git add pages/todo/todo.wxss
git commit -m "feat: add voice overlay CSS (clip-path, wave bars, glow)"
```

---

### Task 2: 添加遮罩 WXML 模板（todo.wxml）

**Files:**
- Modify: `pages/todo/todo.wxml` — 在 FAB 按钮组之后、t-action-sheet 之前插入

- [ ] **Step 1: 在 mic FAB 之后新增遮罩模板**

找到 mic FAB 的代码（约第 296 行）：
```xml
<t-fab 
  icon="microphone-1" 
  bind:touchstart="touchStart" 
  bind:touchend="touchEnd"
  style="right: 32rpx; bottom: 150rpx;"
/>
```

在其后（t-action-sheet 之前）插入遮罩模板：

```xml
<!-- 语音识别遮罩 -->
<view wx:if="{{isRecording}}" class="voice-overlay" catchtouchmove="preventTouchMove">
  <view class="voice-overlay-inner {{overlayPhase === 'expand' ? 'expand' : (overlayPhase === 'collapse' ? 'collapse' : '')}}" style="--cx:{{fabCx}}px;--cy:{{fabCy}}px;">
    <view class="voice-center">
      <text class="voice-hint {{voiceText ? '' : 'placeholder'}}">{{voiceText || '正在聆听...'}}</text>
    </view>
    <view class="voice-wave">
      <view wx:for="{{32}}" wx:key="*this" class="voice-wave-bar" style="left:{{index * 3.125}}%;animation-delay:{{index * 0.06}}s;"></view>
    </view>
    <view class="voice-glow"></view>
  </view>
</view>
```

- [ ] **Step 2: 提交 WXML 变更**

```bash
git add pages/todo/todo.wxml
git commit -m "feat: add voice overlay WXML template with animated wave bars"
```

---

### Task 3: 修改 JS 逻辑（todo.js）

**Files:**
- Modify: `pages/todo/todo.js`

- [ ] **Step 1: 在 data 中新增遮罩相关字段**

在 data 对象的 `recordState: false` 附近（约第 64 行）添加新字段：

```js
// 语音相关
recordState: false, // 录音状态
content: '', // 识别的内容
// ↓↓↓ 新增 ↓↓↓
isRecording: false,   // 遮罩显隐控制
overlayPhase: '',     // 动画阶段: '' / 'expand' / 'collapse'
fabCx: 0,             // FAB 中心 X 坐标
fabCy: 0,             // FAB 中心 Y 坐标
voiceText: '',        // 实时识别文字
// ↑↑↑ 新增 ↑↑↑
```

- [ ] **Step 2: 重写 startRecording 方法（约第 1637 行）**

FAB 位置固定在 `right: 32rpx; bottom: 150rpx;`，TDesign FAB 默认尺寸为 112rpx（56px）。通过屏幕尺寸计算圆心坐标，避免不可靠的 DOM 查询。

```js
/**
 * 开始录音 + 遮罩扩散动画
 */
startRecording() {
  const sysInfo = wx.getSystemInfoSync();
  const ratio = sysInfo.windowWidth / 750;
  const fabSize = 112 * ratio;         // TDesign FAB 尺寸 112rpx → px
  const fabRight = 32 * ratio;
  const fabBottom = 150 * ratio;
  const cx = sysInfo.windowWidth - fabRight - fabSize / 2;
  const cy = sysInfo.windowHeight - fabBottom - fabSize / 2;
  
  // 两阶段展开：先插入 DOM（无 phase），再触发 transition
  this.setData({
    isRecording: true,
    overlayPhase: '',
    recordState: true,
    voiceText: '',
    fabCx: cx,
    fabCy: cy
  });
  
  setTimeout(() => {
    this.setData({ overlayPhase: 'expand' });
  }, 50);
  
  // 开始语音识别
  manager.start({ lang: 'zh_CN' });
},
```

- [ ] **Step 3: 重写 touchStart 方法（约第 1651 行）**

```js
/**
 * 按下 FAB 开始录音 + 遮罩扩散
 */
touchStart(e) {
  // 如果遮罩已显示，防止二次触发
  if (this.data.isRecording) return;
  
  // 先检查麦克风权限
  wx.getSetting({
    success: (res) => {
      if (!res.authSetting['scope.record']) {
        wx.authorize({
          scope: 'scope.record',
          success: () => {
            this.startRecording();
          },
          fail: () => {
            wx.showModal({
              title: '需要麦克风权限',
              content: '语音功能需要麦克风权限，请在设置中开启',
              confirmText: '去设置',
              success: (res) => {
                if (res.confirm) wx.openSetting();
              }
            });
          }
        });
      } else {
        this.startRecording();
      }
    }
  });
},
```

- [ ] **Step 4: 重写 touchEnd 方法（约第 1690 行）**

```js
/**
 * 松手停止录音 + 遮罩收缩 + 跳转
 */
touchEnd(e) {
  if (!this.data.isRecording) return;
  
  // 记录按下到松手的时长
  // 停止语音识别
  manager.stop();
  
  // 触发收缩动画
  this.setData({ overlayPhase: 'collapse' });
  
  // 等待收缩动画完成后再处理跳转
  setTimeout(() => {
    const text = this.data.voiceText;
    
    // 先隐藏遮罩
    this.setData({
      isRecording: false,
      overlayPhase: '',
      recordState: false
    });
    
    // 有识别文本才跳转（快速松手无文本则不跳转）
    if (text) {
      wx.navigateTo({
        url: `/packagePages/add-todo/add-todo?voiceText=${encodeURIComponent(text)}`
      });
    }
  }, 350); // 略长于收缩动画时长（300ms），等动画完全结束
},
```

- [ ] **Step 5: 修改 initRecord 中的 onRecognize 和 onStop**

修改 `manager.onRecognize`（约第 1564 行），实时更新遮罩文字：
```js
manager.onRecognize = function (res) {
  const text = res.result;
  that.setData({
    voiceText: text,
    content: text
  });
  
  // 只有非遮罩模式下的空结果才弹窗提示
  if (text === '' && !that.data.isRecording) {
    wx.showModal({
      title: '语音识别未成功',
      content: '未能识别到有效内容。...',
      confirmText: '知道了',
      showCancel: false
    });
  }
};
```

修改 `manager.onStop`（约第 1611 行），移除原来的 wx.hideLoading 和跳转逻辑（跳转已移到 touchEnd 中）：
```js
manager.onStop = function (res) {
  var text = res.result;
  
  // 过滤末尾标点
  if (text && text.length > 0) {
    const lastChar = text[text.length - 1];
    if (['。', '.', '，', ','].includes(lastChar)) {
      text = text.slice(0, -1);
    }
  }
  
  that.setData({ content: text });
  
  // 非遮罩模式（旧路径兼容）：遮罩模式下 text 已由 onRecognize 更新
  if (!that.data.isRecording) {
    wx.hideLoading();
    if (text) {
      wx.navigateTo({
        url: `/packagePages/add-todo/add-todo?voiceText=${encodeURIComponent(text)}`
      });
    }
  }
};
```

- [ ] **Step 6: 提交 JS 变更**

```bash
git add pages/todo/todo.js
git commit -m "feat: voice overlay logic - touchStart/touchEnd rewrite, real-time text display"
```
