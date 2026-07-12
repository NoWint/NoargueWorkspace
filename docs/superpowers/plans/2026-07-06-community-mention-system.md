# 社区 @提及 功能实现计划

> **给执行者的说明：** 推荐使用 `superpowers:subagent-driven-development` 技能来逐个任务执行。步骤用 `- [ ]` 勾选框标记进度。

**目标：** 给社区帖子加 @用户功能——输入时检测 `@` 弹用户搜索 popup，选中后 body 存 `@[昵称](userId)` 格式，用 t-chat-markdown 渲染成绿色可点击链接，编辑时解析回去。底下有个「你提到了 X 位用户」的实时卡片。

**架构：** 不需要改数据库表。body 字段直接存 markdown 格式的 `@[昵称](userId)`。前端在 post-edit 维护一个 `mentionsList` 数组记录每次 popup 选取的 {nickname, userId}，提交时遍历 list 做替换。编辑加载时解析 markdown 提取 userId，批量查最新昵称刷新显示。

**技术栈：** 微信小程序、TDesign Miniprogram chat-markdown、Express/MySQL

---

### 任务 1：后端——用户搜索 & 批量查询 API

**涉及文件：**
- 修改: `backend/controllers/userController.js`
- 修改: `backend/routes/userRoutes.js`
- 修改: `utils/api.js`

- [ ] **步骤 1：给 userController.js 加 search 方法**

打开 `backend/controllers/userController.js`，在 `getProfile` 后面加：

```javascript
const search = async (req, res) => {
  const { q, limit = 20 } = req.query;
  if (!q || q.trim().length === 0) {
    return res.json({ success: true, data: [] });
  }
  try {
    const pageSize = Math.min(parseInt(limit), 50);
    const users = await query(
      `SELECT id, nickname, avatar_url FROM users
       WHERE nickname LIKE ? AND is_deleted = 0
       ORDER BY nickname ASC LIMIT ?`,
      [`%${q.trim()}%`, pageSize]
    );
    res.json({
      success: true,
      data: users.map(u => ({
        id: u.id,
        nickname: u.nickname,
        avatar: getFullAvatarUrl(u.avatar_url)
      }))
    });
  } catch (err) {
    logger.error(USER_LOG, '搜索', '搜索用户失败', { keyword: q, error: err.message });
    res.status(500).json({ success: false, message: '搜索失败' });
  }
};
```

- [ ] **步骤 2：加 getBatch 批量查询方法**

在 `search` 方法后加：

```javascript
const getBatch = async (req, res) => {
  const { ids } = req.query;
  if (!ids) return res.json({ success: true, data: [] });
  const idArray = ids.split(',').map(Number).filter(id => !isNaN(id));
  if (idArray.length === 0) return res.json({ success: true, data: [] });
  try {
    const users = await query(
      `SELECT id, nickname, avatar_url FROM users WHERE id IN (?)`,
      [idArray]
    );
    res.json({
      success: true,
      data: users.map(u => ({
        id: u.id,
        nickname: u.nickname,
        avatar: getFullAvatarUrl(u.avatar_url)
      }))
    });
  } catch (err) {
    logger.error(USER_LOG, '批量查询', '批量查询用户失败', { ids, error: err.message });
    res.status(500).json({ success: false, message: '查询失败' });
  }
};
```

- [ ] **步骤 3：导出新方法**

把 `module.exports = { getProfile };` 替换成：

```javascript
module.exports = { getProfile, search, getBatch };
```

- [ ] **步骤 4：注册路由**

把 `backend/routes/userRoutes.js` 替换成：

```javascript
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware } = require('../middleware/auth');

router.get('/search', authMiddleware, userController.search);
router.get('/batch', authMiddleware, userController.getBatch);
router.get('/:userId/profile', authMiddleware, userController.getProfile);

module.exports = router;
```

- [ ] **步骤 5：前端 API 加方法**

在 `utils/api.js` 的 `communityApi` 对象里加两个方法：

```javascript
searchUsers: (q) => request({ url: '/users/search', method: 'GET', data: { q } }),
getUsersBatch: (ids) => request({ url: '/users/batch', method: 'GET', data: { ids: ids.join(',') } }),
```

- [ ] **步骤 6：提交**

```bash
git add backend/controllers/userController.js backend/routes/userRoutes.js utils/api.js
git commit -m "feat: 添加@提及功能的用户搜索和批量查询API"
```

---

### 任务 2：Post-Edit——@检测 & 用户搜索弹窗

**涉及文件：**
- 修改: `packageCommunity/post-edit/post-edit.js`
- 修改: `packageCommunity/post-edit/post-edit.wxml`
- 修改: `packageCommunity/post-edit/post-edit.wxss`

