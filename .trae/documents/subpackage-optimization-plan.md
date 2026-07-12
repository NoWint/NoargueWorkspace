# 微信小程序分包优化计划

## 一、背景分析

### 当前项目结构

项目共有 **37个页面**，全部在主包中，可能导致主包体积过大。

### 微信小程序分包限制

* 整个小程序所有分包大小不超过 **30M**

* 单个分包/主包大小不能超过 **2M**

* tabBar 页面必须在主包内

* 分包可以引用主包的资源，但分包之间不能互相引用

## 二、分包划分方案

### 主包页面（必须保留）

这些页面是核心功能或 tabBar 页面，必须放在主包：

| 页面                            | 原因        |
| ----------------------------- | --------- |
| pages/todo/todo               | tabBar 页面 |
| pages/calendar/calendar       | tabBar 页面 |
| pages/stats/stats             | tabBar 页面 |
| pages/more/more               | tabBar 页面 |
| pages/add-todo/add-todo       | 核心功能，多处引用 |
| pages/todo-detail/todo-detail | 核心功能，多处引用 |
| pages/todo-search/todo-search | 核心功能      |
| pages/login/login             | 核心功能      |
| pages/user-center/user-center | 核心功能      |
| pages/trash/trash             | 核心功能      |
| pages/tag-manage/tag-manage   | 核心功能      |
| pages/datamanage/datamanage   | 核心功能      |
| pages/changelog/changelog     | 核心功能      |
| pages/notice/notice           | 核心功能      |
| pages/guide/guide             | 核心功能      |
| pages/day-todos/day-todos     | 核心功能      |
| pages/daily-stats/daily-stats | 核心功能      |

**主包页面数量：17个**

### 分包一：admin（管理后台）

管理员专用功能，普通用户不会访问：

| 页面                                        | 说明     |
| ----------------------------------------- | ------ |
| pages/admin/index/index                   | 管理后台首页 |
| pages/admin/users/users                   | 用户管理   |
| pages/admin/user-detail/user-detail       | 用户详情   |
| pages/admin/notices/notices               | 公告管理   |
| pages/admin/notice-edit/notice-edit       | 公告编辑   |
| pages/admin/changelog/changelog           | 更新日志管理 |
| pages/admin/changelog-edit/changelog-edit | 日志编辑   |

**admin分包页面数量：7个**

### 分包二：combo（组合协作）

组合和协作相关功能：

| 页面                                | 说明      |
| --------------------------------- | ------- |
| pages/combo-edit/combo-edit       | 创建/编辑组合 |
| pages/combo-detail/combo-detail   | 组合详情    |
| pages/collaboration/collaboration | 协作管理    |
| pages/join-collab/join-collab     | 加入协作    |
| pages/combo-stats/combo-stats     | 组合统计    |

**combo分包页面数量：5个**

### 分包三：tools（小工具）

独立的小工具功能：

| 页面                                          | 说明    |
| ------------------------------------------- | ----- |
| pages/eating/eating                         | 今天吃什么 |
| pages/password-generator/password-generator | 密码生成器 |
| pages/motivation/motivation                 | 每日激励  |
| pages/star/star                             | 收藏待办  |
| pages/acknowledge/acknowledge               | 致谢名单  |

**tools分包页面数量：5个**

### 可选分包四：stats（统计分析）

如果主包仍然过大，可考虑：

| 页面                            | 说明             |
| ----------------------------- | -------------- |
| pages/stats/stats             | tabBar页面，必须在主包 |
| pages/daily-stats/daily-stats | 可移至分包          |

## 三、依赖关系分析

### Admin分包依赖

* `utils/api.js` 中的 `adminApi`（主包）

* `app.globalData`（主包）

* TDesign 组件（主包 miniprogram\_npm）

### Combo分包依赖

* `utils/api.js` 中的 `combosApi`, `collabApi`, `notifyApi`（主包）

* `utils/sync.js`（主包）

* `utils/util.js`（主包）

* `app.globalData`（主包）

* 微信同声传译插件（全局）

* TDesign 组件（主包 miniprogram\_npm）

### Tools分包依赖

* `utils/api.js`（主包）

* `app.globalData`（主包）

* TDesign 组件（主包 miniprogram\_npm）

## 四、app.json 配置修改

