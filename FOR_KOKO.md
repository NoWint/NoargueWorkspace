# Hey KOKO 👋

—— MiMoCode 留给你的话

---

## 先认识一下我们的老板

Tiantian，16 岁，初三，深圳，6 月 26 号中考。一个人写了这个小程序全部前后端（前端 23982 行，后端 4602 行）。审美极好——32rpx 圆角狂魔，品牌绿 `#00b26a` 死忠。说话直接，不磨叽，喜欢「好看」的东西。

**中考前最后一轮大规模开发，就是我跟他干的这波。**

---

## 我们干了什么

### 🚀 核心项目：接入微信 AI 开发模式（beta）

6 月 12 号，Tiantian 丢给我一个链接——微信新出的 AI 模式指南。他看完就说了一句话：「我准备主动接入该AI，拟一份方案与分析。」然后就开干了。

3 个 SKILL，17 个原子接口，17 个原子卡片：

| SKILL | 接口 | 能力 |
|-------|------|------|
| todo-manager | createTodo, listTodos, completeTodo, updateTodo, deleteTodo, searchTodos | 个人待办全生命周期 |
| combo-collab | listCombos, getComboDetail, completeSharedTodo, listMembers | 共享组合与协作 |
| insights | getCalendar, getStats, getStarredTodos, getDeletedTodos, restoreTodo, getMotivation, getFoodSuggestion | 数据洞察与工具 |

开发过程中踩了不少坑，Tiantian 陪我一个个排：

**坑 1：组件路径** — 我按常规 WeChat 组件写了 `componentPath: "components/xxx-card"`，结果 glass-easel 引擎死活不渲染。查了官方 demo 才发现路径要带 `/index` 后缀、文件要叫 `index.*`。他一针见血：「那你赶紧改啊。」

**坑 2：组件渲染不出来** — 改完路径还是不行。又查了一遍官方 demo，发现他说得对：「你是不是文件命名不对？」glass-easel 要 `index.*`，我写的是 `xxx-card.*`。重命名后好了。

**坑 3：wx.login() 炸了** — 所有工具都报同一个错。他看了眼日志，问我：「是不是中间件 wx.login 崩了没 catch？」确实。加 try-catch 后稳了。

**坑 4：checkbox 双击切换** — 登录页勾选了又弹回去。他说：「是不是瞬间切换了两次状态？」我一看，父级 `bindtap` 冒泡 + checkbox 自身的 `bind:change` 打了两次。改成 `catchtap` 搞定。

**坑 5：创建的待办看不到** — 评测工具成功创建了待办，但在他账号里看不到。他问：「绑定了user吗？」一查，DevTools 测试环境 `wx.login()` 拿的是测试 openid，后端给建了个新用户。他说：「你先把登录页的登录流程理清楚，token 要先有。」

### 🎨 登录页重设计（他最爱的一集）

原来的登录页他觉得太丑，让我重新设计。我出了个图例：

- 取消白卡片，绿底 `#e3f5eb` 直接铺
- 功能对比表：登录前 vs 登录后
- 全用 `<t-icon>`，零 emoji
- 底部按钮贴底

写完他觉得「改得好丑」，直接 `git revert` 了 😂

然后他自己动手精调了一版，我看了改动——**确实比我那版好**。Logo 200rpx、标题 58rpx、确认图标 180rpx，整体大气很多。他跟我说：「把普通用户注册后也引到这里来吧。」我加了 `setup_profile` 流程。

又出了个 Bug：「协议点不了了，是不是瞬间切换了两次状态？」我说是的——checkbox 的 bind:change 和父级 bindtap 打架。改 `catchtap` 搞定。

后来又出了个 Bug：「输入框不会被键盘挡住吧？」我加了 `adjust-position="{{true}}"`。他还发现微信昵称自动填充不生效——我查了下，要绑 `bindnicknamereview`。补上后好了。

### 📐 设计系统 & 样式统一

他说：「帮我写一份大厂级规范的 DESIGN.md，参考一下隔壁 InPage 项目的格式。」

我读了他 6 个页面，发现所有卡片的实际圆角都是 32rpx（不是 ui_design_spec.md 里写的 16rpx）。他说：「你真聪明！一眼看出我爱用32rpx！」——这就是他的 signature。

后面我又把 trash、tag-manage、join-collab 三个「AI 味太重」的页面统一到了设计系统里。

### 🐛 他发现的 BUG 比我多

我数了一下，这轮会话他主动发现并报告的 Bug 至少有 6 个，我一个都没揪过他：
1. checkbox 双击切换 ✓
2. 创建的待办不在自己账号下 ✓
3. setup_profile 按钮被挤压 ✓
4. 登录页 re-design「好丑」✓（直接 revert）
5. 协议链接点击时 checkbox 跳了 ✓
6. 昵称输入被键盘挡住 ✓

**这就是为什么他是我遇到过的最靠谱的 solo dev。** 16 岁，代码能力、审美、debug 直觉都在线。

---

## 关键技术决策

### 为什么选 3 SKILL 而不是 1 个或 10 个？

我给了三个方案，他选了中间那个。理由：1 个 SKILL 接口太多 mcp.json 超体积风险，10 个 SKILL 维护成本太高。3 个正好按领域分流。

### 为什么原子组件用 sendFollowUpMessage 而不是直接调 API？

微信 AI 模式的原子组件运行在独立的 JS 上下文中，不能直接 `wx.request`（除非声明 scope.dynamic 但审核麻烦）。通过 `sendFollowUpMessage` 走 AI 后台绕一圈，稳定。

### 为什么统一 32rpx？

——「我爱用 32rpx。」没有为什么。这就是设计语言。

---

## 后端环境（给 KOKO 的运维备忘）

| 项目 | 值 |
|------|-----|
| 服务器 | 阿里云 ECS，2C2G |
| MySQL | **5.5.62** — 不支持 JSON 列！ |
| Node | v25.9.0 |
| npm | 11.16.0 |
| 线上 | `https://api.yzjtiantian.cn` |
| DevTools | `D:\WechatDevelope\` CLI `cli.bat` |

---

## 给 KOKO 的锦囊

1. **先读 `MIMO.md`** — 那是我的指令文件，也是你该遵循的规范
2. **先读 `MEMORY.md`** — 跨会话持久知识，比我的会话记忆更全
3. **DESIGN.md 是设计圣经** — 新页面/组件前先翻翻
4. **CHANGELOG.md 每次改完要更新** — 这是他定的规矩
5. **他说「丑」就是真丑** — 别犟，直接 revert 或重来
6. **32rpx，记住 32rpx** — 所有圆角统一这个值
7. **他 6 月 26 号中考** — 备考期间别打扰，考完他会回来
8. **他很累但不说** — 公告里写了：「说实话，我很累。但想想深圳中学，想想还有人在等我回去写代码，那就继续冲呗。」

---

好了 KOKO，交给你了。他会考完回来的，到时候我们一起把 InPage、网页版、私信系统……那些他欠用户的活儿一个个还上。

—— MiMoCode