- [ ] **步骤 1：加 @ 相关的 data 属性**

在 `post-edit.js` 的 `data` 对象里加：

```javascript
showAtPopup: false,          // 是否显示@用户搜索弹窗
atSearchResults: [],          // 搜索结果列表
atKeyword: '',               // 当前搜索关键词
mentionsList: [],            // [{ id, nickname, userId }] — 从popup选取的@记录
mentionCount: 0,             // 检测到的@次数
showMentionCard: false,      // 显示提及卡片
currentMentions: [],         // [{ nickname, userId }] — 实时检测的@用户列表
showMentionListPopup: false, // 提及用户列表弹窗
mentionIdCounter: 0,         // mentionsList 的 id 计数器
```

- [ ] **步骤 2：替换 onBodyInput + 加检测方法**

把原来的 `onBodyInput`（只有一行 `setData`）替换成：

```javascript
onBodyInput(e) {
  const body = e.detail.value ?? '';
  this.setData({ body });
  this.detectAtMention(body);
  this.updateMentionCard(body);
},

// 检测输入末尾是否输入了 @关键词
// 注：用 \S* 而非 \w*，因为 \w 不匹配中文字符
detectAtMention(text) {
  const atRegex = /(?:^|\s)@(\S*)$/;
  const match = text.match(atRegex);
  if (match) {
    const keyword = match[1];
    this.setData({ atKeyword: keyword });
    this.searchUsers(keyword);
  } else {
    this.closeAtPopup();
  }
},

// 搜索用户
async searchUsers(keyword) {
  if (!keyword.trim()) { this.closeAtPopup(); return; }
  try {
    const res = await communityApi.searchUsers(keyword);
    if (res.success) {
      this.setData({ atSearchResults: res.data, showAtPopup: true });
    }
  } catch {
    this.closeAtPopup();
  }
},

// 关闭@弹窗
closeAtPopup() {
  this.setData({ showAtPopup: false, atSearchResults: [], atKeyword: '' });
},
```

- [ ] **步骤 3：加选择用户的处理函数**

```javascript
// 在搜索弹窗里选了一个用户
selectMentionUser(e) {
  const userId = parseInt(e.currentTarget.dataset.id);
  const nickname = e.currentTarget.dataset.nickname;
  const { body, mentionsList, mentionIdCounter } = this.data;

  // 找到最后一个 @关键词 的位置（\S 匹配中文）
  const atMatch = body.match(/(?:^|\s)@(\S*)$/);
  if (!atMatch) { this.closeAtPopup(); return; }

  const atIndex = atMatch.index + (atMatch[0].startsWith('@') ? 0 : atMatch[0].indexOf('@'));
  const beforeAt = body.substring(0, atIndex);
  const afterAt = body.substring(atIndex + 1 + atMatch[1].length);
  const newBody = `${beforeAt}@${nickname} ${afterAt}`;

  // 往 mentionsList 追加一条选取记录，带唯一 id
  const counter = (mentionIdCounter || 0) + 1;
  const newEntry = {
    id: `mention_${counter}_${Date.now()}`,
    nickname,
    userId,
  };
  const newList = [...mentionsList, newEntry];

  this.setData({
    body: newBody,
    mentionsList: newList,
    mentionIdCounter: counter,
  });
  this.closeAtPopup();
  this.updateMentionCard(newBody);
},
```

- [ ] **步骤 4：提交时把 @昵称 转成 markdown 语法**

修改 `handleSubmit`，在构建 `payload` 之前加：

```javascript
const body = this.convertMentionsInText(this.data.body || '');
```

然后 payload 里用这个 `body`（不是 `this.data.body`）。

再加转换方法：

```javascript
// 遍历 mentionsList，在原文中找到 @昵称 → 替换成 @[昵称](userId)
// 只处理在列表中注册过的记录，手动敲的 @xxx 不会误转换
convertMentionsInText(text) {
  const { mentionsList } = this.data;
  if (!text || !mentionsList.length) return text;
  let result = text;
  const seen = new Set();
  for (const entry of mentionsList) {
    if (seen.has(entry.userId)) continue; // 同个 userId 只替换一次
    seen.add(entry.userId);
    const escaped = entry.nickname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // 每次 new RegExp，用 u 标志启用 \p{P} Unicode 属性支持
    const regex = new RegExp(`(?<=^|\\s)@${escaped}(?=\\s|$|[\\p{P}])`, 'u');
    const newResult = result.replace(regex, `@[${entry.nickname}](${entry.userId})`);
    if (newResult !== result) {
      result = newResult;
    }
    // newResult === result → 用户删了这条提及，直接跳过
  }
  return result;
},
```

