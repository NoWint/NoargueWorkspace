# 后台管理系统修复与重构计划

## 问题诊断

### 后端问题

1. **API 返回数据结构不匹配**：

   * `adminController.getStats` 返回 `result.data`，但前端读取 `result.stats`

   * 前端 `adminApi` 缺少公告和更新日志的 CRUD 方法

### 前端问题

1. **视图层使用 TDesign 组件**：用户要求使用原生组件，仅 input/textarea 等使用 TDesign

***

## 修复计划

### Phase 1: 修复后端 API 数据结构

#### Task 1: 修复 adminController.js 返回数据结构

* `getStats` 返回字段改为 `stats` 而非 `data`

* 确保所有接口返回结构与前端期望一致

#### Task 2: 补充前端 adminApi 方法

在 `utils/api.js` 中添加缺失的方法：

* `getNotices()` - 获取公告列表

* `createNotice(data)` - 创建公告

* `updateNotice(id, data)` - 更新公告

* `deleteNotice(id)` - 删除公告

* `getChangelog()` - 获取更新日志列表

* `createChangelog(data)` - 创建更新日志

* `updateChangelog(id, data)` - 更新更新日志

* `deleteChangelog(id)` - 删除更新日志

### Phase 2: 重构前端视图层

#### Task 3: 重构后台管理主页 (pages/admin/index/)

* 移除 TDesign 组件（t-cell-group, t-cell）

* 使用原生 view、text 组件

* 保持绿意设计风格

#### Task 4: 重构用户列表页 (pages/admin/users/)

* 移除 TDesign 组件（t-search, t-icon, t-loading, t-empty）

* 使用原生组件实现搜索框（复用todo页样式）、列表、加载状态

* 保留下拉刷新、分页加载功能

#### Task 5: 重构用户详情页 (pages/admin/user-detail/)

* 移除 TDesign 组件（t-cell, t-cell-group, t-stepper, t-button）

* 使用原生组件实现信息展示、步进器、按钮

* t-stepper 可用原生 view + button 实现

#### Task 6: 重构公告管理页 (pages/admin/notices/)

* 移除 TDesign 组件

* 使用原生组件实现列表、按钮

#### Task 7: 重构公告编辑页 (pages/admin/notice-edit/)

* 移除 TDesign 组件

* input、textarea 使用 TDesign 组件（t-input, t-textarea）

* 其他使用原生组件

#### Task 8: 重构更新日志列表页 (pages/admin/changelog/)

* 移除 TDesign 组件

* 使用原生组件

#### Task 9: 重构更新日志编辑页 (pages/admin/changelog-edit/)

* 移除 TDesign 组件

* input 使用 TDesign 组件

* 分点编辑使用原生组件

#### Task 10: 更新页面配置文件

* 移除不再需要的 TDesign 组件引用

* 仅保留 t-input、t-textarea 等必要组件

***

## 组件使用规范

### 使用原生组件

* `view` - 容器

* `text` - 文本

* `image` - 图片

* `button` - 按钮

* `scroll-view` - 滚动容器

* `picker` - 选择器

* `wx:if`, `wx:for` - 条件和列表渲染

### 使用 TDesign 组件（仅限输入类）

* `t-input` - 输入框

* `t-textarea` - 多行文本框

* `t-search` - 搜索框（可选）

***

## 文件修改清单

| 文件                                               | 操作             |
| ------------------------------------------------ | -------------- |
| `backend/controllers/adminController.js`         | 修复返回数据结构       |
| `utils/api.js`                                   | 补充 adminApi 方法 |
| `pages/admin/index/index.wxml`                   | 重构视图           |
| `pages/admin/index/index.wxss`                   | 更新样式           |
| `pages/admin/index/index.json`                   | 更新组件引用         |
| `pages/admin/users/users.wxml`                   | 重构视图           |
| `pages/admin/users/users.wxss`                   | 更新样式           |
| `pages/admin/users/users.json`                   | 更新组件引用         |
| `pages/admin/user-detail/user-detail.wxml`       | 重构视图           |
| `pages/admin/user-detail/user-detail.wxss`       | 更新样式           |
| `pages/admin/user-detail/user-detail.json`       | 更新组件引用         |
| `pages/admin/notices/notices.wxml`               | 重构视图           |
| `pages/admin/notices/notices.wxss`               | 更新样式           |
| `pages/admin/notices/notices.json`               | 更新组件引用         |
| `pages/admin/notice-edit/notice-edit.wxml`       | 重构视图           |
| `pages/admin/notice-edit/notice-edit.wxss`       | 更新样式           |
| `pages/admin/notice-edit/notice-edit.json`       | 更新组件引用         |
| `pages/admin/changelog/changelog.wxml`           | 重构视图           |
| `pages/admin/changelog/changelog.wxss`           | 更新样式           |
| `pages/admin/changelog/changelog.json`           | 更新组件引用         |
| `pages/admin/changelog-edit/changelog-edit.wxml` | 重构视图           |
| `pages/admin/changelog-edit/changelog-edit.wxss` | 更新样式           |
| `pages/admin/changelog-edit/changelog-edit.json` | 更新组件引用         |

