# 更新日志

## V4.2.0 (2026-06-12 ~ 2026-06-21)

### 🏗 架构重构
- 拆分子包，新增 backend/web 端，升级 TDesign 组件库
- 分包重构：10 页面迁入 packagePages，修复 notice/guide markdown 路由
- 取消 packageAI 独立分包及 agent 块配置，以通过提审校验

### 🤖 AI 模式（beta）
- 创建独立分包 packageAI，接入微信 AI 开发模式（beta）
- 新增 AGENTS.md 全局提示词，定义 AI 助手回答风格和行为约束
- 新增共享 API 基础设施（auth 中间件）
- 新增 todo-manager SKILL（6 原子接口 + 3 原子组件）
- 新增 combo-collab SKILL（4 原子接口 + 2 组件集）
- 新增 insights SKILL（7 原子接口 + 3 组件集）
- 补全全部 17 个接口的 outputSchema 声明
- 完善组件生命周期、content 两段式、middleware 中间件日志
- 实现全部原子卡片（tap 交互、sendFollowUpMessage、openDetailPage 半屏跳转）
- 新增 search-results/starred-list/member-list 组件路由
- 补齐全部 7 个操作结果卡片组件
- 统一组件设计语言（绿意风格 card/badge/shadow 体系）

### 🎨 设计系统
- 新增 DESIGN.md 绿意风格完整设计语言规范（token-based：色彩/字号/圆角/阴影/动画/布局）

### 🎨 页面重设计
- **个人中心**：时间问候、成长数据卡片、快捷操作网格、入场动画
- **回收站**：卡片式布局、微交互动画、阶梯入场效果
- **登录页**：全新布局（功能对比表 + t-icon + 底部按钮粘底）
- 登录页交互优化：checkbox 扩展到协议文字、注册后引导 setup_profile 设置页、QR 四模式统一视觉

### 🌟 优先级（四象限）
- 全链路支持 P1-P4 优先级：数据库字段 + API + add-todo 选择器 + 列表色条 + 详情展示
- 优先级色条视觉迭代：阴影 → 左侧色条，弧形精调，最终以 @import 统一分包样式
- todo 页下拉筛选新增优先级分组（P1-P4）
- todo-detail 优先级卡片改为单行 flex 布局

### 📝 子任务
- 子任务功能设计文档
- 子任务交互细节优化（checkbox 换 t-icon）
- flattensubtree 算法优化，onLoad 拆分为 7 个子函数
- 子任务分享：微信快照 + 共享组合递归复制 + 只读展示
- generateShareImage 417 行 → 8 个子函数

### ⚡ 性能优化
- 待办存储改造：全量读写 → 增量写入
- 后端 sync 批量 SQL，mergeChanges 冲突逻辑简化
- getTodoIds 空索引时自动重建（reindexTodos）

### 🎤 语音识别遮罩
- todo 页 mic FAB 语音识别：全屏遮罩 + 中心实时文字 + 底部绿色波动光晕
- clip-path circle() 扩散 → opacity 渐显渐隐（性能优化）
- 新增提示"识别可能需要几秒钟，松手即可结束"
- 同步语音遮罩到 combo-detail 页（复用以 @import 引入样式）
- 修复并发 401 导致多个 login 页叠加的问题

### ✨ 交互增强
- **adminView 管理视图**：todo-detail API 加载 + 评论管理，combo-detail 刷新 + 筛选 + 导航传参
- **长按菜单**：todo 页卡片弹跳动画 + 毛玻璃操作菜单，原位克隆 + 贴边弹出动画
- **弹窗毛玻璃**：全应用 16 处 t-popup 底栏弹窗统一毛玻璃化

### 🔧 基础设施
- 统一日志系统：全局 logger + ~132 处 console 替换 + 远程 ERROR 上报
- 数据库连接指定时区 +08:00，修复创建时间显示偏移
- 统一全局卡片圆角为 32rpx，品牌色统一 #00b26a
- 修复首页调用不存在的方法 connectBluetooth()
- 移除重复的 LICENSE.txt 文件

### 📝 版本说明
- 日期：2026-06-12 ~ 2026-06-21
- 首个提交：`afa3256` — V4.2.0 初始架构重构
- 前版本：V4.1.2（`ccbbaab`）