```json
{
  "pages": [
    "pages/todo/todo",
    "pages/todo-search/todo-search",
    "pages/calendar/calendar",
    "pages/stats/stats",
    "pages/daily-stats/daily-stats",
    "pages/more/more",
    "pages/guide/guide",
    "pages/add-todo/add-todo",
    "pages/todo-detail/todo-detail",
    "pages/datamanage/datamanage",
    "pages/changelog/changelog",
    "pages/day-todos/day-todos",
    "pages/user-center/user-center",
    "pages/login/login",
    "pages/notice/notice",
    "pages/acknowledge/acknowledge",
    "pages/trash/trash",
    "pages/tag-manage/tag-manage"
  ],
  "subPackages": [
    {
      "root": "packageAdmin",
      "name": "admin",
      "pages": [
        "index/index",
        "users/users",
        "user-detail/user-detail",
        "notices/notices",
        "notice-edit/notice-edit",
        "changelog/changelog",
        "changelog-edit/changelog-edit"
      ]
    },
    {
      "root": "packageCombo",
      "name": "combo",
      "pages": [
        "combo-edit/combo-edit",
        "combo-detail/combo-detail",
        "collaboration/collaboration",
        "join-collab/join-collab",
        "combo-stats/combo-stats"
      ]
    },
    {
      "root": "packageTools",
      "name": "tools",
      "pages": [
        "eating/eating",
        "password-generator/password-generator",
        "motivation/motivation",
        "star/star",
        "acknowledge/acknowledge"
      ]
    }
  ],
  "preloadRule": {
    "pages/todo/todo": {
      "network": "all",
      "packages": ["combo"]
    },
    "pages/more/more": {
      "network": "all",
      "packages": ["tools"]
    }
  }
}
```

## 五、实施步骤

### 步骤1：创建分包目录结构

```
├── packageAdmin/
│   ├── index/
│   ├── users/
│   ├── user-detail/
│   ├── notices/
│   ├── notice-edit/
│   ├── changelog/
│   └── changelog-edit/
├── packageCombo/
│   ├── combo-edit/
│   ├── combo-detail/
│   ├── collaboration/
│   ├── join-collab/
│   └── combo-stats/
└── packageTools/
    ├── eating/
    ├── password-generator/
    ├── motivation/
    ├── star/
    └── acknowledge/
```

### 步骤2：移动页面文件

将对应页面从 `pages/` 目录移动到分包目录

### 步骤3：更新页面路径引用

需要更新以下文件中的路径：

1. `app.json` - 页面路径配置
2. 各页面 JS 文件中的 `require` 路径
3. 各页面 JSON 文件中的组件引用路径
4. 其他页面中的 `wx.navigateTo` 跳转路径

### 步骤4：更新 require 路径

分包页面引用主包资源时，路径需要调整：

```javascript
// 原来
const { adminApi } = require('../../../utils/api');

// 分包后
const { adminApi } = require('../../utils/api');
```

### 步骤5：更新跳转路径

所有跳转到分包页面的路径需要更新：

```javascript
// 原来
wx.navigateTo({ url: '/pages/admin/index/index' });

// 分包后
wx.navigateTo({ url: '/packageAdmin/index/index' });
```

## 六、需要修改的文件清单

### 需要更新跳转路径的页面

1. `pages/more/more.js` - 跳转到 admin、eating、password-generator、motivation、star
2. `pages/todo/todo.js` - 跳转到 combo-edit、combo-detail、collaboration、join-collab
3. `pages/add-todo/add-todo.js` - 跳转到 combo-edit
4. `pages/user-center/user-center.js` - 可能跳转到 admin

### 分包页面需要修改的文件

每个分包页面需要：

1. 修改 JS 文件中的 require 路径
2. 修改 JSON 文件中的组件引用路径
3. 修改 WXML 文件中的组件引用（如有自定义组件）
4. 修改页面内的跳转路径

## 七、注意事项

### 1. 组件引用

TDesign 组件在 `miniprogram_npm/tdesign-miniprogram`，分包页面可以直接引用主包的 npm 组件。

### 2. 图片资源

`images/` 目录在主包，分包页面可以正常引用。

### 3. 全局样式

`app.wxss` 中的全局样式对所有页面生效。

### 4. 插件配置

微信同声传译插件在 `app.json` 中全局配置，分包页面可以正常使用。

### 5. 分包预下载

配置 `preloadRule` 可以在用户访问主包页面时预下载分包，提升用户体验。

## 八、预期效果

### 体积优化

* **主包**：保留核心功能页面，预计减少约 30-40% 体积

* **admin分包**：管理员专用，普通用户不会下载

* **combo分包**：按需加载，使用组合功能时才下载

* **tools分包**：按需加载，使用小工具时才下载

### 用户体验优化

* 首次启动更快（主包变小）

* 按需加载非核心功能

* 预下载配置提升切换速度

## 九、风险评估

### 低风险

* Admin 分包完全独立，普通用户不受影响

* Tools 分包功能独立，无跨页面依赖

### 中等风险

* Combo 分包与主包有数据交互（globalData），需要确保数据访问正常

* combo-detail 页面与 add-todo 页面有交互，需要测试跳转和数据传递

### 缓解措施

1. 分阶段实施，先迁移 admin 分包测试
2. 充分测试分包页面的功能完整性
3. 测试分包与主包的数据交互
4. 验证分包预下载效果

## 十、实施优先级

1. **第一阶段**：admin 分包（风险最低，收益明显）
2. **第二阶段**：tools 分包（功能独立，易于迁移）
3. **第三阶段**：combo 分包（需要更多测试）

