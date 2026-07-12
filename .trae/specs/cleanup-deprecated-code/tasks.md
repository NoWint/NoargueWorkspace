# Tasks

- [x] Task 1: 清理 todo.js 废弃代码
  - [x] 移除空函数: startDrag, handleTouchMove, handleTouchEnd, cancelDrag
  - [x] 移除未使用数据字段: inputValue, searchKeywords
  - [x] 移除调试用的 console.log 语句

- [x] Task 2: 清理 todo-detail.js 废弃代码
  - [x] 移除未使用数据字段: defaultDate, showCalendar
  - [x] 移除未使用函数: createReminder 及相关 tmplIds
  - [x] 移除调试用的 console.log 语句

- [x] Task 3: 清理 todo-search.js 废弃代码
  - [x] 移除未使用数据字段: isFocus, currentSwipeIndex

- [x] Task 4: 清理 collaboration.js 废弃代码
  - [x] 移除未使用数据字段: isShareMode

- [x] Task 5: 清理 join-collab.js 废弃代码
  - [x] 移除未使用数据字段: isJoined

- [x] Task 6: 清理 ai-chat.js 废弃代码
  - [x] 移除未使用数据字段: voiceContent
  - [x] 移除调试用的 console.log 语句

- [x] Task 7: 清理其他页面调试代码
  - [x] 移除 calendar.js 中的 console.log
  - [x] 移除 stats.js 中的 console.log

- [ ] Task 8: 提取公共工具函数（可选重构）
  - [x] 在 utils/util.js 中添加 formatDate 函数
  - [x] 在 utils/util.js 中添加 formatTime 函数
  - [ ] 更新 todo.js 使用公共函数（可选，保留现有实现以避免风险）
  - [ ] 更新 add-todo.js 使用公共函数（可选，保留现有实现以避免风险）
  - [ ] 更新 calendar.js 使用公共函数（可选，保留现有实现以避免风险）
  - [ ] 更新 todo-detail.js 使用公共函数（可选，保留现有实现以避免风险）
  - [ ] 更新 daily-stats.js 使用公共函数（可选，保留现有实现以避免风险）
  - [ ] 更新 combo-detail.js 使用公共函数（可选，保留现有实现以避免风险）

# Task Dependencies
- [Task 8] 需要在 Task 1-7 完成后执行，避免修改冲突
- Task 1-7 可以并行执行

# 备注
Task 8 的公共函数文件已创建 (utils/util.js)，但更新各页面引用是可选的重构操作。
考虑到"不影响现有功能"的要求，保留各页面现有的 formatDate/formatTime 实现，
后续可根据需要逐步迁移到公共函数。
