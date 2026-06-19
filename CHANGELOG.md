🌟【新增】优先级（四象限）：待办和共享待办支持 p1-p4 优先级选择，含旧数据兜底
🌟【新增】add-todo 页新增 2x2 四象限选择器（P1 紧急重要/ P2 重要不紧急/ P3 紧急不重要/ P4 不紧急不重要）
🌟【新增】todo 列表展示优先级色点，todo-detail 页展示优先级信息
✨【优化】移除重复的 LICENSE.txt 文件
🌟【优化】卡片阴影加深、已完成项灰度弱化、天气卡片阴影改为品牌色
🌟【优化】协作页 超管→管理员/创建者，增加危险操作橙色警告样式
🌟【优化】app.wxss 全局卡片圆角统一为 32rpx
🛠【修复】首页 移除不存在的方法 connectBluetooth() 调用，解决新用户首次进入时报错
?��������MIMO.md��AI ����ָ��淶�ļ�����¼��ĿԼ�������ϵͳ
➕【新增｜AI 模式】创建独立分�?packageAI，接入微�?AI 开发模式（beta�?➕【新增｜SKILL 体系】构�?3 �?SKILL�?7 个原子接口，17 个原子卡片，覆盖待办/组合/洞察全功�?➕【新增｜AGENTS.md】全局提示词，定义 AI 助手的回答风格和行为约束
➕【新增｜原子组件】实现全部原子卡片，支持 tap 交互、sendFollowUpMessage 续接对话、openDetailPage 半屏跳转
➕【新增｜输出结构】全�?17 个接口补�?outputSchema 声明
➕【新增｜组件路由】全部原子组件配�?relatedPage + setRelatedPage 动态参�?➕【新增｜设计系统】DESIGN.md �?绿意风格完整 token 体系（色�?字号/圆角/阴影/动画�?➕【新增｜登录页】标准登录页增加功能对比表，展示「登录前 vs 登录后」能力差�?➕【新增｜登录页】普通用户注册后引导�?setup_profile 设置页，免弹�?➕【新增｜登录页】QR 码四模式（need_login/setup_profile/confirm/success）统一视觉
➕【新增｜CHANGELOG.md】更新日志维护规�?➕【新增｜评测工具】安�?wxa-skills-eval 评测套件
🛠️【修复｜组件渲染】componentPath �?/index 后缀，组件文件统一命名 index.*（glass-easel 引擎规范�?🛠️【修复｜事件冒泡】checkbox bind:tap 改为 catch:tap，防止双击切�?🛠️【修复｜Number 强转】移�?comboId/todoId 上的 Number() 调用，支持字符串 ID
🛠️【修复｜getCalendar】getApp() 改为 wx.getStorageSync 适配 AI 模式独立上下�?🛠️【修复｜配置错误】app.json 移除无效 permission/compilerOptions；project.config.json 加回缺失逗号
🛠️【修复｜WXML key】wx:key="combo.id" 改为 *this
🛠️【修复｜运算符优先级】avatarUrl 判断加括号，避免 &&/|| 结合�?Bug
🛠️【修复｜昵称输入】添�?bindnicknamereview 事件，微信键盘自动填充昵称不丢失
🛠️【修复｜agree 交互】移除父�?bindtap 防止双击切换，文字用 catchtap 独立触发
🛠️【修复｜跳转丢失】setup_profile 保存/跳过时检�?pendingShareData，不丢失组合邀请任�?🛠️【修复｜按钮挤压】btn-primary 恢复 flex:2 布局，同�?login-btn 视觉
✨【优化｜登录页】去掉白卡片，绿底弹性布局 + 按钮贴底，全 t-icon �?emoji
✨【优化｜登录页】字号整体调大：logo 200rpx/标题 58rpx/按钮 38rpx/确认图标 180rpx
✨【优化｜登录页】对比表左右对齐 + 箭头居中 120rpx，文�?38rpx
✨【优化｜登录页】手动精�?detect 分流，文案精简，setup_profile 头像 badge 移出 button
✨【优化｜登录页】confirm �?success 图标 180rpx + 标题 58rpx，匹�?hero
✨【优化｜trash 页】红色渐变→品牌绿，黄色警告卡→白卡+青左边框，品牌色统一 #00b26a
✨【优化｜tag-manage 页】圆�?20rpx�?2rpx�?:before 矩形�?6rpx 绿圆点，emoji→t-icon
✨【优化｜join-collab 页】橙色卡→白�?青左边框，非标色值→design tokens
✨【优化｜设计统一】全部三页非标色�?字号/圆角对齐 DESIGN.md
