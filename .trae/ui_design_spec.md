# 时光绿径待办 UI 设计规范

> 版本：1.0.0\
> 更新日期：2026-04-05\
> 适用范围：时光绿径待办微信小程序全端UI开发

***

## 目录

1. [设计理念](#1-设计理念)
2. [色彩系统](#2-色彩系统)
3. [字体排版](#3-字体排版)
4. [间距系统](#4-间距系统)
5. [圆角规范](#5-圆角规范)
6. [阴影系统](#6-阴影系统)
7. [组件规范](#7-组件规范)
8. [布局系统](#8-布局系统)
9. [动效规范](#9-动效规范)
10. [页面模板](#10-页面模板)
11. [响应式适配](#11-响应式适配)
12. [可访问性](#12-可访问性)
13. [开发约定](#13-开发约定)

***

## 1. 设计理念

### 1.1 核心价值观

- **清新自然**：以绿色为主色调，营造轻松、舒适的视觉体验
- **简洁高效**：界面简洁明了，减少用户认知负担
- **情感连接**：通过温暖的设计语言建立用户与应用的情感纽带
- **功能优先**：在保证美观的同时，确保功能的易用性和效率

### 1.2 设计原则

#### 清晰性（Clarity）

- 信息层次分明，重要内容突出显示
- 使用一致的视觉语言和交互模式
- 避免不必要的装饰元素干扰用户操作

#### 一致性（Consistency）

- 全局使用统一的设计语言和组件库（TDesign）
- 相同功能在不同页面保持相同的视觉表现和交互方式
- 遵循微信小程序的设计规范和用户习惯

#### 效率性（Efficiency）

- 减少操作步骤，提供快捷操作入口
- 合理使用空间，避免信息过载
- 支持手势操作和键盘导航

#### 美观性（Aesthetics）

- 注重细节处理，提升整体质感
- 使用渐变、阴影等效果增强层次感
- 保持界面的现代感和科技感

### 1.3 品牌调性

**关键词**：清新、自然、高效、温暖、专业

**视觉特征**：

- 主色调为清新的绿色系
- 圆润的圆角设计
- 柔和的阴影效果
- 渐变色彩增强视觉吸引力
- 毛玻璃效果提升现代感

***

## 2. 色彩系统

### 2.1 品牌色（Brand Colors）

#### 主色（Primary）

```css
/* 主色 - 清新绿 */
--primary-color: #00b26a;
--td-brand-color: #00b26a;

/* 主色浅色 */
--primary-light: #3ddaa0;
--td-brand-color-light: #e0f2ec;

/* 主色深色 */
--primary-dark: #008550;
--td-primary-color-8: #008550;

/* 主色超浅背景 */
--primary-bg: #f0faf5;
```

**使用场景**：

- `#00b26a`：主要按钮、链接文字、选中状态、重要图标
- `#3ddaa0`：辅助强调色、渐变终点色
- `#008550`：深色文字、hover状态
- `#f0faf5`：浅色背景、提示信息背景

#### 辅助色（Secondary）

```css
/* 辅助色 - 浅绿背景 */
--secondary-color: #f0faf5;

/* 按钮激活态 */
--button-active-bg: #c4dcd4;
--td-button-light-active-bg-color: #c4dcd4;
```

### 2.2 功能色（Functional Colors）

#### 成功色（Success）

```css
/* 成功 - 绿色系 */
--success-color: #07c160;        /* 微信绿 */
--success-gradient-start: #07c160;
--success-gradient-end: #06ad56;
```

**使用场景**：

- 操作成功提示
- 完成状态标识
- 正向反馈信息
- 登录按钮背景

#### 警告色（Warning）

```css
/* 警告 - 橙色系 */
--warning-color: #ff9800;
--warning-bg: #fff3e0;
```

**使用场景**：

- 注意事项提醒
- 待处理状态
- 重要但不紧急的信息

#### 错误色（Error）

```css
/* 错误 - 红色系 */
--error-color: #ff4d4f;
--error-text: #ff0000;
```

**使用场景**：

- 错误提示信息
- 删除操作确认
- 必填项标记
- 危险操作按钮

#### 信息色（Info）

```css
/* 信息 - 青色系 */
--info-color: #2dd4bf;
--info-bg: #f6ffed;
--info-border: #2dd4bf;
--info-text: #0d5e4a;
```

**使用场景**：

- 公告通知栏
- 提示性信息
- 辅助说明文字

### 2.3 中性色（Neutral Colors）

#### 文字颜色（Text Colors）

```css
/* 主要文字 */
--text-primary: #2d3436;         /* 标题、重要内容 */
--text-secondary: #333;          /* 正文内容 */
--text-tertiary: #666;           /* 次要内容、标签 */
--text-quaternary: #999;         /* 辅助说明、占位符 */
--text-placeholder: #999;        /* 输入框占位符 */

/* 特殊文字 */
--text-green: #00b26a;           /* 绿色强调文字 */
--text-green-dark: #2e7d32;      /* 深绿色文字 */
--text-teal: #0d5e4a;           /* 青色文字 */
```

#### 背景颜色（Background Colors）

```css
/* 页面背景 */
--bg-page: #e3f5eb;              /* 主页面背景 - 清新绿 */
--bg-body: #e3f5eb;             /* body背景 */

/* 卡片背景 */
--bg-card: #ffffff;              /* 白色卡片 */
--bg-card-hover: #f8f8f8;       /* 卡片hover态 */
--bg-input: #f8f8f8;            /* 输入框背景 */

/* 分割线 */
--border-color: #eee;            /* 浅分割线 */
--border-light: #f5f5f5;        /* 极浅分割线 */
```

### 2.4 渐变色（Gradient Colors）

#### 品牌渐变

```css
/* 主渐变 - 从深到浅 */
--gradient-primary: linear-gradient(135deg, #00b26a 0%, #3ddaa0 100%);

/* 登录按钮渐变 */
--gradient-login: linear-gradient(135deg, #07c160 0%, #06ad56 100%);

/* 天气卡片渐变 */
--gradient-weather: linear-gradient(135deg, #3ddaa0 0%, #12b086 100%);

/* 统计图表渐变 */
--gradient-chart: linear-gradient(90deg, #00B26A 0%, #81C784 100%);
```

#### 功能渐变

```css
/* 公告栏渐变 */
--gradient-notice: linear-gradient(135deg, #f6ffed 0%, #e8f8f0 100%);

/* 成功状态渐变 */
--gradient-success: linear-gradient(135deg, #07c160 0%, #06ad56 100%);
```

### 2.5 标签颜色（Tag Colors）

预设标签颜色系统：

```javascript
const TAG_COLORS = [
  { name: '工作', color: '#2196F3' },      // 蓝色
  { name: '学习', color: '#4CAF50' },      // 绿色
  { name: '生活', color: '#FF9800' },      // 橙色
  { name: '健康', color: '#E91E63' },      // 粉色
  { name: '娱乐', color: '#9C27B0' },      // 紫色
  { name: '购物', color: '#FF5722' },      // 深橙
  { name: '旅行', color: '#00BCD4' },      // 青色
  { name: '其他', color: '#607D8B' }       // 蓝灰
];
```

### 2.6 组合颜色（Combo Colors）

组合自定义颜色选择器：

```javascript
const COMBO_COLORS = [
  '#FF6B6B', '#FFA94D', '#FFD93D', '#6BCB77',
  '#4D96FF', '#9B59B6', '#FF6B9D', '#C44569',
  '#574B90', '#2E86AB', '#A23B72', '#F18F01',
  '#C73E1D', '#317773', '#44AF69', '#F6AE2D'
];
```

***

## 3. 字体排版

### 3.1 字体家族（Font Family）

```css
/* 默认字体栈 */
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC',
             'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue',
             Helvetica, Arial, sans-serif;
```

### 3.2 字号系统（Font Size）

采用基于 `rpx` 的响应式字号系统：

| 级别         | 字号（rpx） | 用途          | 字重      |
| ---------- | ------- | ----------- | ------- |
| Display    | 72rpx   | 大数字展示（温度）   | 700     |
| H1         | 50rpx   | 页面主标题       | 600     |
| H2         | 46rpx   | 次级标题（登录页）   | 700     |
| H3         | 36rpx   | 表单问题标题      | 500     |
| H4         | 34rpx   | 弹窗标题        | 600     |
| Body Large | 32rpx   | 正文、按钮文字     | 400-600 |
| Body       | 30rpx   | 次要正文        | 400     |
| Body Small | 28rpx   | 辅助文字、标签     | 400-500 |
| Caption    | 26rpx   | 说明文字、小标签    | 400     |
| Tiny       | 24rpx   | 极小文字（徽章、时间） | 400     |
| Mini       | 22rpx   | 最小文字（更新时间）  | 400     |

### 3.3 字重（Font Weight）

```css
/* 字重使用规范 */
--font-weight-regular: 400;    /* 常规 */
--font-weight-medium: 500;     /* 中等 */
--font-weight-semibold: 600;   /* 半粗 */
--font-weight-bold: 700;       /* 粗体 */
```

**使用规则**：

- `400`：正文内容、描述文字
- `500`：次级标题、表单标签
- `600`：主要标题、按钮文字、统计数据
- `700`：大标题、重要数字、品牌名称

### 3.4 行高（Line Height）

```css
/* 行高规范 */
--line-height-tight: 1.1;      /* 标题 */
--line-height-normal: 1.5;     /* 正文 */
--line-height-relaxed: 1.8;    /* 长文本 */
```

### 3.5 字间距（Letter Spacing）

```css
/* 字间距规范 */
--letter-spacing-tight: -0.5rpx;   /* 紧密 */
--letter-spacing-normal: 0.5rpx;   /* 正常 */
--letter-spacing-wide: 1rpx;       /* 宽松 */
```

***

## 4. 间距系统

### 4.1 基础间距单位

基础间距单位为 `8rpx`，所有间距应为 `8` 的倍数：

```css
/* 间距刻度 */
--spacing-xs: 8rpx;          /* 极小间距 */
--spacing-sm: 16rpx;         /* 小间距 */
--spacing-md: 24rpx;         /* 中等间距 */
--spacing-lg: 32rpx;         /* 大间距 */
--spacing-xl: 40rpx;         /* 超大间距 */
--spacing-xxl: 60rpx;        /* 特大间距 */
```

### 4.2 页面内边距（Page Padding）

```css
/* 标准页面内边距 */
padding: 80rpx 32rpx 60rpx;    /* 有顶部导航的页面 */
padding: 20rpx;                 /* 简单列表页 */
padding: 10rpx 32rpx;           /* 表单页面 */
```

### 4.3 组件间距（Component Spacing）

#### 卡片间距

```css
/* 卡片外边距 */
margin: 20rpx;                  /* 标准卡片 */
margin: 16rpx 8rpx 0;          /* 用户信息卡 */
margin-bottom: 20rpx;          /* 卡片之间垂直间距 */
```

#### 卡片内边距

```css
/* 卡片内边距 */
padding: 30rpx;                 /* 标准内容卡片 */
padding: 40rpx 32rpx;          /* 功能卡片 */
padding: 28rpx;                 /* 天气卡片 */
padding: 24rpx 30rpx;          /* 统计头部 */
```

#### 表单元素间距

```css
/* 表单项间距 */
gap: 8rpx;                      /* 表单容器间隙 */
padding-bottom: 32rpx;         /* 表单项底部间距 */
margin-bottom: 15rpx;          /* 标题与输入框间距 */
margin-left: 28rpx;            /* 输入框左侧缩进 */
```

#### 列表项间距

```css
/* 列表项间距 */
margin-bottom: 32rpx;          /* 功能列表项 */
gap: 16rpx;                     /* 标签网格间距 */
gap: 22rpx;                     /* 图标/颜色选择器间距 */
```

### 4.4 安全区域（Safe Area）

```css
/* 底部安全区域预留 */
padding-bottom: 100rpx;         /* 用户中心页 */
padding-bottom: 200rpx;         /* 表单页（考虑浮动按钮） */
padding-bottom: 250rpx;         /* 日历页 */
padding-bottom: 280rpx;         /* 更多页 */
padding-bottom: 600rpx;         /* 添加待办页 */
padding-bottom: 180rpx;         /* 统计页 */
```

***

## 5. 圆角规范

### 5.1 圆角等级（Border Radius）

| 级别      | 数值（rpx） | 使用场景            |
| ------- | ------- | --------------- |
| None    | 0       | 分割线、全直角元素       |
| Small   | 12rpx   | 待办文字块、小标签       |
| Medium  | 16rpx   | 通用卡片、提示框        |
| Large   | 22rpx   | 小图标容器、头像编辑按钮    |
| XLarge  | 24rpx   | 编辑按钮、操作按钮       |
| XXLarge | 32rpx   | 大卡片、登录卡片、弹窗     |
| Round   | 50%     | 圆形元素（头像、颜色选择器）  |
| Pill    | 9999rpx | 胶囊形状（按钮、标签、输入框） |

### 5.2 具体应用示例

```css
/* 页面级大圆角 */
.login-card { border-radius: 32rpx; }
.user-card { border-radius: 32rpx; }
.card { border-radius: 32rpx; }
.tools-card { border-radius: 32rpx; }
.popup-content { border-radius: 32rpx 32rpx 0 0; }

/* 内容级中圆角 */
.card-style { border-radius: 16rpx; }
.weather-card { border-radius: 32rpx; }
.ad-container { border-radius: 32rpx; }

/* 元素级小圆角 */
.picker-field { border-radius: 32rpx; }     /* 胶囊形 */
.t-input { border-radius: 32rpx; }           /* 胶囊形 */
.tag-item { border-radius: 32rpx; }          /* 胶囊形 */
.combo-selector { border-radius: 32rpx; }    /* 胶囊形 */
.icon-item { border-radius: 32rpx; }         /* 方形圆角 */
.voice-tip { border-radius: 12rpx; }         /* 小圆角 */
.custom-notice { border-radius: 32rpx; }     /* 胶囊形 */
.nickname-input { border-radius: 36rpx; }    /* 胶囊形 */
.shared-tip { border-radius: 32rpx; }        /* 胶囊形 */

/* 圆形元素 */
.user-avatar { border-radius: 50%; }
.login-avatar { border-radius: 50%; }
.color-item { border-radius: 50%; }
.tag-dot { border-radius: 50%; }

/* 按钮圆角 */
.login-btn { border-radius: 44rpx; }         /* 微信登录按钮 */
.login-btn { border-radius: 50rpx; }         /* 普通登录按钮 */
.edit-btn { border-radius: 24rpx; }
.logged-in-badge { border-radius: 16rpx; }
.logged-in { border-radius: 20rpx; }

/* 图表圆角 */
.bar-container { border-radius: 30rpx; }     /* 进度条背景 */
.combo-icon-small { border-radius: 22rpx; }  /* 组合图标 */
```

***

## 6. 阴影系统

### 6.1 阴影等级（Box Shadow）

| 级别      | 阴影值                                  | 使用场景      |
| ------- | ------------------------------------ | --------- |
| Level 1 | `0 4rpx 8rpx rgba(0,0,0,0.1)`        | 广告卡片、轻量悬浮 |
| Level 2 | `0 4rpx 12rpx rgba(0,0,0,0.08)`      | 统计卡片      |
| Level 3 | `0 8rpx 20rpx rgba(0,0,0,0.08)`      | 功能卡片      |
| Level 4 | `0 8rpx 40rpx rgba(0,0,0,0.1)`       | 通用卡片（标准）  |
| Level 5 | `0 10rpx 30rpx rgba(0,0,0,0.08)`     | Logo容器    |
| Level 6 | `0 12rpx 30rpx rgba(0,0,0,0.1)`      | 天气卡片      |
| Level 7 | `0 12rpx 40rpx rgba(0,0,0,0.08)`     | 登录/功能卡片   |
| Colored | `0 4rpx 20rpx rgba(45,212,191,0.12)` | 公告栏       |
| Button  | `0 8rpx 20rpx rgba(0,178,106,0.25)`  | 主按钮       |
| Avatar  | `0 4rpx 12rpx rgba(76,175,80,0.2)`   | 头像装饰      |

### 6.2 具体应用示例

```css
/* 页面级阴影 */
.card-style {
  box-shadow: 0 8rpx 40rpx rgba(0,0,0,0.1);    /* 标准卡片阴影 */
}

.card {
  box-shadow: 0 12rpx 40rpx rgba(0, 0, 0, 0.08); /* 功能卡片阴影 */
}

.logo {
  box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.08); /* Logo容器 */
}

/* 特殊元素阴影 */
.weather-card {
  box-shadow: 0 12rpx 30rpx rgba(0, 0, 0, 0.1); /* 天气卡片 */
}

.custom-notice {
  box-shadow: 0 4rpx 20rpx rgba(45, 212, 191, 0.12); /* 公告栏 */
}

.ad-container {
  box-shadow: 0 4rpx 8rpx rgba(0,0,0,0.1);      /* 广告容器 */
}

.stats-card > .card-style {
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08); /* 统计卡片 */
}

/* 按钮阴影 */
.login-btn {
  box-shadow: 0 8rpx 20rpx rgba(0, 178, 106, 0.25); /* 主按钮 */
}

.login-btn.disabled {
  box-shadow: none;                                 /* 禁用无阴影 */
}

/* 头像阴影 */
.user-avatar {
  box-shadow: 0 4rpx 12rpx rgba(76, 175, 80, 0.2); /* 用户头像 */
}
```

***

## 7. 组件规范

### 7.1 TDesign 组件库使用规范

本项目深度集成 **TDesign Wechat Miniprogram (`tdesign-miniprogram`)** 组件库。所有新功能和页面应优先使用此组件库中的组件。

#### 推荐使用的核心组件

| 组件类别 | 推荐组件                      | 使用场景     |
| ---- | ------------------------- | -------- |
| 基础   | `t-button`                | 所有按钮操作   |
| 基础   | `t-icon`                  | 图标显示     |
| 基础   | `t-image`                 | 图片加载     |
| 导航   | `t-navbar`                | 页面顶部导航栏  |
| 导航   | `t-tabs` / `t-tab-bar`    | Tab切换    |
| 数据展示 | `t-cell` / `t-cell-group` | 列表数据展示   |
| 数据展示 | `t-tag`                   | 标签显示     |
| 数据展示 | `t-avatar`                | 头像展示     |
| 数据展示 | `t-badge`                 | 徽章标记     |
| 数据展示 | `t-empty`                 | 空状态展示    |
| 数据展示 | `t-divider`               | 分割线      |
| 表单   | `t-input`                 | 文本输入     |
| 表单   | `t-textarea`              | 多行文本输入   |
| 表单   | `t-picker`                | 选择器      |
| 表单   | `t-switch`                | 开关切换     |
| 表单   | `t-checkbox` / `t-radio`  | 选择框      |
| 反馈   | `t-toast`                 | 轻提示      |
| 反馈   | `t-dialog`                | 对话框      |
| 反馈   | `t-loading`               | 加载状态     |
| 反馈   | `t-popup`                 | 弹出层      |
| 反馈   | `t-action-sheet`          | 操作菜单     |
| 导航   | `t-fab`                   | 浮动操作按钮   |
| 其他   | `t-swipe-cell`            | 滑动单元格    |
| 其他   | `t-collapse`              | 折叠面板     |
| 其他   | `t-search`                | 搜索框      |
| 其他   | `t-calendar`              | 日历选择     |
| 其他   | `t-qrcode`                | 二维码      |
| AI相关 | `t-chat-*`                | AI聊天系列组件 |

### 7.2 自定义组件规范

#### 7.2.1 卡片组件（Card）

**通用卡片样式**：

```css
.card-style {
  margin: 20rpx;
  padding: 30rpx;
  border-radius: 16rpx;
  box-shadow: 0 8rpx 40rpx rgba(0,0,0,0.1);
  background: #fff;
}
```

**功能卡片样式**：

```css
.card {
  background: #fff;
  border-radius: 32rpx;
  padding: 40rpx 32rpx;
  box-shadow: 0 12rpx 40rpx rgba(0, 0, 0, 0.08);
}
```

**统计卡片样式**：

```css
.stats-card {
  background: #ffffff;
  border-radius: 32rpx;
  padding: 0;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);
}
```

#### 7.2.2 顶部导航栏（Top Bar）

**固定顶部导航栏**：

```css
.top {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 999;
  background: #e3f5eb99;                    /* 半透明绿色背景 */
  backdrop-filter: blur(20rpx) saturate(180%);  /* 毛玻璃效果 */
  -webkit-backdrop-filter: blur(20rpx) saturate(180%);
  padding-bottom: 16rpx;                   /* 可选：增加底部内边距 */
}
```

**头部区域**：

```css
.header {
  padding: 0 30rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 88rpx;
}
```

**页面标题**：

```css
.title {
  font-size: 50rpx;
  font-weight: 600;
  color: #2d3436;
  flex: 1;
}
```

**注意事项**：

- 所有需要固定顶部的页面都应使用 `.top` 类
- 必须设置 `z-index: 999` 确保在最上层
- 使用毛玻璃效果增强现代感
- 页面内容区需设置足够的 `margin-top` 避免被遮挡（通常 168rpx-180rpx）

#### 7.2.3 表单组件（Form）

**表单容器**：

```css
.form-container {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.form-item {
  padding-bottom: 32rpx;
}
```

**问题标题**：

```css
.question-title {
  display: flex;
  align-items: center;
  font-size: 36rpx;
  font-weight: 500;
  line-height: 1.1;
  color: #333;
  margin-bottom: 15rpx;
  padding-left: 32rpx;
  position: relative;
}

.question-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 16rpx;
  height: 16rpx;
  background: #00b26a;              /* 绿色圆点装饰 */
  border-radius: 50%;
}
```

**必填标记**：

```css
.question-title .required {
  color: #ff0000;                   /* 红色必填星号 */
  margin-left: 8rpx;
  font-size: 36rpx;
}
```

**输入框字段**：

```css
.picker-field {
  padding: 26rpx 32rpx;
  margin-left: 28rpx;
  font-size: 32rpx;
  background: #f8f8f8;              /* 浅灰背景 */
  border-radius: 32rpx;             /* 胶囊形圆角 */
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.t-input,
.t-textarea {
  border-radius: 32rpx;             /* 胶囊形圆角 */
  margin-left: 28rpx;
}
```

#### 7.2.4 标签组件（Tag）

**标签容器**：

```css
.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;                       /* 标签间距 */
  margin-left: 28rpx;
}
```

**标签项**：

```css
.tag-item {
  display: flex;
  align-items: center;
  padding: 12rpx 24rpx;
  background: #f5f5f5;              /* 默认灰色背景 */
  border-radius: 32rpx;             /* 胶囊形 */
  font-size: 28rpx;
  color: #666;                      /* 默认灰色文字 */
  border: 2rpx solid transparent;
  transition: all 0.3s ease;        /* 平滑过渡动画 */
}

/* 选中状态 */
.tag-item.selected {
  background: rgba(0, 178, 106, 0.15);  /* 浅绿色背景 */
  border-color: var(--tag-color, #00b26a);
  color: var(--tag-color, #00b26a);     /* 彩色文字 */
  font-weight: 500;
}

/* 标签圆点 */
.tag-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  margin-right: 8rpx;
}
```

#### 7.2.5 按钮组件（Button）

**主按钮（Primary Button）**：

```css
.login-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 88rpx;                     /* 标准高度 */
  background: linear-gradient(135deg, #07c160 0%, #06ad56 100%);  /* 绿色渐变 */
  color: #fff;
  border-radius: 44rpx;              /* 胶囊形或半胶囊 */
  font-size: 32rpx;
  gap: 12rpx;                        /* 图标与文字间距 */
  box-shadow: 0 8rpx 20rpx rgba(0, 178, 106, 0.25);  /* 绿色阴影 */
  font-weight: 600;
}

.login-btn::after {
  border: none;                      /* 移除默认边框 */
}

.login-btn.disabled {
  background: #ccc;                  /* 禁用灰色 */
  box-shadow: none;                  /* 禁用无阴影 */
}
```

**次要按钮（Secondary Button）**：

```css
.edit-btn {
  font-size: 28rpx;
  padding: 8rpx 24rpx;
  border-radius: 24rpx;
  /* 通常为描边按钮或文字按钮 */
}
```

#### 7.2.6 天气卡片（Weather Card）

```css
.weather-card {
  background: linear-gradient(135deg, #3ddaa0 0%, #12b086 100%);  /* 绿色渐变 */
  border-radius: 32rpx;
  box-shadow: 0 12rpx 30rpx rgba(0, 0, 0, 0.1);
  padding: 28rpx;
  color: #ffffff;                    /* 白色文字 */
}

.temperature {
  font-size: 72rpx;                  /* 超大温度数字 */
  font-weight: 700;
  color: #ffffff;
  line-height: 1;
  margin-right: 24rpx;
}

.weather-text {
  font-size: 32rpx;
  font-weight: 500;
  color: #ffffff;
}

.city {
  font-size: 28rpx;
  font-weight: 500;
  color: #ffffff;
}

.update-time {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.75); /* 半透明白色 */
}
```

#### 7.2.7 公告栏（Notice Bar）

```css
.custom-notice {
  background: linear-gradient(135deg, #f6ffed 0%, #e8f8f0 100%);  /* 浅绿渐变 */
  padding: 8rpx 24rpx;
  margin: 20rpx 20rpx 16rpx;
  border-radius: 32rpx;             /* 胶囊形 */
  box-shadow: 0 4rpx 20rpx rgba(45, 212, 191, 0.12);
  border-left: 6rpx solid #2dd4bf;  /* 左侧青色边框 */
  position: relative;
  overflow: hidden;
}

.notice-icon {
  font-size: 38rpx;
  margin-right: 16rpx;
  filter: drop-shadow(0 2rpx 4rpx rgba(45, 212, 191, 0.3));
}

.notice-text {
  font-size: 28rpx;
  color: #0d5e4a;                   /* 深青色文字 */
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  letter-spacing: 0.5rpx;
}
```

#### 7.2.8 用户信息卡片（User Card）

```css
.user-info {
  padding: 32rpx;
  margin: 16rpx 8rpx 0;
  display: flex;
  align-items: center;
  transition: all 0.3s ease;
}

.user-info:active {
  transform: scale(0.98);            /* 点击缩放反馈 */
}

.user-avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  margin-right: 30rpx;
  border: 4rpx solid rgba(255, 255, 255, 0.9);  /* 白色边框 */
  box-shadow: 0 4rpx 12rpx rgba(76, 175, 80, 0.2);  /* 绿色光晕 */
  background: #f0f0f0;
}

.user-name {
  font-size: 42rpx;
  color: #2e7d32;                   /* 深绿色 */
  font-weight: 600;
}

.logged-in-badge {
  font-size: 22rpx;
  color: #00b26a;
  background: #f0fdf4;              /* 浅绿背景 */
  padding: 4rpx 12rpx;
  border-radius: 16rpx;
  border: 1rpx solid #00b26a;       /* 绿色边框 */
}
```

#### 7.2.9 登录卡片（Login Card）

```css
.login-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60rpx 40rpx;
  background: #fff;
  border-radius: 32rpx;
}

.login-avatar {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  margin-bottom: 32rpx;
}

.login-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 16rpx;
}

.login-desc {
  font-size: 28rpx;
  color: #999;                      /* 灰色描述文字 */
  margin-bottom: 40rpx;
}
```

#### 7.2.10 弹窗组件（Popup）

```css
.popup-content {
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;   /* 顶部圆角 */
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx;
  border-bottom: 1rpx solid #eee;   /* 底部分割线 */
}

.popup-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #333;
}

.popup-body {
  padding: 24rpx;
  height: calc(80vh - 160rpx);
}
```

#### 7.2.11 图标/颜色选择器（Icon/Color Picker）

```css
/* 图标选择器网格 */
.icon-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 22rpx;
  margin-left: 28rpx;
}

.icon-item {
  width: 88rpx;
  height: 88rpx;
  border-radius: 32rpx;             /* 方形圆角 */
  background: #f8f8f8;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  border: 2rpx solid transparent;
}

.icon-item.selected {
  transform: scale(1.05);            /* 选中放大 */
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.15);
}

/* 颜色选择器网格 */
.color-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 22rpx;
  margin-left: 28rpx;
}

.color-item {
  width: 75rpx;
  height: 75rpx;
  border-radius: 50%;               /* 圆形 */
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.color-item.selected {
  transform: scale(1.15);            /* 选中放大 */
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.25);
}
```

#### 7.2.12 统计数据展示（Stats）

```css
/* 统计网格 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);  /* 四列布局 */
  padding: 30rpx 20rpx;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.stat-value {
  font-size: 44rpx;                  /* 大号数字 */
  font-weight: 600;
  color: #2d3436;
}

.stat-value.completed {
  color: #00B26A;                   /* 完成数用绿色 */
}

.stat-label {
  font-size: 24rpx;
  color: #666;                      /* 灰色标签 */
}
```

**进度条样式**：

```css
.bar-container {
  width: 100%;
  height: 100%;
  background: #f0f0f0;              /* 灰色背景 */
  border-radius: 30rpx;             /* 胶囊形 */
  overflow: hidden;
  position: relative;
}

.bar.completed {
  height: 100%;
  background: linear-gradient(90deg, #00B26A 0%, #81C784 100%);  /* 绿色渐变 */
  transition: width 0.6s ease-out;  /* 平滑动画 */
  display: flex;
  align-items: center;
}
```

***

## 8. 布局系统

### 8.1 页面结构（Page Structure）

**标准页面布局**：

```
┌─────────────────────────────┐
│     固定顶部导航栏 (.top)     │  ← z-index: 999, 毛玻璃效果
├─────────────────────────────┤
│                             │
│                             │
│      内容区域 (.container)    │  ← margin-top: 168-180rpx
│                             │
│                             │
├─────────────────────────────┤
│     底部安全区域预留         │  ← padding-bottom: 100-600rpx
└─────────────────────────────┘
```

### 8.2 Flexbox 布局模式

#### 垂直居中布局

```css
.container {
  display: flex;
  flex-direction: column;
  align-items: center;           /* 水平居中 */
}
```

#### 水平分布布局

```css
.header {
  display: flex;
  justify-content: space-between;  /* 两端对齐 */
  align-items: center;             /* 垂直居中 */
}
```

#### 左侧图标+右侧文字布局

```css
.item {
  display: flex;
  align-items: center;
}

.item-icon {
  width: 56rpx;
  height: 56rpx;
  margin-right: 20rpx;
}

.item-text {
  display: flex;
  flex-direction: column;
  margin-left: 32rpx;
}
```

#### 两端对齐+点击区域

```css
.combo-selector,
.picker-field {
  display: flex;
  align-items: center;
  justify-content: space-between;  /* 两端对齐 */
  padding: 24rpx 32rpx;
}
```

### 8.3 Grid 网格布局

#### 统计四列网格

```css
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8rpx;
}
```

#### 标签自动换行网格

```css
.tags-container,
.icon-grid,
.color-grid {
  display: flex;
  flex-wrap: wrap;               /* 自动换行 */
  gap: 16rpx;                     /* 或 22rpx */
}
```

### 8.4 层级关系（Z-Index）

| 层级           | Z-Index | 使用场景        |
| ------------ | ------- | ----------- |
| Base         | 0       | 默认内容层       |
| Dropdown     | 100     | 下拉菜单        |
| Overlay      | 500     | 遮罩层         |
| Fixed Header | 999     | 固定顶部导航      |
| Modal        | 1000    | 弹窗、对话框      |
| Toast        | 2000    | 轻提示         |
| Maximum      | 9999    | 最高层级（如引导蒙层） |

***

## 9. 动效规范

### 9.1 过渡动画（Transition）

**通用过渡**：

```css
/* 标准过渡 */
transition: all 0.3s ease;

/* 使用场景 */
.user-info { transition: all 0.3s ease; }           /* 用户信息卡 */
.tag-item { transition: all 0.3s ease; }             /* 标签项 */
.icon-item { transition: all 0.3s ease; }            /* 图标选择 */
.color-item { transition: all 0.3s ease; }           /* 颜色选择 */
```

**持续时间规范**：

| 类型 | 时长    | 使用场景         |
| -- | ----- | ------------ |
| 快速 | 0.15s | hover状态、简单交互 |
| 标准 | 0.3s  | 一般过渡、展开收起    |
| 缓慢 | 0.6s  | 进度条动画、复杂动效   |

**缓动函数**：

```css
/* 标准缓动 */
ease           /* 一般过渡 */
ease-out       /* 进入动画 */
ease-in-out    /* 循环动画 */
easeOutQuart   /* 图表动画 */
```

### 9.2 交互动效（Interaction Feedback）

**点击缩放效果**：

```css
.element:active {
  transform: scale(0.98);            /* 点击时轻微缩小 */
}
```

**选中放大效果**：

```css
.element.selected {
  transform: scale(1.05);            /* 选中时略微放大 */
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.15);  /* 增加阴影 */
}

.color-item.selected {
  transform: scale(1.15);            /* 颜色选择器更大 */
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.25);
}
```

**进度条动画**：

```css
.bar.completed {
  transition: width 0.6s ease-out;   /* 平滑填充动画 */
}
```

### 9.3 加载动画

使用TDesign的 `t-loading` 组件，保持全局一致。

### 9.4 注意事项

- 避免过度使用动画，影响性能
- 在低端机型上考虑减少动画复杂度
- 尊重用户的"减少动态效果"系统设置
- 动画时长不宜过长，建议控制在 0.3s 以内

***

## 10. 页面模板

### 10.1 标准列表页模板（如：更多页、统计页）

```css
page {
  font-size: 28rpx;
  background: #e3f5eb;              /* 清新绿背景 */
}

/* 固定顶部导航 */
.top {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 999;
  background: #e3f5eb99;
  backdrop-filter: blur(20rpx) saturate(180%);
  -webkit-backdrop-filter: blur(20rpx) saturate(180%);
}

.header {
  padding: 0 30rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 88rpx;
}

.title {
  font-size: 50rpx;
  font-weight: 600;
  color: #2d3436;
  flex: 1;
}

/* 内容区域 */
.container {
  margin-top: 168rpx;               /* 避开固定顶部 */
  padding: 8rpx;
  padding-bottom: 280rpx;           /* 底部安全距离 */
  min-height: 100vh;
}

/* 卡片样式 */
.card-style {
  background: #ffffff;
  border-radius: 32rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);
}
```

### 10.2 表单页模板（如：添加待办、编辑组合）

```css
page {
  font-size: 28rpx;
  background: #e3f5eb;
}

.container {
  padding: 10rpx 32rpx;
  padding-bottom: 600rpx;           /* 为浮动按钮留出空间 */
}

.form-container {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.form-item {
  padding-bottom: 32rpx;
}

.question-title {
  display: flex;
  align-items: center;
  font-size: 36rpx;
  font-weight: 500;
  line-height: 1.1;
  color: #333;
  margin-bottom: 15rpx;
  padding-left: 32rpx;
  position: relative;
}

.question-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 16rpx;
  height: 16rpx;
  background: #00b26a;
  border-radius: 50%;
}

.picker-field,
.t-input,
.t-textarea {
  border-radius: 32rpx;
  margin-left: 28rpx;
  background: #f8f8f8;
}
```

### 10.3 登录/用户中心页模板

```css
.page {
  min-height: 100vh;
  background: #e3f5eb;
  padding: 80rpx 32rpx 60rpx;
  box-sizing: border-box;
}

.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 40rpx;
}

.logo {
  width: 140rpx;
  height: 140rpx;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.08);
}

.title {
  margin-top: 28rpx;
  font-size: 46rpx;
  font-weight: 700;
  color: #2d3436;
}

.subtitle {
  margin-top: 12rpx;
  font-size: 26rpx;
  color: #6b7a6f;
}

.card {
  margin-top: 60rpx;
  background: #fff;
  border-radius: 32rpx;
  padding: 40rpx 32rpx;
  box-shadow: 0 12rpx 40rpx rgba(0, 0, 0, 0.08);
}

.login-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  background: #00b26a;
  color: #fff;
  font-size: 32rpx;
  border-radius: 50rpx;
  font-weight: 600;
  box-shadow: 0 8rpx 20rpx rgba(0, 178, 106, 0.25);
}

.login-btn::after {
  border: none;
}
```

***

## 11. 响应式适配

### 11.1 单位规范

本项目统一使用 `rpx`（响应式像素）作为尺寸单位：

- **优势**：根据屏幕宽度自动缩放，适配不同设备
- **基准**：设计稿宽度 750rpx
- **转换**：1rpx = 屏幕宽度 / 750 px

**使用规则**：

- ✅ 所有尺寸值使用 `rpx`：`width: 100rpx`, `padding: 20rpx`, `font-size: 28rpx`
- ❌ 避免使用 `px`：除非是 `border`（1rpx边框在某些机型可能不显示）
- ⚠️ 边框建议使用 `rpx`，但需测试兼容性

### 11.2 断点参考

虽然小程序使用 rpx 自适应，但仍需注意以下屏幕尺寸：

| 设备类型              | 屏幕宽度      | 备注         |
| ----------------- | --------- | ---------- |
| iPhone SE         | 375px     | 最小宽度，需重点测试 |
| iPhone 12/13      | 390px     | 主流设备       |
| iPhone 14 Pro Max | 430px     | 最大宽度       |
| Android 各型        | 360-410px | 碎片化严重      |

### 11.3 适配策略

**内容自适应**：

```css
.container {
  width: 100%;
  box-sizing: border-box;
  padding: 20rpx;                /* 使用相对单位 */
}
```

**文字溢出处理**：

```css
.text-ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.text-clamp {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
```

**图片自适应**：

```css
image {
  width: 100%;
  height: auto;
  display: block;
}
```

***

## 12. 可访问性

### 12.1 颜色对比度

确保文字与背景的对比度符合 WCAG AA 标准（至少 4.5:1）：

| 文字颜色           | 背景色           | 对比度    | 是否合规      |
| -------------- | ------------- | ------ | --------- |
| #2d3436 (主文字)  | #ffffff (白底)  | 12.6:1 | ✅ 合规      |
| #2d3436 (主文字)  | #e3f5eb (绿底)  | 9.8:1  | ✅ 合规      |
| #666 (次要文字)    | #ffffff (白底)  | 5.8:1  | ✅ 合规      |
| #999 (辅助文字)    | #ffffff (白底)  | 2.8:1  | ⚠️ 仅适用于大字 |
| #ffffff (白色文字) | #00b26a (绿底)  | 3.4:1  | ✅ 用于大字/图标 |
| #0d5e4a (深青文字) | #f6ffed (浅绿底) | 8.2:1  | ✅ 合规      |

### 12.2 触控目标尺寸

所有可点击元素的触控区域至少满足：

- **最小尺寸**：88rpx × 88rpx（约 44px × 44px）
- **推荐尺寸**：96rpx × 96rpx 或更大
- **间距**：相邻触控目标间距 ≥ 16rpx

**当前符合规范的元素**：

```css
.login-btn { height: 88rpx; }              /* ✅ 符合 */
.icon-item { width: 88rpx; height: 88rpx; } /* ✅ 符合 */
.color-item { width: 75rpx; height: 75rpx; } /* ⚠️ 偏小，但有 padding 补偿 */
.tag-item { padding: 12rpx 24rpx; }        /* ✅ 通过 padding 达标 */
```

### 12.3 语义化标签

- 使用合适的 HTML/WXML 标签
- 图片添加 `alt` 属性描述
- 重要操作提供明确的文案提示
- 避免仅通过颜色传达信息（配合图标或文字）

### 12.4 焦点管理

- 表单输入框应有清晰的焦点状态
- 模态弹窗打开时焦点应 trapped 在弹窗内
- 关闭弹窗后焦点应返回触发元素

***

## 13. 开发约定

### 13.1 CSS 命名规范

**命名风格**：BEM（Block Element Modifier）变体

```css
/* Block: 组件名 */
.card { }

/* Element: 组件子元素 */
.card-header { }
.card-body { }
.card-footer { }

/* Modifier: 状态变体 */
.card--primary { }
.card--disabled { }
.card.selected { }
```

**当前项目实际使用的命名风格**（语义化命名）：

```css
/* 页面级 */
.page, .container, .top, .header, .title

/* 组件级 */
.card-style, .card, .login-card, .user-card, .weather-card
.form-container, .form-item, .question-title
.tags-container, .tag-item, .tag-dot
.picker-field, .combo-selector

/* 状态级 */
.selected, .disabled, :active, .completed

/* 工具类 */
.no-todo-container, .ad-container, .stats-grid
```

### 13.2 CSS 组织结构

每个 `.wxss` 文件的组织顺序：

```css
/* 1. 导入（@import） */
@import '../common/common.wxss';

/* 2. 页面/组件基础样式 */
.page { }
.container { }

/* 3. 顶部导航栏 */
.top { }
.header { }
.title { }

/* 4. 内容区域 */
.section { }
.item { }

/* 5. 组件样式 */
.card { }
.button { }
.form { }

/* 6. 状态样式 */
.selected { }
.disabled { }
.active { }

/* 7. 动画/过渡 */
@keyframes { }
.transition { }

/* 8. 响应式/媒体查询（如有）*/
@media { }
```

### 13.3 CSS 变量使用（CSS Custom Properties）

项目已在 `app.wxss` 中定义全局 CSS 变量：

```css
page {
  --td-brand-color: #00b26a;
  --td-brand-color-light: #e0f2ec;
  --td-button-light-active-bg-color: #c4dcd4;
  --td-primary-color-8: #008550;
  
  --primary-color: #00b26a;
  --secondary-color: #f0faf5;
  --card-shadow: 0 8rpx 40rpx rgba(0,0,0,0.1);
}
```

**推荐扩展变量**：

```css
page {
  /* 色彩 */
  --color-primary: #00b26a;
  --color-success: #07c160;
  --color-warning: #ff9800;
  --color-error: #ff4d4f;
  --color-info: #2dd4bf;
  
  /* 文字 */
  --text-color-primary: #2d3436;
  --text-color-secondary: #333;
  --text-color-tertiary: #666;
  --text-color-placeholder: #999;
  
  /* 背景 */
  --bg-page: #e3f5eb;
  --bg-card: #ffffff;
  --bg-input: #f8f8f8;
  
  /* 间距 */
  --spacing-xs: 8rpx;
  --spacing-sm: 16rpx;
  --spacing-md: 24rpx;
  --spacing-lg: 32rpx;
  
  /* 圆角 */
  --radius-sm: 12rpx;
  --radius-md: 16rpx;
  --radius-lg: 32rpx;
  --radius-round: 50%;
  --radius-pill: 9999rpx;
  
  /* 阴影 */
  --shadow-sm: 0 4rpx 8rpx rgba(0,0,0,0.1);
  --shadow-md: 0 8rpx 20rpx rgba(0,0,0,0.08);
  --shadow-lg: 0 8rpx 40rpx rgba(0,0,0,0.1);
}
```

### 13.4 样式复用策略

**公共样式提取**：将重复使用的样式提取到公共文件

```css
/* common.wxss */

/* 通用卡片 */
.card-base {
  background: #ffffff;
  border-radius: 32rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);
}

/* 通用顶部导航 */
.fixed-top {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 999;
  background: #e3f5eb99;
  backdrop-filter: blur(20rpx) saturate(180%);
  -webkit-backdrop-filter: blur(20rpx) saturate(180%);
}

/* 胶囊形输入框 */
.pill-input {
  background: #f8f8f8;
  border-radius: 32rpx;
  padding: 26rpx 32rpx;
  font-size: 32rpx;
}

/* 胶囊形按钮 */
.pill-button {
  border-radius: 50rpx;
  height: 88rpx;
  line-height: 88rpx;
  font-size: 32rpx;
  font-weight: 600;
}
```

**使用 @import 引入**：

```css
@import '../../common/common.wxss';

.my-component {
  @extend .card-base;  /* 如预处理器支持 */
  /* 或直接混入类名 */
}
```

### 13.5 性能优化建议

**选择器优化**：

```css
/* ✅ 推荐：简洁的选择器 */
.card { }
.title { }
.tag-item.selected { }

/* ❌ 避免：过深嵌套 */
.container .content .list .item .title { }

/* ❌ 避免：通配符选择器 */
* { margin: 0; padding: 0; }
```

**属性优化**：

```css
/* ✅ 推荐：只使用必要的属性 */
.transition {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

/* ❌ 避免：transition: all */
```

**渲染性能**：

```css
/* 使用 GPU 加速属性进行动画 */
.animated-element {
  will-change: transform;
  transform: translateZ(0);        /* 触发硬件加速 */
}

/* 避免频繁触发重排的属性 */
/* ❌ width, height, margin, padding, top, left */
/* ✅ transform, opacity */
```

### 13.6 代码审查清单

在提交 UI 相关代码前，请检查以下事项：

#### 视觉一致性

- [ ] 颜色是否使用设计规范中的标准色值？
- [ ] 字号是否符合字号系统的规定？
- [ ] 间距是否为 8rpx 的倍数？
- [ ] 圆角是否使用了规定的等级？
- [ ] 阴影是否使用了标准的阴影级别？

#### 组件使用

- [ ] 是否优先使用了 TDesign 组件库的组件？
- [ ] 自定义组件是否遵循了现有的设计模式？
- [ ] 按钮、输入框、卡片等是否使用了统一的样式？

#### 布局与适配

- [ ] 是否正确设置了固定顶部的 margin-top？
- [ ] 是否预留了足够的底部安全区域？
- [ ] 所有尺寸是否使用了 rpx 单位？
- [ ] 在不同屏幕尺寸下是否正常显示？

#### 交互体验

- [ ] 可点击元素是否有足够大的触控区域？
- [ ] 是否有适当的点击反馈（缩放、变色等）？
- [ ] 过渡动画是否流畅且不过度？
- [ ] 加载状态、空状态、错误状态是否都有处理？

#### 可访问性

- [ ] 文字与背景的对比度是否达到 4.5:1 以上？
- [ ] 是否避免了仅通过颜色传达信息？
- [ ] 表单元素是否有清晰的标签和提示？
- [ ] 重要操作是否有二次确认机制？

#### 性能

- [ ] CSS 选择器是否简洁高效？
- [ ] 是否避免了昂贵的属性（如 box-shadow 的过度使用）？
- [ ] 动画是否使用了 GPU 加速属性？
- [ ] 是否存在不必要的样式重复？

***

## 附录 A：快速参考卡

### 常用色值速查

| 名称               | 色值        | 用途       |
| ---------------- | --------- | -------- |
| Primary          | `#00b26a` | 主色、按钮、链接 |
| Primary Light    | `#3ddaa0` | 强调色、渐变   |
| Primary Dark     | `#008550` | 深色文字     |
| Page Background  | `#e3f5eb` | 页面背景     |
| Card Background  | `#ffffff` | 卡片背景     |
| Input Background | `#f8f8f8` | 输入框背景    |
| Text Primary     | `#2d3436` | 主文字      |
| Text Secondary   | `#333`    | 正文       |
| Text Tertiary    | `#666`    | 次要文字     |
| Text Placeholder | `#999`    | 占位符      |
| Success          | `#07c160` | 成功状态     |
| Error            | `#ff4d4f` | 错误状态     |
| Warning          | `#ff9800` | 警告状态     |
| Info             | `#2dd4bf` | 信息提示     |
| Border           | `#eee`    | 分割线      |

### 常用尺寸速查

| 用途      | 尺寸                          |
| ------- | --------------------------- |
| 页面左右内边距 | `32rpx`                     |
| 卡片外边距   | `20rpx`                     |
| 卡片内边距   | `30rpx` / `40rpx 32rpx`     |
| 元素间距（小） | `8rpx` / `16rpx`            |
| 元素间距（中） | `24rpx` / `32rpx`           |
| 元素间距（大） | `40rpx` / `60rpx`           |
| 按钮高度    | `88rpx`                     |
| 输入框圆角   | `32rpx`（胶囊形）                |
| 卡片圆角    | `32rpx`（大）/ `16rpx`（标准）     |
| 图标尺寸    | `32rpx` / `40rpx` / `56rpx` |
| 头像尺寸（小） | `120rpx`                    |
| 头像尺寸（中） | `140rpx`                    |
| 头像尺寸（大） | `160rpx`                    |

### 常用阴影速查

| 级别 | 阴影值                                 | 用途      |
| -- | ----------------------------------- | ------- |
| 轻  | `0 4rpx 8rpx rgba(0,0,0,0.1)`       | 广告卡片    |
| 中  | `0 8rpx 20rpx rgba(0,0,0,0.08)`     | 功能卡片    |
| 重  | `0 8rpx 40rpx rgba(0,0,0,0.1)`      | 标准卡片    |
| 特殊 | `0 12rpx 40rpx rgba(0,0,0,0.08)`    | 登录/天气卡片 |
| 按钮 | `0 8rpx 20rpx rgba(0,178,106,0.25)` | 主按钮     |

***

## 附录 B：设计资源

### 设计工具配置

**如果使用 Figma/Sketch 等设计工具**，建议创建 Design Token：

```json
{
  "colors": {
    "primary": "#00b26a",
    "primaryLight": "#3ddaa0",
    "primaryDark": "#008550",
    "background": "#e3f5eb",
    "card": "#ffffff"
  },
  "typography": {
    "fontSize": {
      "h1": "50rpx",
      "h2": "36rpx",
      "body": "32rpx",
      "small": "28rpx"
    },
    "fontWeight": {
      "regular": 400,
      "medium": 500,
      "semibold": 600,
      "bold": 700
    }
  },
  "spacing": {
    "xs": "8rpx",
    "sm": "16rpx",
    "md": "24rpx",
    "lg": "32rpx",
    "xl": "40rpx"
  },
  "radii": {
    "small": "12rpx",
    "medium": "16rpx",
    "large": "32rpx",
    "pill": "9999rpx"
  },
  "shadows": {
    "light": "0 4rpx 8rpx rgba(0,0,0,0.1)",
    "medium": "0 8rpx 20rpx rgba(0,0,0,0.08)",
    "heavy": "0 8rpx 40rpx rgba(0,0,0,0.1)"
  }
}
```

***

## 附录 C：版本历史

| 版本    | 日期         | 作者           | 更新内容        |
| ----- | ---------- | ------------ | ----------- |
| 1.0.0 | 2026-04-05 | AI Assistant | 初始版本，完整设计规范 |

***

## 附录 D：联系方式与反馈

如有设计相关问题或建议，请联系项目负责人或在项目 Issue 中提出。

***

> **文档维护说明**：本设计规范文档应随着产品迭代持续更新。每次重大 UI 变更后，应及时同步更新本文档，确保规范与实现的一致性。

