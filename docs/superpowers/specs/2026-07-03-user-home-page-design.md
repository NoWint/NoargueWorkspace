# 用户主页系统设计

## 概述

为社区功能新增用户主页页面，聚合展示用户公开资料和其发布的帖子。

## 页面形态

- **位置**: 新建子包 `packageProfile`, 页面路径 `pages/user-home/user-home`
- **页面类型**: 独立页面，通过 `wx.navigateTo` 跳转进入
- **跳转参数**: 仅传 `?userId=xxx`，页面自行拉取所有数据
- **刷新**: 支持下拉刷新，重新拉取全部数据

## 子包注册

在 `app.json` 的 `subPackages` 中新增:

```json
{
  "root": "packageProfile",
  "pages": [
    "pages/user-home/user-home"
  ]
}
```

预加载规则: community-home/post-detail 所在包 preload 此包。

## 页面布局

```
┌──────────────────────┐
│    头像(128rpx)      │  居中
│    用户名(700w)      │  64rpx, 居中
│  [徽章] [徽章]       │  居中, 20rpx 彩色边框, 复用现有 badge
│     #用户ID          │  灰色, 小字, 居中
│                      │
│ [私信] [关注]        │  view 伪按钮, flex 居中(关注系统暂做, 占位)
│                      │
│ ┌─帖子 (12)────────┐ │  左上标题
│ │ ┌─post-card────┐ │ │  复用 post-card 组件
│ │ │              │ │ │
│ │ └──────────────┘ │ │
│ └──────────────────┘ │
└──────────────────────┘
```

当查看自己主页时，按钮组替换为:
- 统计文本: "发布了N篇帖子 · 注册了M天"
- "编辑个人资料"按钮

查看他人时，私信/关注按钮为灰色虚线占位，点击提示"即将开放"。

## 组件抽取: post-card

将 community-home 中的帖子卡片抽取为独立组件 `components/post-card/post-card`。

### 组件接口

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| post | Object | - | 完整帖子数据 |
| showAuthor | Boolean | true | 是否显示作者信息行 |
| compact | Boolean | false | 预留紧凑模式 |

### 事件

| 事件名 | 说明 |
|--------|------|
| tapAuthor | 点击作者头像/昵称, 父页面决定行为 |
| tapImage | 图片预览 |
| tapTodo | 跳转至关联待办 |
| tapCombo | 跳转至关联 combo |
| toggleLike | 点赞切换 |

### 迁移策略

1. 创建组件目录，从 community-home 提取卡片全部 WXML/WXSS/WXJS
2. community-home 引入组件，确保功能不变 (commit 1)
3. post-detail 的帖子展示区域改用 post-card 组件 (commit 1 同步完成)
4. user-home 引入组件，`showAuthor` 按需传递

社区主页和帖子详情中卡片内作者头像/昵称点击 → 跳转到 user-home。

## 后端 API

### GET `/users/:userId/profile`

返回用户公开资料:

```json
{
  "code": 200,
  "data": {
    "id": 10086,
    "nickname": "时光旅人",
    "avatarUrl": "https://...",
    "badgeTitles": ["高级用户"],
    "badgeColors": ["#ff6b6b"],
    "postCount": 12,
    "createdAt": "2025-06-15T08:00:00.000Z"
  }
}
```

路由挂载: `backend/routes/userRoutes.js`, 注册到 `backend/app.js`。

### GET `/posts/user/:userId`

游标分页，复用现有帖子列表响应格式:

```
/posts/user/:userId?cursor=&limit=10
```

## 入口跳转改造

| 入口 | 位置 | 改造内容 |
|------|------|----------|
| community-home | 帖子卡片作者信息(头像、昵称) | 绑定 tap 跳转, data-user-id 传值 |
| post-detail | 帖子作者区域 + 评论用户头像昵称 | 绑定 tap 跳转 |
| todo-detail | "创建人员"区域 | 补全 creator.id 后绑定跳转 |

### todo-detail creator.id 修复

四条数据路径，有三条需要补上 creator.id:
- 管理员路径: 已有完整 user 数据, 补上 id 即可
- 共享待办路径: 后端 comboController 已构建 creator.id, 前端读出来已有
- 社区帖子路径: 添加 `creatorId` URL 参数传递
- 分享链接路径: 确认和补上

## 徽章系统

复用现有 `badgeTitles` + `badgeColors` 彩色边框文字标签样式。保留纵向扩展能力，后续如需图标徽章/等级徽章可扩展。

## 加载状态

- 初次加载: 骨架屏（placeholders）
- 下拉刷新: 顶部刷新指示器
- 加载更多帖子: 底部 loading
- 空状态: 页面正常渲染, 帖子区域显示"暂无帖子"
- 错误状态: 全局错误提示, 可重试刷新

## 后续规划(关注系统)

用户主页已预留关注/私信按钮的位置。关注系统上线后:
- 关注按钮: 切换关注/已关注状态
- 私信按钮: 跳转私信会话
- 自己主页: 显示粉丝数/关注数统计