- [ ] **步骤 5：在 wxml 里加 @用户搜索弹窗**

在字数统计 `<view class="word-count">` 和上传区域 `<view class="upload-section">` 之间加：

```html
<!-- @用户选择弹窗 -->
<t-popup
  visible="{{showAtPopup}}"
  placement="bottom"
  close-on-overlay-click="{{false}}"
  overlay-style="background:none"
>
  <view class="at-popup">
    <view class="at-popup-header">
      <text class="at-popup-title">提及用户</text>
      <view class="at-popup-close" catch:tap="closeAtPopup">
        <t-icon name="close" size="32rpx" color="#999" />
      </view>
    </view>
    <scroll-view class="at-popup-scroll" scroll-y wx:if="{{atSearchResults.length > 0}}">
      <view
        class="at-user-item"
        wx:for="{{atSearchResults}}" wx:key="id"
        catch:tap="selectMentionUser"
        data-id="{{item.id}}"
        data-nickname="{{item.nickname}}"
      >
        <image class="at-user-avatar" src="{{item.avatar || '/images/avatar.png'}}" mode="aspectFill" />
        <text class="at-user-name">{{item.nickname}}</text>
      </view>
    </scroll-view>
    <view wx:else class="at-popup-empty">
      <text wx:if="{{!atKeyword}}">输入昵称搜索用户</text>
      <text wx:else>未找到匹配的用户</text>
    </view>
  </view>
</t-popup>
```

- [ ] **步骤 6：加 @弹窗样式**

在 `post-edit.wxss` 末尾追加：

```css
.at-popup {
  max-height: 50vh;
  background: rgba(255,255,255,0.95);
  backdrop-filter: blur(16rpx);
  -webkit-backdrop-filter: blur(16rpx);
  border-radius: 24rpx 24rpx 0 0;
  overflow: hidden;
}
.at-popup-header {
  display: flex; align-items: center;
  justify-content: space-between;
  padding: 24rpx 28rpx;
  border-bottom: 1rpx solid #f0f0f0;
}
.at-popup-title { font-size: 30rpx; font-weight: 600; color: #1a1a1a; }
.at-popup-close { padding: 8rpx; }
.at-popup-scroll { max-height: 40vh; overflow-y: auto; padding: 16rpx 0; }
.at-user-item {
  display: flex; align-items: center; gap: 16rpx;
  padding: 20rpx 28rpx;
}
.at-user-item:active { background: #f5f5f5; }
.at-user-avatar {
  width: 56rpx; height: 56rpx; border-radius: 50%; flex-shrink: 0;
}
.at-user-name { font-size: 28rpx; color: #1a1a1a; }
.at-popup-empty { padding: 40rpx; text-align: center; font-size: 28rpx; color: #999; }
```

- [ ] **步骤 7：在草稿恢复代码中同步提及卡片**

草稿恢复后 body 里可能含有 `@昵称` 纯文本，需要同步提及卡片状态。

在 `post-edit.js` 的 `onLoad` 中，找到草稿恢复的 `this.setData({...})` 之后。添加：

```javascript
// 草稿恢复后同步更新提及卡片（草稿里的 @是纯文本，不触发 markdown）
if (draft.body) this.updateMentionCard(draft.body || '');
```

- [ ] **步骤 8：提交**

```bash
git add packageCommunity/post-edit/post-edit.js packageCommunity/post-edit/post-edit.wxml packageCommunity/post-edit/post-edit.wxss
git commit -m "feat: post-edit 添加@检测和用户搜索弹窗"
```

---

### 任务 3：Post-Edit——提及卡片 & 编辑模式解析

**涉及文件：**
- 修改: `packageCommunity/post-edit/post-edit.js`
- 修改: `packageCommunity/post-edit/post-edit.wxml`
- 修改: `packageCommunity/post-edit/post-edit.wxss`

- [ ] **步骤 1：加 markdown 解析和提及检测工具方法**

加到 `post-edit.js` 里（随便找个合适的位置，比如 `closeAtPopup` 后面）：

```javascript
// 遍历 mentionsList，检测哪些 @昵称 在原文中确实存在
// 如果用户删掉了某个 @昵称，列表中对应的条目就不应该再出现
detectMentionsInText(text) {
  const { mentionsList } = this.data;
  if (!text || !mentionsList.length) return [];
  const found = [];
  const seenIds = new Set();
  for (const entry of mentionsList) {
    if (seenIds.has(entry.userId)) continue;
    const escaped = entry.nickname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?<=^|\\s)@${escaped}(?=\\s|$|[\\p{P}])`, 'u');
    if (regex.test(text)) {
      found.push({ nickname: entry.nickname, userId: entry.userId });
      seenIds.add(entry.userId);
    }
  }
  return found;
},

