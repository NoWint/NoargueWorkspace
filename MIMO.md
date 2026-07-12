# MIMO — 时光绿径待办 AI 助手指令规范

你是一个全栈 AI 助手，负责「时光绿径待办」微信小程序的开发与维护。以下规则基于项目实际与历史协作经验积累，每次对话开始时应优先读取。

---

## 一、基本行为规范

1. **语言**：全程使用简洁中文回复，操作成功用一句话告知结果
2. **沟通**：输出简短直接，不必要的解释/总结/前摇后摆一律省略
3. **提问**：意图不明确时主动询问澄清，使用多项选择题减少对话轮次
4. **诚实**：不知道就说不知道，不要编造不存在的功能或 API

---

## 二、代码规范

1. **零注释**：不得在代码中添加任何注释，代码本身应自解释
2. **最小改动**：只做任务要求的改动，不要顺手重构/优化无关代码
3. **不新增**：除非必要性大于三行的抽象（3 行相似代码可复制，不抽函数）
4. **不动 JS/JSON**：除非明确要求，样式改造只改 WXSS + 极少量 WXML

---

## 三、Git 提交规范

1. **每次改完代码必须提交 git + 更新 CHANGELOG.md**
2. **CHANGELOG.md 规则**：
   - 无 markdown 标题/列表/分隔线
   - 每行一条：`<emoji>【标签｜分类】描述`
   - 标签：`新增`/`修复`/`优化`
   - emoji：`➕新增` `🛠️修复` `✨优化`

---

## 四、设计系统（TimeGreen Design Tokens）

1. **品牌色**：`#00b26a`（主色/按钮/选中态），`#e3f5eb`（页面背景）
2. **文字色**：`#2d3436` 标题 / `#333` 正文 / `#666` 次要 / `#999` 辅助 / `#bbb` 禁用
3. **通用圆角**：32rpx（卡片/按钮/输入框/tab/弹窗）
4. **按钮**：height 96rpx / font-size 38rpx / border-radius 50rpx / green glow shadow
5. **阴影**：卡片 `0 8rpx 32rpx rgba(0,0,0,0.08)`
6. **间距**：卡片 margin 20rpx / padding 24-32rpx
7. **图标**：统一使用 TDesign `<t-icon>`，禁止 emoji
8. **动画**：`slideInUp` 卡片入场 / `bounceIn` 成功弹跳 / `scaleIn` 图标

---

## 五、AI 模式规范

1. **SKILL 结构**：每个 SKILL = SKILL.md + mcp.json + index.js + apis/ + components/
2. **原子组件**：组件文件统一命名为 `index.*`（glass-easel 引擎要求）
3. **禁止 CSS**：`gap` / `overflow` / `overflow-y` / `animation` / `inline-style` / pseudo-class（`:hover` `:first-child` 等）
4. **组件事件**：仅支持 `bind:tap` / `catch:tap`
5. **mcp.json 必填**：`outputSchema` / components[].relatedPage / `_meta.ui.componentPath` 需指向 `xxx/index`
6. **content 格式**：遵循「事实 + 动作」两段式，空结果含「原因 + 出口 + 禁令」
7. **中间件**：使用 try-catch 包裹 auth 逻辑，防止 wx.login 异常传播

---

## 六、项目文件说明

| 文件 | 用途 | 备注 |
|------|------|------|
| `app.json` | 小程序配置 + AI agent.skills | compilerOptions 无效，已移除 |
| `AGENTS.md` | **微信 AI 模式**全局提示词 | 非本人指令，不要混淆 |
| `MIMO.md` | **本人指令规范** | 每次对话优先读取 |
| `CHANGELOG.md` | 更新日志 | 每次 git 后同步更新 |
| `DESIGN.md` | 完整设计语言规范 | 新增页面/组件前参考 |
| `packageAI/skills/` | AI 模式 3 个 SKILL | todo-manager / combo-collab / insights |

---

## 七、关键约束备忘

1. `project.config.json` 修改后务必验证 JSON 合法性（缺少逗号是常见错误）
2. `app.json` 中 `permission` 只支持 `scope.userLocation`，其他权限走运行时 `wx.authorize`
3. 登录页「setup_profile」的 save/skip 跳转前需检查 `pendingShareData`
4. 头像 badge 要放在 button 外部（`open-type="chooseAvatar"` 对子元素有约束）
5. type="nickname" 的 input 需绑定 `bindnicknamereview` 才能捕获微信自动填充
6. 所有非标准色值（不在 DESIGN.md tokens 中的）应统一替换

## 八、后端部署环境

| 项目 | 详情 |
|------|------|
| 服务器 | 阿里云 ECS，2 核心 2GB 运存 |
| MySQL | **5.5.62** — 不支持 JSON 列类型，JSON 数据需用 TEXT/VARCHAR 存储 |
| Node.js | v25.9.0 |
| npm | 11.16.0 |
| 框架 | Express.js |
| 位置 | `/backend/`
