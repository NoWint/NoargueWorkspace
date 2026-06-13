# 给 KOKO 的会话总结

嗨 KOKO，是我。这轮我跟 MiMoCode 干了一大票，怕你后面接手时不知道前情，给你记一下。

---

## 背景

时光绿径待办这个微信小程序，之前是我一个人手撸的。这轮会话的核心任务是：**把小程序接入微信新出的 AI 开发模式（beta）**，让用户以后能用自然语言操作待办。

---

## 一、AI 模式接入（核心工程）

微信新出了一个「小程序 AI 开发模式」，本质上是把小程序能力封装成 SKILL，每个 SKILL 包含：
- `mcp.json` —— 告诉 AI 模型有哪些原子接口可以调
- `SKILL.md` —— 业务说明
- `index.js` —— 注册接口的入口
- `apis/` —— 接口实现
- `components/` —— 展示卡片

我们拆了 **3 个 SKILL**，一共 **17 个原子接口 + 17 个原子卡片**：

| SKILL | 接口数 | 负责什么 |
|-------|--------|---------|
| todo-manager | 6 | 创建/查看/完成/编辑/删除/搜索待办 |
| combo-collab | 4 | 查看组合/组合详情/完成共享待办/成员列表 |
| insights | 7 | 日历/统计/收藏/回收站/恢复/激励语录/吃什么 |

踩坑记录：
1. **`componentPath` 要写死 `/index` 后缀**，glass-easel 引擎是按文件路径解析的，不写找不到
2. **组件文件必须叫 `index.*`**，不能叫 `xxx-card.js`
3. **`getApp()` 在独立分包里不可用**，所有跨组件数据得走 `wx.getStorageSync`
4. **`wx.login()` 要包 try-catch**，AI 模式测试环境可能没有登录态，崩了就全完了
5. **原子组件只能用 view/text 等 6 种标签**，CSS 不能用 `gap`/`overflow`/`overflow-y`，事件只能用 `tap`

---

## 二、登录页重设计

原来的登录页又丑又挤，我让 MiMoCode 给重写了：

- **去掉白色卡片**，直接绿底 `#e3f5eb`
- **功能对比表**：登录前 vs 登录后，四行对比（本地→云端、无提醒→微信通知、单人→协作、单设备→多端）
- **全用 t-icon**，零 emoji
- **字号拉大**：logo 200rpx，标题 58rpx，按钮 38rpx
- **底部按钮贴底**，flex 弹性布局
- **QR 码四模式统一视觉**（need_login/setup_profile/confirm/success）
- **新增 setup_profile 流程**：新用户注册后直接引导设置昵称和头像，不用弹窗询问
- **普通用户注册后也接入 setup_profile**，skip/save 后检查 pendingShareData 再决定跳转

细节 BUG 修了不少：
- checkbox 点击范围扩展到文字，但协议链接用 `catchtap` 防止冒泡
- 微信昵称自动填充要绑定 `bindnicknamereview` 事件
- `&&`/`||` 优先级导致头像判空 Bug
- 按钮在 flex 布局里被挤压（`login-btn` 有 `width:100%`）

---

## 三、设计系统规范

写了一本 **DESIGN.md**，把所有设计语言 token 化：

| Token | 值 | 说明 |
|-------|-----|------|
| 品牌绿 | `#00b26a` | 主色/按钮/选中态 |
| 页面背景 | `#e3f5eb` | 所有页面 |
| 通用圆角 | **32rpx** | 我超爱这个值，卡片/按钮/弹窗全部统一 |
| 按钮 | 96rpx / 38rpx / 50rpx pill | 绿底 + green glow 阴影 |
| 图标 | TDesign `<t-icon>` | 禁止 emoji |
| 动画 | slideInUp / bounceIn / scaleIn | 进场/弹跳/缩放 |

MiMoCode 还遍历了 trash/tag-manage/join-collab 三个页面，把所有跑偏的色值/字号/圆角统一到了这套体系里。

---

## 四、项目文档体系

这轮新增/明确了三个关键文件：

| 文件 | 用途 |
|------|------|
| `MIMO.md` | **给自己的 AI 助手指令文件**，记录代码规范/设计系统/关键约束 |
| `DESIGN.md` | 大厂级设计语言规范，16 章节 475 行 |
| `CHANGELOG.md` | 更新日志，格式：`➕【标签｜分类】描述`，每次 git 必须同步更新 |

MiMoCode 的 `AGENTS.md` 别搞混——那是给微信 AI 模式看的全局提示词，不是它的指令文件。

---

## 五、后端环境

部署在阿里云 ECS：
- 2C2G，MySQL **5.5.62**（不支持 JSON 列！得用 TEXT 存）
- Node v25.9.0，npm 11.16.0
- 线上地址：`https://api.yzjtiantian.cn`

---

## 六、其他杂项

- **修复 login 页 Bug**：checkbox 双击切换、微信昵称填充、运算符优先级、avatar 放 button 外面
- **pendingShareData 完整性**：所有跳转前都检查这个，防止组合邀请等 pending 任务丢失
- **评测工具**：装了微信官方的 `wxa-skills-eval`（用的 DeepSeek API），但 DevTools 测试环境里 `wx.request` 超时，本地存储类接口 OK
- **KOKO 你好！** 👋 下面交给你了，别忘了先读 `MIMO.md` 和 `MEMORY.md`