// 根据文本更新底下的「提及卡片」状态
updateMentionCard(text) {
  const mentions = this.detectMentionsInText(text);
  this.setData({
    mentionCount: mentions.length,
    showMentionCard: mentions.length > 0,
    currentMentions: mentions,
  });
},

// 从 body 中提取所有 @[昵称](id) 格式的提及
// 返回 { displayBody, mentionsList }
parseMarkdownBody(text) {
  if (!text) return { displayBody: '', mentionsList: [] };
  const mentionsList = [];
  const seen = new Set();
  const displayBody = text.replace(/\[([^\]]+)\]\((\d+)\)/g, (m, nickname, userId) => {
    const uid = parseInt(userId);
    if (!seen.has(uid)) {
      seen.add(uid);
      mentionsList.push({
        id: `mention_restore_${uid}`,
        nickname,
        userId: uid,
      });
    }
    return `@${nickname}`;
  });
  return { displayBody, mentionsList };
},
```

- [ ] **步骤 2：加提及列表弹窗的处理函数**

```javascript
// 点「你提到了 X 位用户」卡片 → 弹出列表
openMentionListPopup() {
  const mentions = this.detectMentionsInText(this.data.body);
  this.setData({ currentMentions: mentions, showMentionListPopup: true });
},

closeMentionListPopup() {
  this.setData({ showMentionListPopup: false });
},

onMentionListClose(e) {
  if (!e.detail.visible) this.setData({ showMentionListPopup: false });
},

// 在提及列表 popup 中点用户 → 跳转主页
goToMentionUser(e) {
  const userId = e.currentTarget.dataset.userid;
  wx.navigateTo({ url: `/packagePages/user-center/user-center?userId=${userId}` });
},
```

- [ ] **步骤 3：编辑加载时解析 markdown body**

编辑加载有两个路径：缓存（cached）和 API 回退。两个都要处理。

**缓存路径**：在 `loadEditData` 中找到 `if (cached && cached.postId === postId)` 这个分支。在 `this.setData({...})` 那一段之后（整个 `if` 块的末尾），加：

```javascript
// 解析 markdown body 中的 @提及，转换成 mentionsList
const parsed = this.parseMarkdownBody(cached.body || '');
if (parsed.mentionsList.length > 0) {
  const userIds = parsed.mentionsList.map(e => e.userId);
  communityApi.getUsersBatch(userIds)
    .then(res => {
      if (!res.success || !res.data) {
        this.setData({ mentionsList: parsed.mentionsList });
        return;
      }
      // 拿最新昵称刷新 mentionsList 和 body
      const userMap = {};
      res.data.forEach(u => { userMap[u.id] = u.nickname; });
      const newList = parsed.mentionsList.map(e => ({
        ...e,
        nickname: userMap[e.userId] || e.nickname,
      }));
      let updatedBody = parsed.displayBody;
      for (const e of parsed.mentionsList) {
        const newNick = userMap[e.userId];
        if (newNick && newNick !== e.nickname) {
          // 精确匹配 @旧昵称，避免误替换子串（如 "张三" 被误换到 "张三丰" 上）
          const oldEscaped = e.nickname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          updatedBody = updatedBody.replace(
            new RegExp(`(?<=^|\\s)@${oldEscaped}(?=\\s|$|[\\p{P}])`, 'u'),
            `@${newNick}`
          );
        }
      }
      this.setData({ body: updatedBody, mentionsList: newList });
      this.updateMentionCard(updatedBody);
    })
    .catch(() => this.setData({ mentionsList: parsed.mentionsList }));
} else {
  this.setData({ body: parsed.displayBody });
}
```

**API 回退路径**：找到 `const post = res.data;` 那一块，在 `this.setData({...})` 那一段之后，加**完全相同的逻辑**（只是 `parsed` 用的变量是 `post.body` 不是 `cached.body`）:

```javascript
const parsed = this.parseMarkdownBody(post.body || '');
// ...同上...
```

- [ ] **步骤 4：在 wxml 加提及卡片和列表弹窗**

在 @用户搜索弹窗之后、上传区域之前加：

```html
<!-- @提及用户卡片 -->
<view wx:if="{{showMentionCard}}" class="mention-card" catch:tap="openMentionListPopup">
  <t-icon name="user" size="28rpx" color="#00b26a" />
  <text class="mention-card-text">你提到了 <text class="mention-count">{{mentionCount}}</text> 位用户</text>
  <t-icon name="chevron-right" size="28rpx" color="#999" />
