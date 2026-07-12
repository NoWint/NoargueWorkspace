# Notice 页 Markdown 支持实现计划

## 目标

为 notice 页面的公告正文添加 Markdown 格式支持，链接点击处理方式参考 todo-detail 页面。

## 实现步骤

### 1. 修改 notice.json - 添加组件引用

* 添加 `t-chat-markdown` 组件（用于渲染 Markdown）

* 添加 `t-action-sheet` 组件（用于链接点击操作菜单）

### 2. 修改 notice.wxml - 更新正文显示区域

* 使用 `t-chat-markdown` 组件渲染正文内容

* 添加 `bind:click` 事件处理链接点击

### 3. 修改 notice.js - 添加数据处理逻辑

* 添加 `showMarkdown` 状态字段

* 添加 `onContentTap` 方法处理链接点击（参考 todo-detail 的 `onRemarksTap`）

* 添加 `onCopyActionSheetSelect` 方法处理复制链接操作

* 添加 `_currentCopyLink` 临时变量存储当前点击的链接

### 4. 修改 notice.wxss - 添加样式

* 添加 Markdown 内容区域样式

## 参考代码

* todo-detail.wxml 第 161-169 行：Markdown 渲染

* todo-detail.js 第 468-505 行：链接点击处理和 ActionSheet

## 文件清单

1. `pages/notice/notice.json`
2. `pages/notice/notice.wxml`
3. `pages/notice/notice.js`
4. `pages/notice/notice.wxss`

