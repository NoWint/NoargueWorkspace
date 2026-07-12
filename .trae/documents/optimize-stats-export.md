# 统计页面图片导出优化计划

## 一、现状分析

### stats 页面

* **导出内容**：标题、数据概览、位置分布、分类统计、每日趋势、时间分布

* **数据项**：总待办、已完成、完成率、平均耗时

* **问题**：无 Logo、样式较简单、缺少新数据项

### daily-stats 页面

* **导出内容**：标题、日期、数据概览、时间分布、待办列表

* **数据项**：创建待办、完成待办、完成率、平均耗时

* **问题**：无 Logo、缺少收藏/标签等新数据项

## 二、优化目标

### 1. 添加 Logo

* Logo URL: `https://api.yzjtiantian.cn/uploads/logo/logo.png`

* 位置：导出图片顶部标题区域

* 需要先下载图片到 Canvas

### 2. 美化样式

* 添加渐变背景

* 优化卡片阴影、圆角效果

* 改进数据展示布局

* 添加装饰元素

### 3. 适配新数据项

* 收藏待办数量

* 标签分布统计

* 位置待办数量

* 图片附件数量

## 三、实施步骤

### 步骤 1：优化 stats 页面导出图片

**文件**: `pages/stats/stats.js`

1. 添加 Logo 加载函数
2. 修改 `generateShareImage` 函数：

   * 在顶部添加 Logo

   * 添加收藏数量统计

   * 添加标签分布统计

   * 优化整体布局和配色

   * 增加图片高度以容纳新内容

### 步骤 2：优化 daily-stats 页面导出图片

**文件**: `pages/daily-stats/daily-stats.js`

1. 添加 Logo 加载函数
2. 修改 `generateReport` 函数：

   * 在顶部添加 Logo

   * 添加收藏待办统计

   * 添加标签统计

   * 优化待办列表展示

   * 美化整体样式

### 步骤 3：优化页面 UI 样式

**文件**: `pages/stats/stats.wxss`, `pages/daily-stats/daily-stats.wxss`

1. 优化卡片样式
2. 添加渐变效果
3. 改进数据展示

### 步骤 4：更新数据统计逻辑

**文件**: `pages/stats/stats.js`, `pages/daily-stats/daily-stats.js`

1. 添加收藏统计
2. 添加标签统计
3. 添加图片附件统计

## 四、技术要点

### Logo 加载方式

```javascript
async function loadLogo(ctx, x, y, width, height) {
  return new Promise((resolve) => {
    const logoImg = canvas.createImage();
    logoImg.onload = () => {
      ctx.drawImage(logoImg, x, y, width, height);
      resolve();
    };
    logoImg.src = 'https://api.yzjtiantian.cn/uploads/logo/logo.png';
  });
}
```

### 新增数据项

* `starCount`: 收藏待办数量

* `tagStats`: 标签分布统计

* `imageCount`: 带图片的待办数量

* `locationCount`: 带位置的待办数量

## 五、预期效果

1. 导出图片顶部显示 Logo
2. 数据展示更丰富完整
3. 整体视觉效果更美观
4. 保持品牌一致性

