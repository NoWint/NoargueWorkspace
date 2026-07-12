# 待办附加图片功能 Spec

## Why

用户需要为待办事项添加图片附件，以便更直观地记录和展示待办相关信息。当前待办仅支持文本内容，无法满足用户对图片信息的需求。

## What Changes

* 后端数据库新增 `images` 字段用于存储图片URL数组（数据库版本不支持JSON格式，仅纯文本）

* 前端 add-todo 页面集成 TDesign Upload 组件，支持图片上传、拖拽排序、预览

* 前端 todo-detail 页面新增图片展示卡片，支持多种布局和点击查看大图

* 数据导出/导入功能支持新的 images 字段

## Impact

* Affected specs: 待办数据模型、共享待办数据模型、数据导入导出

* Affected code:

  * `backend/controllers/todoController.js`

  * `backend/controllers/collabController.js`

  * `backend/database.sql`

  * `pages/add-todo/add-todo.js/wxml/wxss`

  * `pages/todo-detail/todo-detail.js/wxml/wxss`

  * `pages/datamanage/datamanage.js`

## ADDED Requirements

### Requirement: 数据库图片字段

系统 SHALL 在 todos 和 shared\_todos 表中添加 images 字段，用于存储图片URL数组。

#### Scenario: 创建带图片的待办

* **WHEN** 用户创建待办并上传图片

* **THEN** 图片URL以JSON数组格式存储在images字段中

#### Scenario: 数据库字段类型

* **GIVEN** MySQL 5.5+ 版本限制

* **WHEN** 存储图片数据

* **THEN** 使用 TEXT 类型字段存储JSON字符串

### Requirement: 图片上传功能

系统 SHALL 支持用户为待办添加最多9张图片附件。

#### Scenario: 选择图片

* **WHEN** 用户点击添加图片按钮

* **THEN** 支持从相册、聊天记录中选择图片

* **AND** 显示图床提示"图片由第三方图床托管，单张图片连续60天未访问则自动清理"

#### Scenario: 上传图片

* **WHEN** 用户选择图片后

* **THEN** 图片上传至第三方图床 `https://img.scdn.io/api/v1.php`

* **AND** 显示上传进度

* **AND** 上传成功后显示图片缩略图

#### Scenario: 拖拽排序

* **WHEN** 用户长按图片

* **THEN** 支持拖拽调整图片顺序

#### Scenario: 删除图片

* **WHEN** 用户点击图片删除按钮

* **THEN** 从列表中移除该图片

#### Scenario: 查看大图

* **WHEN** 用户点击已上传的图片

* **THEN** 使用微信原生预览功能查看大图

### Requirement: 图片展示功能

系统 SHALL 在待办详情页展示关联的图片。

#### Scenario: 图片布局

* **GIVEN** 待办包含图片

* **WHEN** 用户查看待办详情

* **THEN** 图片以网格形式展示在备注卡片上方

* **AND** 根据图片数量自动选择布局：

  * 1张：1列布局

  * 2张：2列布局

  * 3张：3列布局

  * 4张：2x2布局

  * 5-6张：3x2布局

  * 7-9张：3x3布局

#### Scenario: 查看大图

* **WHEN** 用户点击详情页的图片

* **THEN** 调用 `wx.previewImage` 全屏预览图片

* **AND** 支持左右滑动切换图片

### Requirement: 数据同步支持

系统 SHALL 在数据同步时正确处理图片字段。

#### Scenario: 创建/更新待办同步

* **WHEN** 用户创建或更新带图片的待办

* **THEN** 图片数据同步到云端

#### Scenario: 共享待办图片

* **WHEN** 用户创建或编辑共享待办

* **THEN** 图片数据同步到共享待办表

### Requirement: 数据导入导出支持

系统 SHALL 在数据导入导出时包含图片字段。

#### Scenario: 导出数据

* **WHEN** 用户导出待办数据

* **THEN** 导出的JSON包含images字段

#### Scenario: 导入数据

* **WHEN** 用户导入待办数据

* **THEN** 正确解析并恢复images字段

## MODIFIED Requirements

### Requirement: 待办数据模型

待办事项数据模型新增 images 字段：

```javascript
{
  // ... 现有字段
  images: ['https://img.scdn.io/xxx.jpg', ...]  // 图片URL数组，最多9张
}
```

### Requirement: 共享待办数据模型

共享待办数据模型新增 images 字段：

```javascript
{
  // ... 现有字段
  images: ['https://img.scdn.io/xxx.jpg', ...]  // 图片URL数组，最多9张
}
```

## REMOVED Requirements

无移除的需求。
