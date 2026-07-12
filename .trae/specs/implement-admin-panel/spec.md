# 后台管理系统 Spec

## Why
当前系统缺乏后台管理功能，管理员无法方便地查看和管理数据库内容。同时，公告和更新日志数据硬编码在 configController.js 中，不便于维护。需要一个完整的后台管理系统来提升运营效率。

## What Changes
- 在 more 页添加"后台管理"入口，仅对特定用户ID（可配置数组）显示
- 创建全新的后台管理页面，支持查看和管理数据库所有内容
- 将 notices 和 changelog 独立为后端数据文件，支持动态管理
- 后台管理页面支持公告和更新日志的增删改查

## Impact
- Affected specs: more 页面、后台管理页面、后端配置系统
- Affected code: 
  - `pages/more/more.wxml` - 添加后台管理入口
  - `pages/more/more.js` - 添加权限判断逻辑
  - `backend/data/` - 新增数据文件目录
  - `backend/controllers/configController.js` - 重构数据加载逻辑
  - `backend/controllers/adminController.js` - 新增后台管理控制器
  - `backend/routes/adminRoutes.js` - 新增后台管理路由
  - `pages/admin/` - 新增后台管理页面系列

## ADDED Requirements

### Requirement: 后台管理入口权限控制
系统 SHALL 在 more 页的 t-cell-group 中显示"后台管理"入口，仅当用户ID在可维护数组中时显示。

#### Scenario: 管理员用户访问
- **WHEN** 用户ID为 1 或 3（或配置数组中的其他ID）
- **THEN** 显示"后台管理"入口，点击可进入后台管理页面

#### Scenario: 普通用户访问
- **WHEN** 用户ID不在配置数组中
- **THEN** 不显示"后台管理"入口

### Requirement: 后台管理主页
系统 SHALL 提供后台管理主页，展示数据库各表的统计概览。

#### Scenario: 查看数据概览
- **WHEN** 管理员进入后台管理主页
- **THEN** 显示用户总数、待办总数、组合总数、共享组合总数、标签总数等统计信息
- **AND** 显示快捷入口卡片：用户管理、公告管理、更新日志管理

### Requirement: 用户列表管理
系统 SHALL 提供用户列表页面，展示所有用户的基本信息。

#### Scenario: 查看用户列表
- **WHEN** 管理员进入用户列表页面
- **THEN** 显示用户列表，包含：ID、头像、昵称、待办数、组合数、创建时间
- **AND** 支持按昵称搜索用户
- **AND** 支持分页加载

### Requirement: 用户详情查看
系统 SHALL 提供用户详情页面，展示用户的完整信息。

#### Scenario: 查看用户详情
- **WHEN** 管理员点击用户列表中的某个用户
- **THEN** 显示用户详情页面，包含：
  - 基本信息：头像、昵称、ID、OpenID、创建时间、最后同步时间
  - 数据上限：待办上限、组合上限、共享组合上限（支持修改）
  - 待办列表：显示该用户所有待办（支持查看详情，只读模式）
  - 组合列表：显示该用户创建的组合
  - 共享组合：显示该用户加入的共享组合

### Requirement: 用户上限修改
系统 SHALL 允许管理员修改用户的数据上限。

#### Scenario: 修改用户上限
- **WHEN** 管理员在用户详情页修改待办上限/组合上限/共享组合上限
- **AND** 点击保存
- **THEN** 系统更新用户上限配置
- **AND** 显示修改成功提示

### Requirement: 公告数据独立管理
系统 SHALL 将公告数据从代码中独立出来，存储为后端数据文件。

#### Scenario: 公告数据结构
- **WHEN** 系统加载公告数据
- **THEN** 从 `backend/data/notices.json` 读取数据
- **AND** 公告数据结构包含：id、title、date、content、version（可选）

### Requirement: 更新日志数据独立管理
系统 SHALL 将更新日志数据从代码中独立出来，存储为后端数据文件。

#### Scenario: 更新日志数据结构
- **WHEN** 系统加载更新日志数据
- **THEN** 从 `backend/data/changelog.json` 读取数据
- **AND** 更新日志数据结构包含：id、version、date、content（数组格式，支持分点展示）

### Requirement: 公告管理功能
系统 SHALL 在后台管理页面提供公告的增删改查功能。

#### Scenario: 查看公告列表
- **WHEN** 管理员进入公告管理页面
- **THEN** 显示所有公告列表，包含：标题、日期、内容预览
- **AND** 支持新增、编辑、删除操作

#### Scenario: 新增公告
- **WHEN** 管理员点击新增公告
- **THEN** 显示公告编辑表单，包含标题、日期、内容输入
- **AND** 可选择关联版本号（自动填充版本更新内容）

#### Scenario: 编辑公告
- **WHEN** 管理员点击编辑公告
- **THEN** 显示公告编辑表单，预填充现有内容
- **AND** 保存后更新公告数据文件

#### Scenario: 删除公告
- **WHEN** 管理员点击删除公告
- **THEN** 显示确认对话框
- **AND** 确认后从数据文件中移除该公告

### Requirement: 更新日志管理功能
系统 SHALL 在后台管理页面提供更新日志的增删改查功能。

#### Scenario: 查看更新日志列表
- **WHEN** 管理员进入更新日志管理页面
- **THEN** 显示所有版本列表，包含：版本号、日期、更新条目数
- **AND** 支持新增、编辑、删除操作

#### Scenario: 新增更新日志
- **WHEN** 管理员点击新增更新日志
- **THEN** 显示编辑表单，包含版本号、日期、更新内容（支持分点添加）

#### Scenario: 编辑更新日志
- **WHEN** 管理员点击编辑更新日志
- **THEN** 显示编辑表单，预填充现有内容
- **AND** 更新内容支持添加、删除、排序更新条目

#### Scenario: 删除更新日志
- **WHEN** 管理员点击删除更新日志
- **THEN** 显示确认对话框
- **AND** 确认后从数据文件中移除该版本日志

### Requirement: 数据库表浏览
系统 SHALL 提供数据库表浏览功能，展示所有表的数据。

#### Scenario: 浏览数据库表
- **WHEN** 管理员进入数据库浏览页面
- **THEN** 显示所有数据库表列表
- **AND** 点击表名可查看表数据（分页展示）
- **AND** 支持按条件筛选数据

## MODIFIED Requirements

### Requirement: 配置控制器重构
原 configController.js 中的 changelogList 和 noticesRaw 数组 SHALL 改为从独立数据文件读取。

#### Scenario: 加载配置数据
- **WHEN** 系统请求配置接口
- **THEN** 从 `backend/data/changelog.json` 和 `backend/data/notices.json` 读取数据
- **AND** 保持原有接口响应格式不变

## REMOVED Requirements
无移除的需求。
