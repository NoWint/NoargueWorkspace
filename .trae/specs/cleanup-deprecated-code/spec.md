# 清理废弃代码和数据结构 Spec

## Why
项目中积累了大量未使用的函数、数据字段和调试代码，影响代码可读性和维护性。需要在保证现有功能正常运行的前提下，清理这些废弃代码。

## What Changes
- 移除未使用的空函数占位符（todo.js 中的拖拽相关函数）
- 移除未使用的 data 字段（inputValue, searchKeywords, defaultDate 等）
- 移除调试用的 console.log 语句
- 移除未使用的函数（createReminder 等）
- 将重复的工具函数提取到公共模块

## Impact
- Affected code: 
  - pages/todo/todo.js
  - pages/todo-detail/todo-detail.js
  - pages/todo-search/todo-search.js
  - pages/ai-chat/ai-chat.js
  - pages/collaboration/collaboration.js
  - pages/join-collab/join-collab.js
  - pages/calendar/calendar.js
  - pages/add-todo/add-todo.js
  - pages/stats/stats.js
  - utils/util.js（新增公共函数）

## ADDED Requirements

### Requirement: 代码清理
系统 SHALL 移除所有未使用的代码和数据结构，保持代码整洁。

#### Scenario: 移除空函数
- **WHEN** 发现未绑定任何事件的空函数
- **THEN** 安全移除该函数

#### Scenario: 移除未使用数据字段
- **WHEN** data 中定义的字段未在 WXML 或其他代码中使用
- **THEN** 安全移除该字段

#### Scenario: 移除调试代码
- **WHEN** 发现 console.log 调试语句
- **THEN** 移除该语句

### Requirement: 公共函数提取
系统 SHALL 将重复定义的工具函数提取到公共模块。

#### Scenario: 日期时间格式化函数
- **WHEN** 多个页面重复定义 formatDate/formatTime 函数
- **THEN** 提取到 utils/util.js 并更新所有引用

## 清理清单

### 高优先级（可安全移除）

| 文件 | 问题类型 | 具体内容 |
|------|----------|----------|
| todo.js | 空函数 | startDrag, handleTouchMove, handleTouchEnd, cancelDrag |
| todo.js | 未使用字段 | inputValue, searchKeywords |
| todo-detail.js | 未使用字段 | defaultDate, showCalendar |
| todo-detail.js | 未使用函数 | createReminder |
| todo-search.js | 未使用字段 | isFocus, currentSwipeIndex |
| collaboration.js | 未使用字段 | isShareMode |
| join-collab.js | 未使用字段 | isJoined |
| ai-chat.js | 未使用字段 | voiceContent |

### 中优先级（重构）

| 问题 | 涉及文件 | 处理方式 |
|------|----------|----------|
| formatDate 重复 | 6个页面 | 提取到 utils/util.js |
| formatTime 重复 | 3个页面 | 提取到 utils/util.js |

### 低优先级（调试清理）

| 文件 | console.log 数量 |
|------|------------------|
| ai-chat.js | ~20处 |
| todo.js | ~10处 |
| todo-detail.js | ~5处 |
| calendar.js | ~5处 |
| stats.js | ~3处 |
