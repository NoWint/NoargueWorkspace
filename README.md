 # 时光绿径待办
 
 一个微信小程序 + Node.js 后端的待办事项管理工具。个人项目和团队协作都能用。
 
 线上版：微信搜「时光绿径待办」或扫码体验（照片你放）
 
 ## 截图
 
 > 你放几张关键页面的截图：首页待办列表、日历、协作页、统计。四个 Tab 各一张就行。
 
 ## 技术栈
 
 **前端**
 - 微信小程序原生框架（WXML + WXSS + JS）
 - [TDesign Miniprogram](https://tdesign.tencent.com/miniprogram/) 做 UI 组件
 - @lspriv/wx-calendar 日历组件、ec-canvas 图表
 
 **后端**
 - Express.js，跑在阿里云 ECS（2C2G）
 - MySQL 5.5.62（很老，不支持 JSON 列，用 TEXT 字段自己序列化）
 - 微信登录 + 模板消息推送
 
 **额外**
 - 另一个 Vite + TS 的 web 版在 /website 目录，还在开发中
 
 ## 做了些什么
 
 大概就一个待办 App 该有的功能：
 
 - 创建待办（带日期、时间、位置、标签、图片、所属组合）
 - 滑动标记完成 / 编辑 / 删除
 - 按标签、按组合筛选
 - 语音输入（微信语音识别插件）
 - 拖拽排序
 
 比较花心思的部分：
 
 - **组合（文件夹）系统**：待办归类到组合里，组合之间可以共享给其他用户协作
 - **共享待办**：组合里的待办可以分配给特定成员，完成方式有三种——全员完成、任一完成、指定某人完成
 - **离线优先 + 增量同步**：本地先存 Storage，再异步同步到后端。同步有冲突检测，本地和云端都有改动的走 merge
 - **日历集成**：待办有截止日期的话在日历上打点标记，点击日期看当天的待办
 - **模板消息通知**：快到截止时间了通过微信模板消息推送提醒
 
 后端功能：微信 auth、待办 CRUD、标签 CRUD、组合管理、成员管理、协作审批、上传图片、评论回复、管理员后台。
 
 ## 架构大概长这样
 
 小程序端 <-> HTTP/JSON <-> Express.js API 服务（阿里云 ECS）<-> MySQL 5.5
 
 后端路由：/auth /todos /tags /combos /collab /notify /upload /admin /comments
 
 数据库 10 张表：users / todos / tags / todo_tags / combos / combo_members / shared_todos / shared_todo_assignments / collab_requests / sync_logs
 
 ## 一些技术细节
 
 写这个项目时碰到的一些具体问题（面试常问这些）：
 
 - **微信小程序没有 DOM 操作**：所有 UI 变化都走数据绑定，跟写 React/Vue 的思路完全不一样
 - **MySQL 5.5 的限制**：不支持 JSON 列，不支持多个 TIMESTAMP 用 CURRENT_TIMESTAMP，有些 SQL 写法要绕路。migrations/ 目录里可以看到踩坑记录
 - **离线同步**：Storage 做本地缓存，每次启动时跟云端比对差异。增量同步而不是全量拉取，减少流量和冲突概率
 - **协作权限**：owner / admin / member 三级角色，审批流程是自己写的
 - **图片上传**：用图床托管，60 天无访问自动清理——因为学生服务器存储空间有限
 
 ## 本地跑起来
 
 小程序端需要微信开发者工具打开项目根目录就行。后端需要跑在 Node 环境：
 
 ```
 cd backend
 npm install
 # 先导入 database.sql 到你的 MySQL
 # 创建 .env 文件，填数据库连接 + 微信 AppID/Secret
 npm start
 ```
 
 注意：生产环境的 .env 有敏感信息（数据库密码、微信凭据），公开仓库里已经用 .gitignore 排除了。
 
 ## 还没做（或者做了一半的）
 
 - Web 版（Vite + TS）—— 功能基本有了，UI 还没上线
 - 暗黑模式 —— 整个设计系统是纯浅色的，要加的话改动量不小
 - 通知系统的重试机制 —— 现在是一次性推送，失败了不会重试
 
 ## License
 
 GPL v3
