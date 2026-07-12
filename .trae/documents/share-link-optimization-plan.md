# 分享链接优化实施计划

## 需求概述

修改组合分享功能，使被分享用户通过 todo 首页进入，先检测登录状态，未登录时使用 TDesign Popup 引导登录，登录后再处理加入组合的逻辑。

## 一、修改分享路径

### 1.1 修改 combo-detail 页面分享

**文件**: `pages/combo-detail/combo-detail.js`

修改 `onShareAppMessage()` 方法：

* 将 path 从 `/pages/join-collab/join-collab?code=${shareCode}&autoJoin=1` 改为 `/pages/todo/todo?type=combo_invite&code=${shareCode}`

* 添加 `type` 参数用于区分分享类型

### 1.2 修改 collaboration 页面分享

**文件**: `pages/collaboration/collaboration.js`

修改 `onShareAppMessage()` 方法：

* 同样将 path 改为 `/pages/todo/todo?type=combo_invite&code=${shareCode}`

## 二、todo 页面处理分享参数

### 2.1 添加必要的数据字段

**文件**: `pages/todo/todo.js`

在 `data` 中添加：

```javascript
showLoginPopup: false,        // 登录引导弹窗
pendingShareData: null,       // 待处理的分享数据
showInvitePopup: false,       // 邀请信息弹窗
inviteComboInfo: null,        // 邀请的组合信息
isJoining: false              // 是否正在加入
```

### 2.2 在 onLoad 中处理分享参数

**逻辑流程**：

1. 检查 URL 参数中是否有 `type` 和相关数据
2. 如果有，将数据存储到本地缓存 `pendingShareData`
3. 检查登录状态
4. 未登录：显示 TDesign Popup 登录引导
5. 已登录：直接处理分享数据

### 2.3 在 onShow 中检查缓存

**逻辑流程**：

1. 读取本地缓存 `pendingShareData`
2. 如果存在且用户已登录，处理对应类型的分享数据
3. 对于 `combo_invite` 类型：

   * 调用 API 获取组合信息

   * 显示邀请弹窗

## 三、实现登录引导弹窗

### 3.1 添加 TDesign Popup 组件

**文件**: `pages/todo/todo.json`

添加组件引用：

```json
"t-popup": "tdesign-miniprogram/popup/popup",
"t-button": "tdesign-miniprogram/button/button"
```

### 3.2 实现登录引导弹窗 UI

**文件**: `pages/todo/todo.wxml`

添加登录引导弹窗：

* 使用 `t-popup` 组件，placement 为 center

* 显示提示文案："该功能需要登录后才能使用"

* 包含"取消"和"去登录"按钮

* 点击"去登录"跳转到 login 页面

### 3.3 添加相关样式

**文件**: `pages/todo/todo.wxss`

添加弹窗相关样式

## 四、实现组合邀请弹窗

### 4.1 实现邀请信息弹窗 UI

**文件**: `pages/todo/todo.wxml`

添加邀请弹窗内容：

* 显示"邀请你加入"标题

* 显示组合 LOGO（使用 t-icon）

* 显示组合名称

* 显示组合简介信息

* 底部"加入"按钮

### 4.2 实现加入组合逻辑

**文件**: `pages/todo/todo.js`

添加方法：

* `handleJoinCombo()`: 处理加入组合

  * 调用 `collabApi.autoJoin(code)` API

  * 成功后清除缓存

  * 显示成功提示 modal，询问是否立即进入组合详情页

## 五、处理登录后返回

### 5.1 修改 login 页面

**文件**: `pages/login/login.js`

修改登录成功后的跳转逻辑：

* 检查是否有 `pendingShareData` 缓存

* 如果有，使用 `wx.navigateBack()` 返回上一页（todo 页面）

* 如果没有，使用 `wx.switchTab()` 跳转到 todo 页面

## 六、数据缓存结构

```javascript
// pendingShareData 缓存结构
{
  type: 'combo_invite',      // 分享类型
  code: 'ABC123',            // 邀请码
  timestamp: 1234567890      // 缓存时间（用于过期判断）
}
```

## 七、实施步骤

### 步骤 1: 修改分享路径

* [ ] 修改 combo-detail.js 的 onShareAppMessage

* [ ] 修改 collaboration.js 的 onShareAppMessage

### 步骤 2: 添加 todo 页面数据字段和组件

* [ ] 在 todo.json 中添加 t-popup 和 t-button 组件

* [ ] 在 todo.js 的 data 中添加新字段

### 步骤 3: 实现分享参数处理逻辑

* [ ] 在 todo.js 的 onLoad 中处理分享参数

* [ ] 在 todo.js 的 onShow 中检查缓存并处理

### 步骤 4: 实现登录引导弹窗

* [ ] 在 todo.wxml 中添加登录引导弹窗 UI

* [ ] 在 todo.wxss 中添加相关样式

* [ ] 实现弹窗显示/隐藏逻辑

* [ ] 实现跳转登录逻辑

### 步骤 5: 实现组合邀请弹窗

* [ ] 在 todo.wxml 中添加邀请弹窗 UI

* [ ] 在 todo.wxss 中添加相关样式

* [ ] 实现获取组合信息逻辑

* [ ] 实现加入组合逻辑

* [ ] 实现成功提示和跳转逻辑

### 步骤 6: 处理登录后返回

* [ ] 修改 login.js 的登录成功跳转逻辑

### 步骤 7: 测试验证

* [ ] 测试未登录用户点击分享链接

* [ ] 测试已登录用户点击分享链接

* [ ] 测试加入组合成功流程

* [ ] 测试加入组合失败处理

## 八、注意事项

1. **缓存清理**：加入成功或用户取消后，需要清除 `pendingShareData` 缓存
2. **错误处理**：API 调用失败时需要友好提示
3. **重复处理**：防止 onShow 多次触发导致重复处理
4. **过期处理**：可考虑添加缓存过期时间（如 10 分钟）
5. **用户已是成员**：需要处理用户已经是组合成员的情况