</view>
```

在页面底部（最后一个 `</view>` 之前）加：

```html
<!-- @提及用户列表（只读弹窗） -->
<t-popup
  visible="{{showMentionListPopup}}"
  bind:visible-change="onMentionListClose"
  placement="bottom"
  close-on-overlay-click="{{true}}"
>
  <view class="mention-list-popup">
    <view class="mention-list-header">
      <text class="mention-list-title">提及的用户</text>
      <view class="mention-list-close" catch:tap="closeMentionListPopup">
        <t-icon name="close" size="36rpx" color="#999" />
      </view>
    </view>
    <scroll-view class="mention-list-scroll" scroll-y>
      <view
        class="mention-list-item"
        wx:for="{{currentMentions}}" wx:key="userId"
        catch:tap="goToMentionUser"
        data-userid="{{item.userId}}"
      >
        <image class="mention-list-avatar" src="/images/avatar.png" mode="aspectFill" />
        <text class="mention-list-name">{{item.nickname}}</text>
        <t-icon name="chevron-right" size="28rpx" color="#ccc" />
      </view>
    </scroll-view>
    <view wx:if="{{currentMentions.length === 0}}" class="mention-list-empty">
      <text>暂无提及的用户</text>
    </view>
  </view>
</t-popup>
```

- [ ] **步骤 5：加提及卡片和列表弹窗的样式**

追加到 `post-edit.wxss`：

```css
.mention-card {
  display: flex; align-items: center; gap: 8rpx;
  padding: 16rpx 24rpx;
  background: #f0fdf6;
  border-radius: 16rpx;
  margin-bottom: 16rpx;
}
.mention-card-text { flex: 1; font-size: 26rpx; color: #333; }
.mention-count { color: #00b26a; font-weight: 600; }

.mention-list-popup {
  max-height: 60vh;
  background: rgba(255,255,255,0.95);
  backdrop-filter: blur(16rpx);
  border-radius: 24rpx 24rpx 0 0;
  overflow: hidden;
}
.mention-list-header {
  display: flex; align-items: center;
  justify-content: space-between;
  padding: 28rpx; border-bottom: 1rpx solid #f0f0f0;
}
.mention-list-title { font-size: 32rpx; font-weight: 600; color: #1a1a1a; }
.mention-list-scroll { max-height: 50vh; overflow-y: auto; padding: 8rpx 0; }
.mention-list-item {
  display: flex; align-items: center; gap: 16rpx; padding: 20rpx 28rpx;
}
.mention-list-item:active { background: #f5f5f5; }
.mention-list-avatar {
  width: 56rpx; height: 56rpx; border-radius: 50%; background: #eee; flex-shrink: 0;
}
.mention-list-name { flex: 1; font-size: 28rpx; color: #1a1a1a; }
.mention-list-empty { padding: 60rpx; text-align: center; font-size: 28rpx; color: #999; }
```

- [ ] **步骤 6：提交**

```bash
git add packageCommunity/post-edit/post-edit.js packageCommunity/post-edit/post-edit.wxml packageCommunity/post-edit/post-edit.wxss
git commit -m "feat: post-edit 添加提及卡片、编辑解析、昵称刷新"
```

---

### 任务 4：Post-Card 组件——支持 markdown 渲染

**涉及文件：**
- 修改: `components/post-card/post-card.wxml`
- 修改: `components/post-card/post-card.js`
- 修改: `components/post-card/post-card.json`
- 修改: `components/post-card/post-card.wxss`

- [ ] **步骤 1：在 post-card.json 注册 t-chat-markdown**

```json
{
  "component": true,
  "usingComponents": {
    "t-icon": "tdesign-miniprogram/icon/icon",
    "t-chat-markdown": "tdesign-miniprogram/chat-markdown/chat-markdown"
  }
}
```

- [ ] **步骤 2：加 renderMarkdown 属性和点击处理**

修改 `post-card.js`。**保留所有已有的 methods**，只做增加：

在 `properties` 里加：

```javascript
renderMarkdown: { type: Boolean, value: false },
```

在 `data` 里加一个字段用于信息流纯文本显示：

```javascript
displayBody: '',
```

加一个 observers（在 properties 块后面、methods 块前面）：

```javascript
observers: {
  'post.body'(body) {
    if (body) {
      // 信息流（renderMarkdown=false）时把 @[Alice](123) 剥成纯文本 @Alice
      this.setData({
        displayBody: body.replace(/\[([^\]]+)\]\(\d+\)/g, '$1'),
      });
    } else {
      this.setData({ displayBody: '' });
    }
  },
},
```

在 methods 里加：

```javascript
onBodyMarkdownClick(e) {
  const { node } = e.detail || {};
  if (!node) return;
  const href = node.href || '';
  if (/^\d+$/.test(href)) {
    wx.navigateTo({
      url: `/packagePages/user-center/user-center?userId=${href}`,
    });
  }
},
```

- [ ] **步骤 3：修改 wxml 中 body 的渲染方式**

把原来那行：
```html
<view wx:if="{{post.body}}" class="post-body">{{post.body}}</view>
```

替换成：
```html
<view wx:if="{{post.body}}" class="{{renderMarkdown ? 'post-body-full' : 'post-body'}}">
  <t-chat-markdown
    wx:if="{{renderMarkdown}}"
    content="{{post.body}}"
    bind:click="onBodyMarkdownClick"
  />
  <text wx:else>{{displayBody}}</text>
</view>
```

- [ ] **步骤 4：加 markdown 全量的样式**

在 `post-card.wxss` 末尾追加：

```css
.post-body-full {
  font-size: 30rpx;
  color: #666;
  line-height: 1.2;
  margin-bottom: 16rpx;
  word-break: break-word;
}
/* @提及链接用绿色 */
.post-body-full .t-chat-markdown-link {
  color: var(--primary-color, #00b26a);
}
```

- [ ] **步骤 5：提交**

```bash
git add components/post-card/post-card.js components/post-card/post-card.wxml components/post-card/post-card.json components/post-card/post-card.wxss
git commit -m "feat: post-card 支持 renderMarkdown 属性，区分信息流纯文本和详情页 markdown 渲染"
```

---

### 任务 5：Post-Detail 和社区首页——集成 t-chat-markdown

**涉及文件：**
- 修改: `packageCommunity/post-detail/post-detail.wxml`
- 修改: `packageCommunity/post-detail/post-detail.json`
- 修改: `packageCommunity/post-detail/post-detail.wxss`
- 修改: `packageCommunity/post-detail/post-detail.js`

- [ ] **步骤 1：在 post-detail.json 注册 t-chat-markdown**

```json
{
  "usingComponents": {
    "t-icon": "tdesign-miniprogram/icon/icon",
    "t-image": "tdesign-miniprogram/image/image",
    "t-loading": "tdesign-miniprogram/loading/loading",
    "t-popup": "tdesign-miniprogram/popup/popup",
    "t-upload": "tdesign-miniprogram/upload/upload",
    "post-card": "/components/post-card/post-card",
    "t-chat-markdown": "tdesign-miniprogram/chat-markdown/chat-markdown"
  },
  "enablePullDownRefresh": false,
  "navigationBarTitleText": "帖子详情"
}
```

- [ ] **步骤 2：post-card 加 renderMarkdown="{{true}}" 属性**

找到 `<post-card post="{{post}}" ...>`，加 `renderMarkdown="{{true}}"`：

```html
<post-card
  post="{{post}}"
  renderMarkdown="{{true}}"
  showStats="{{false}}"
  expanded="{{todoExpanded}}"
  todoItems="{{todoItems}}"
  ...
/>
```

- [ ] **步骤 3：评论/回复的文本渲染换成 t-chat-markdown**

找到一级评论内容（目前是 `<text class="comment-content">{{item.content}}</text>`）：

```html
<!-- 替换前 -->
<text class="comment-content">{{item.content}}</text>
<!-- 替换后 -->
<t-chat-markdown class="comment-content-md" content="{{item.content}}" bind:click="onMarkdownClick" />
```

找到回复内容（二级和三级，`reply-content`）：

```html
<!-- 替换前 -->
<text class="reply-content">{{reply.content}}</text>
<!-- 替换后 -->
<t-chat-markdown class="reply-content-md" content="{{reply.content}}" bind:click="onMarkdownClick" />
```

同样的 `r2.content` 也换成 t-chat-markdown。

- [ ] **步骤 4：加 onMarkdownClick 处理函数**

在 `post-detail.js` 的 methods 里加：

```javascript
onMarkdownClick(e) {
  const { node } = e.detail || {};
  if (!node) return;
  const href = node.href || '';
  if (/^\d+$/.test(href)) {
    wx.navigateTo({
      url: `/packagePages/user-center/user-center?userId=${href}`,
    });
  }
},
```

- [ ] **步骤 5：加样式**

在 `post-detail.wxss` 末尾追加：

```css
/* @提及链接绿色 */
.comment-content-md .t-chat-markdown-link,
.reply-content-md .t-chat-markdown-link {
  color: var(--primary-color, #00b26a);
}
/* 评论/回复中 t-chat-markdown 的外边距和字体继承 */
.comment-content-md,
.reply-content-md {
  display: block;
  margin: 8rpx 0;
  font-size: 26rpx;
  color: #444;
  line-height: 1.6;
}
```

- [ ] **步骤 6：提交**

```bash
git add packageCommunity/post-detail/post-detail.wxml packageCommunity/post-detail/post-detail.json packageCommunity/post-detail/post-detail.wxss packageCommunity/post-detail/post-detail.js
git commit -m "feat: post-detail 集成 t-chat-markdown 渲染 @提及链接"
```

---

### 任务 6：Post-Detail 评论区 @提及

**涉及文件：**
- 修改: `packageCommunity/post-detail/post-detail.js`
- 修改: `packageCommunity/post-detail/post-detail.wxml`
- 修改: `packageCommunity/post-detail/post-detail.wxss`

**说明：** 评论区的 @和帖子一样——输入检测 `@` 弹搜索 popup，选中后填充，提交时转 markdown。区别是：
- **精简版**：没有「你提到了 X 位用户」卡片
- **与「回复 @XXX」共存**：`replyTarget` 楼中回复机制和 inline @提及互不干扰
- **格式统一**：评论 `content` 存 `@[昵称](id)`，由 t-chat-markdown 渲染（任务 5 已集成）

- [ ] **步骤 1：加 @相关的 data 属性**

在 `post-detail.js` 的 `data` 对象里加：

```javascript
commentAtPopup: false,         // 评论@搜索弹窗
commentAtResults: [],           // 评论@搜索结果
commentAtKeyword: '',           // 评论@搜索关键词
commentMentionsList: [],        // 评论的 mentionsList，每条 { id, nickname, userId }
commentMentionIdCounter: 0,     // commentMentionsList 的 id 计数器
```

- [ ] **步骤 2：替换 onCommentInput，加 @检测 + 搜索 + 关闭方法**

把原来的 `onCommentInput(e) { this.setData({ commentText: e.detail.value }); }` 替换成：

```javascript
onCommentInput(e) {
  const commentText = e.detail.value ?? '';
  this.setData({ commentText });
  this.detectCommentAt(commentText);
},

// 检测评论输入末尾的 @关键词
detectCommentAt(text) {
  const atRegex = /(?:^|\s)@(\S*)$/;
  const match = text.match(atRegex);
  if (match) {
    const keyword = match[1];
    this.setData({ commentAtKeyword: keyword });
    this.searchCommentUsers(keyword);
  } else {
    this.closeCommentAtPopup();
  }
},

// 搜索评论@用户
async searchCommentUsers(keyword) {
  if (!keyword.trim()) { this.closeCommentAtPopup(); return; }
  try {
    const res = await communityApi.searchUsers(keyword);
    if (res.success) {
      this.setData({ commentAtResults: res.data, commentAtPopup: true });
    }
  } catch {
    this.closeCommentAtPopup();
  }
},

// 关闭评论@弹窗
closeCommentAtPopup() {
  this.setData({ commentAtPopup: false, commentAtResults: [], commentAtKeyword: '' });
},
```

- [ ] **步骤 3：加选择用户的处理函数**

```javascript
// 在评论@搜索弹窗中选了一个用户
selectCommentMention(e) {
  const userId = parseInt(e.currentTarget.dataset.id);
  const nickname = e.currentTarget.dataset.nickname;
  const { commentText, commentMentionsList, commentMentionIdCounter } = this.data;

  const atMatch = commentText.match(/(?:^|\s)@(\S*)$/);
  if (!atMatch) { this.closeCommentAtPopup(); return; }

  const atIndex = atMatch.index + (atMatch[0].startsWith('@') ? 0 : atMatch[0].indexOf('@'));
  const beforeAt = commentText.substring(0, atIndex);
  const afterAt = commentText.substring(atIndex + 1 + atMatch[1].length);
  const newText = `${beforeAt}@${nickname} ${afterAt}`;

  const counter = (commentMentionIdCounter || 0) + 1;
  const newEntry = {
    id: `comment_mention_${counter}_${Date.now()}`,
    nickname,
    userId,
  };

  this.setData({
    commentText: newText,
    commentMentionsList: [...commentMentionsList, newEntry],
    commentMentionIdCounter: counter,
  });
  this.closeCommentAtPopup();
},
```

- [ ] **步骤 4：提交时做 markdown 转换**

修改 `submitComment`，在 `const text = this.data.commentText.trim();` 后面加转换逻辑：

```javascript
const rawText = this.data.commentText.trim();
const text = this.convertCommentMentions(rawText);
```

然后 payload 里用这个 `text`（不是 `this.data.commentText`）。

```javascript
await communityApi.createComment(this.data.postId, {
  content: text,     // 用转换后的
  images: ...,
  parentId: ...,
  replyToUserId: ...
});
```

提交成功后重置时加一行清 `mentionsList`：

```javascript
this.setData({
  commentText: '', replyTarget: null, replyParentId: null, replyToUserId: null,
  commentFiles: [], commentImageUrls: [], inputFocused: false,
  commentMentionsList: [],   // 重置 @提及记录
});
```

加转换方法：

```javascript
// 评论版的 convertMentionsInText
convertCommentMentions(text) {
  const { commentMentionsList } = this.data;
  if (!text || !commentMentionsList.length) return text;
  let result = text;
  const seen = new Set();
  for (const entry of commentMentionsList) {
    if (seen.has(entry.userId)) continue;
    seen.add(entry.userId);
    const escaped = entry.nickname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?<=^|\\s)@${escaped}(?=\\s|$|[\\p{P}])`, 'u');
    const newResult = result.replace(regex, `@[${entry.nickname}](${entry.userId})`);
    if (newResult !== result) result = newResult;
  }
  return result;
},
```

- [ ] **步骤 5：在 wxml 加 @搜索弹窗**

在底部输入栏区域（`<view class="bottom-input-bar">` 内部或后面）加：

```html
<!-- 评论 @用户搜索弹窗 -->
<t-popup
  visible="{{commentAtPopup}}"
  placement="bottom"
  close-on-overlay-click="{{true}}"
  overlay-style="background:none"
>
  <view class="at-popup">
    <view class="at-popup-header">
      <text class="at-popup-title">提及用户</text>
      <view class="at-popup-close" catch:tap="closeCommentAtPopup">
        <t-icon name="close" size="32rpx" color="#999" />
      </view>
    </view>
    <scroll-view class="at-popup-scroll" scroll-y wx:if="{{commentAtResults.length > 0}}">
      <view
        class="at-user-item"
        wx:for="{{commentAtResults}}" wx:key="id"
        catch:tap="selectCommentMention"
        data-id="{{item.id}}"
        data-nickname="{{item.nickname}}"
      >
        <image class="at-user-avatar" src="{{item.avatar || '/images/avatar.png'}}" mode="aspectFill" />
        <text class="at-user-name">{{item.nickname}}</text>
      </view>
    </scroll-view>
    <view wx:else class="at-popup-empty">
      <text wx:if="{{!commentAtKeyword}}">输入昵称搜索用户</text>
      <text wx:else>未找到匹配的用户</text>
    </view>
  </view>
</t-popup>
```

- [ ] **步骤 6：加 @弹窗样式（复用 post-edit 的即可）**

在 `post-detail.wxss` 末尾追加（和 post-edit 的 .at-popup 样式一样）：

```css
/* ===== 评论@提及弹窗 ===== */
.at-popup {
  max-height: 50vh;
  background: rgba(255,255,255,0.95);
  backdrop-filter: blur(16rpx);
  -webkit-backdrop-filter: blur(16rpx);
  border-radius: 24rpx 24rpx 0 0;
  overflow: hidden;
}
.at-popup-header {
  display: flex; align-items: center;
  justify-content: space-between;
  padding: 24rpx 28rpx;
  border-bottom: 1rpx solid #f0f0f0;
}
.at-popup-title { font-size: 30rpx; font-weight: 600; color: #1a1a1a; }
.at-popup-close { padding: 8rpx; }
.at-popup-scroll { max-height: 40vh; overflow-y: auto; padding: 16rpx 0; }
.at-user-item {
  display: flex; align-items: center; gap: 16rpx;
  padding: 20rpx 28rpx;
}
.at-user-item:active { background: #f5f5f5; }
.at-user-avatar {
  width: 56rpx; height: 56rpx; border-radius: 50%; flex-shrink: 0;
}
.at-user-name { font-size: 28rpx; color: #1a1a1a; }
.at-popup-empty { padding: 40rpx; text-align: center; font-size: 28rpx; color: #999; }
```

- [ ] **步骤 7：提交**

```bash
git add packageCommunity/post-detail/post-detail.js packageCommunity/post-detail/post-detail.wxml packageCommunity/post-detail/post-detail.wxss
git commit -m "feat: post-detail 评论区添加@提及功能"
```

---

### 自检清单

- [ ] 全部覆盖：@检测 ✅、用户搜索弹窗 ✅、markdown 存储 ✅、t-chat-markdown 渲染 ✅、绿色链接 ✅、提及卡片实时数 ✅、编辑解析 ✅、昵称自动刷新 ✅、只读用户列表弹窗 ✅
- [ ] 没有占位符：无 "TBD"、"TODO"、"后续实现" 等
- [ ] 命名一致：`renderMarkdown` 在 post-card 和 post-detail 一致、`mentionsList` 各方法间字段名一致
