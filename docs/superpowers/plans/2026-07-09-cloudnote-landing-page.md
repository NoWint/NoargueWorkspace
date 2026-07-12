# 笺云科技 × 时光绿径待办 企业介绍页 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task.

**Goal:** 在 `intro.yzjtiantian.cn/` 目录下创建单页 HTML，用于 ICP 备案审核。产品展示为主、企业信息为辅，绿色主题 + 毛玻璃 + 超圆角设计语言。

**Architecture:** 纯静态单页 HTML（内联 CSS + 内联 JS），无构建步骤。移动端优先 + 桌面适配，使用 `clamp()` 及 `vw` 单位换算小程序 rpx 设计值。

**Tech Stack:** HTML5 · CSS3 · Vanilla JS

**参考设计系统:** `DESIGN.md` — 主色 `#00b26a` · 超圆角 `32rpx` · 毛玻璃 `backdrop-filter: blur(20rpx)` · 卡片阴影 · 微动效

---

### Task 1: 创建基础 HTML 骨架 + CSS 变量 + 全局样式

**Files:**
- Create: `E:\WechatDevelop\intro.yzjtiantian.cn\index.html`

- [ ] **Step 1: 编写 HTML 骨架、CSS 变量、全局重置和排版系统**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>笺云科技 CloudNote Studio | 时光绿径待办</title>
  <style>
    /* ===== CSS 变量 ===== */
    :root {
      --primary: #00b26a;
      --primary-rgb: 0, 178, 106;
      --primary-light: #e0f2ec;
      --primary-active: #008550;
      --canvas: #e3f5eb;
      --surface-card: #ffffff;
      --surface-frost: rgba(255, 255, 255, 0.78);
      --surface-input: #f8f8f8;
      --ink: #2d3436;
      --body: #333333;
      --body-secondary: #666666;
      --muted: #999999;
      --on-primary: #ffffff;
      --on-frost: #333333;
      --danger: #e34d59;

      /* 圆角 */
      --radius-xl: clamp(16px, 4.267vw, 24px);
      --radius-pill: 9999px;

      /* 间距 */
      --space-xs: clamp(8px, 2vw, 12px);
      --space-sm: clamp(12px, 2.5vw, 16px);
      --space-md: clamp(16px, 3.2vw, 24px);
      --space-lg: clamp(20px, 4vw, 30px);
      --space-xl: clamp(24px, 5.33vw, 40px);

      /* 毛玻璃 */
      --frost-bg: rgba(255, 255, 255, 0.78);
      --frost-blur: blur(20rpx);
      /* 用 px 做后备 */
      --frost-blur-px: blur(20px);

      /* 阴影 */
      --shadow-card: 0 8px 40px rgba(0, 0, 0, 0.1);
      --shadow-sm: 0 4px 12px rgba(0, 0, 0, 0.06);
      --shadow-btn: 0 8px 20px rgba(0, 178, 106, 0.25);
      --shadow-green: 0 12px 30px rgba(0, 178, 106, 0.15);

      /* 渐变 */
      --gradient-primary: linear-gradient(135deg, #3ddaa0 0%, #12b086 100%);
      --gradient-btn: linear-gradient(135deg, #00b26a 0%, #3ddaa0 100%);
      --gradient-hero: linear-gradient(150deg, #00b26a 0%, #3ddaa0 60%, #5ee4b3 100%);
    }

    /* ===== 重置 ===== */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif;
      background: var(--canvas);
      color: var(--body);
      font-size: clamp(14px, 3.73vw, 17px);
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }
    a { color: var(--primary); text-decoration: none; }
    img { max-width: 100%; display: block; }
    ul { list-style: none; }

    /* ===== 排版工具 ===== */
    .section-title {
      font-size: clamp(24px, 5.6vw, 36px);
      font-weight: 700;
      color: var(--ink);
      text-align: center;
      margin-bottom: var(--space-xs);
    }
    .section-subtitle {
      font-size: clamp(14px, 3.73vw, 17px);
      color: var(--muted);
      text-align: center;
      margin-bottom: var(--space-xl);
    }
    .container {
      max-width: 750px;
      margin: 0 auto;
      padding: 0 var(--space-md);
    }
  </style>
</head>
<body>
  <!-- 后续所有 Task 插入此处 -->
  <script>
    // 后续 JS 代码
  </script>
</body>
</html>
```

- [ ] **Step 2: 验证文件创建成功**

```bash
ls -la "/e/WechatDevelop/intro.yzjtiantian.cn/index.html"
```
Expected: 文件存在，大小 > 0

- [ ] **Step 3: Commit**

```bash
git add intro.yzjtiantian.cn/index.html
git commit -m "feat(landing): init HTML skeleton with CSS variables"
```

---

### Task 2: Hero 区 — 全屏渐变首屏 + 毛玻璃导航

**Files:**
- Modify: `E:\WechatDevelop\intro.yzjtiantian.cn\index.html`

- [ ] **Step 1: 在 `<body>` 开头插入导航栏 HTML**

```html
  <!-- ===== 导航栏 ===== -->
  <nav class="navbar" id="navbar">
    <div class="navbar-inner">
      <div class="navbar-brand">
        <span class="brand-cn">笺云科技</span>
        <span class="brand-en">CloudNote Studio</span>
      </div>
      <div class="navbar-links" id="navLinks">
        <a href="#product" class="nav-link">产品</a>
        <a href="#features" class="nav-link">功能</a>
        <a href="#design" class="nav-link">设计</a>
        <a href="#about" class="nav-link">关于</a>
      </div>
      <button class="nav-toggle" id="navToggle" aria-label="菜单">
        <span class="toggle-bar"></span>
        <span class="toggle-bar"></span>
        <span class="toggle-bar"></span>
      </button>
    </div>
  </nav>
```

以及对应的导航 CSS（追加到 `<style>` 中）:

```css
    /* ===== 导航栏 ===== */
    .navbar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 999;
      background: rgba(227, 245, 235, 0.6);
      -webkit-backdrop-filter: blur(20px);
      backdrop-filter: blur(20px);
      transition: background 0.3s ease;
    }
    .navbar.scrolled {
      background: rgba(255, 255, 255, 0.9);
      box-shadow: 0 2px 20px rgba(0,0,0,0.06);
    }
    .navbar-inner {
      max-width: 750px;
      margin: 0 auto;
      padding: var(--space-sm) var(--space-md);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .navbar-brand {
      display: flex;
      align-items: baseline;
      gap: 10px;
    }
    .brand-cn {
      font-size: clamp(16px, 4.27vw, 22px);
      font-weight: 700;
      color: var(--ink);
    }
    .brand-en {
      font-size: clamp(11px, 2.67vw, 14px);
      color: var(--muted);
      font-weight: 400;
      letter-spacing: 0.5px;
    }
    .navbar-links {
      display: flex;
      gap: clamp(12px, 3.2vw, 24px);
    }
    .nav-link {
      font-size: clamp(13px, 3.2vw, 15px);
      color: var(--body-secondary);
      font-weight: 500;
      transition: color 0.2s;
    }
    .nav-link:hover { color: var(--primary); }
    .nav-toggle {
      display: none;
      background: none;
      border: none;
      flex-direction: column;
      gap: 4px;
      cursor: pointer;
      padding: 4px;
    }
    .toggle-bar {
      width: 22px;
      height: 2px;
      background: var(--ink);
      border-radius: 2px;
      transition: 0.3s;
    }
    @media (max-width: 480px) {
      .navbar-links { display: none; }
      .nav-toggle { display: flex; }
      .navbar-links.open {
        display: flex;
        flex-direction: column;
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: rgba(255,255,255,0.95);
        backdrop-filter: blur(20px);
        padding: var(--space-md);
        gap: var(--space-sm);
        box-shadow: 0 8px 32px rgba(0,0,0,0.1);
      }
    }
```

- [ ] **Step 2: 在导航栏后插入 Hero 区 HTML**

```html
  <!-- ===== Hero 区 ===== -->
  <section class="hero">
    <div class="hero-bg">
      <div class="hero-glow hero-glow-1"></div>
      <div class="hero-glow hero-glow-2"></div>
    </div>
    <div class="hero-content">
      <div class="hero-badge">微信小程序 · 待办管理</div>
      <h1 class="hero-title">
        <span class="hero-product">时光绿径待办</span>
        <span class="hero-subtitle">TimeGreen Path Todo</span>
      </h1>
      <p class="hero-desc">
        一款融合毛玻璃美学与绿色自然意象的待办管理工具。<br>
        支持个人效率与团队协作，助你在时光中留下清晰的足迹。
      </p>
      <div class="hero-actions">
        <a class="btn-primary" href="#product">了解更多</a>
        <a class="btn-secondary" href="#about">企业信息</a>
      </div>
    </div>
  </section>
```

以及 Hero CSS:

```css
    /* ===== Hero 区 ===== */
    .hero {
      position: relative;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      background: var(--gradient-hero);
    }
    .hero-bg {
      position: absolute;
      inset: 0;
      overflow: hidden;
    }
    .hero-glow {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
      opacity: 0.15;
    }
    .hero-glow-1 {
      width: 60vw; height: 60vw;
      background: #fff;
      top: -20%; right: -10%;
      animation: glowFloat 8s ease-in-out infinite;
    }
    .hero-glow-2 {
      width: 40vw; height: 40vw;
      background: #81c784;
      bottom: -10%; left: -10%;
      animation: glowFloat 10s ease-in-out infinite reverse;
    }
    @keyframes glowFloat {
      0%, 100% { transform: translateY(0) scale(1); }
      50% { transform: translateY(-30px) scale(1.05); }
    }
    .hero-content {
      position: relative;
      z-index: 1;
      text-align: center;
      padding: var(--space-xl);
      max-width: 600px;
    }
    .hero-badge {
      display: inline-block;
      background: rgba(255,255,255,0.2);
      color: var(--on-primary);
      padding: 6px 18px;
      border-radius: var(--radius-pill);
      font-size: clamp(12px, 2.93vw, 14px);
      font-weight: 500;
      letter-spacing: 0.5px;
      backdrop-filter: blur(10px);
      margin-bottom: var(--space-lg);
    }
    .hero-title { margin-bottom: var(--space-md); }
    .hero-product {
      display: block;
      font-size: clamp(32px, 9.6vw, 56px);
      font-weight: 700;
      color: var(--on-primary);
      line-height: 1.2;
      text-shadow: 0 2px 20px rgba(0,0,0,0.1);
    }
    .hero-subtitle {
      display: block;
      font-size: clamp(14px, 3.73vw, 20px);
      font-weight: 400;
      color: rgba(255,255,255,0.75);
      letter-spacing: 2px;
      margin-top: 6px;
    }
    .hero-desc {
      font-size: clamp(14px, 3.73vw, 17px);
      color: rgba(255,255,255,0.85);
      line-height: 1.7;
      margin-bottom: var(--space-xl);
      max-width: 480px;
      margin-left: auto;
      margin-right: auto;
    }
    .hero-actions {
      display: flex;
      gap: var(--space-sm);
      justify-content: center;
      flex-wrap: wrap;
    }
    .btn-primary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: var(--surface-card);
      color: var(--primary) !important;
      font-size: clamp(15px, 3.73vw, 17px);
      font-weight: 600;
      padding: 14px 36px;
      border-radius: var(--radius-pill);
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 25px rgba(0,0,0,0.15); }
    .btn-secondary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: rgba(255,255,255,0.15);
      color: var(--on-primary) !important;
      font-size: clamp(15px, 3.73vw, 17px);
      font-weight: 500;
      padding: 14px 36px;
      border-radius: var(--radius-pill);
      border: 1.5px solid rgba(255,255,255,0.3);
      transition: background 0.2s;
    }
    .btn-secondary:hover { background: rgba(255,255,255,0.25); }
```

- [ ] **Step 3: 添加导航栏滚动变色 + 移动端菜单切换的 JS**

在 `<script>` 标签中：

```javascript
    // 导航栏滚动效果
    const navbar = document.getElementById('navbar');
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');

    window.addEventListener('scroll', () => {
      if (window.scrollY > 60) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    });

    // 移动端菜单
    navToggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });

    // 点击导航链接关闭菜单
    navLinks.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
      });
    });
```

- [ ] **Step 4: 验证 Hero 区在浏览器中可见**

```bash
ls -la "/e/WechatDevelop/intro.yzjtiantian.cn/index.html"
```
Expected: 文件大小相比 Task 1 显著增加

- [ ] **Step 5: Commit**

```bash
git add intro.yzjtiantian.cn/index.html
git commit -m "feat(landing): add frosted nav and hero section"
```

---

### Task 3: 产品理念区 + 功能矩阵

**Files:**
- Modify: `E:\WechatDevelop\intro.yzjtiantian.cn\index.html`

- [ ] **Step 1: 在 Hero 后插入产品理念区 HTML**

```html
  <!-- ===== 产品理念 ===== -->
  <section class="section" id="product">
    <div class="container">
      <h2 class="section-title">产品理念</h2>
      <p class="section-subtitle">在时光中，留下一串绿色足迹</p>
      <div class="philosophy-cards">
        <div class="philo-card" style="--delay: 0s;">
          <div class="philo-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
          </div>
          <h3 class="philo-title">成长 · Growth</h3>
          <p class="philo-desc">每一件待办的完成，都是一次向上的生长。绿色代表生命力，我们用渐进的成就感取代焦虑。</p>
        </div>
        <div class="philo-card" style="--delay: 0.15s;">
          <div class="philo-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/></svg>
          </div>
          <h3 class="philo-title">自然 · Nature</h3>
          <p class="philo-desc">从薄荷画布到毛玻璃质感，每一处视觉都源自自然界的柔和与通透，让工具回归舒适。</p>
        </div>
        <div class="philo-card" style="--delay: 0.3s;">
          <div class="philo-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          </div>
          <h3 class="philo-title">进步 · Progress</h3>
          <p class="philo-desc">从个人待办到团队协作，从数据洞察到日历规划——让每一次进步都有迹可循。</p>
        </div>
      </div>
    </div>
  </section>
```

理念区 CSS:

```css
    /* ===== 通用章节 ===== */
    .section {
      padding: clamp(48px, 10vw, 80px) 0;
    }
    .section:nth-child(even) {
      background: var(--surface-card);
    }

    /* ===== 产品理念 ===== */
    .philosophy-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: var(--space-md);
      margin-top: var(--space-lg);
    }
    .philo-card {
      background: var(--surface-card);
      border-radius: var(--radius-xl);
      padding: var(--space-lg) var(--space-md);
      box-shadow: var(--shadow-card);
      text-align: center;
      animation: slideUp 0.6s ease-out both;
      animation-delay: var(--delay);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    .philo-card:hover {
      transform: translateY(-6px);
      box-shadow: var(--shadow-green);
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(40px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .philo-icon {
      width: 64px;
      height: 64px;
      margin: 0 auto var(--space-sm);
      background: var(--primary-light);
      border-radius: var(--radius-xl);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--primary);
    }
    .philo-title {
      font-size: clamp(16px, 4.27vw, 20px);
      font-weight: 600;
      color: var(--ink);
      margin-bottom: var(--space-xs);
    }
    .philo-desc {
      font-size: clamp(13px, 3.2vw, 15px);
      color: var(--body-secondary);
      line-height: 1.7;
    }
```

- [ ] **Step 2: 在理念区后插入功能矩阵 HTML**

```html
  <!-- ===== 功能矩阵 ===== -->
  <section class="section section-alt" id="features">
    <div class="container">
      <h2 class="section-title">核心功能</h2>
      <p class="section-subtitle">不止于待办，更是你的效率中枢</p>
      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-icon" style="background: rgba(0,178,106,0.1); color: var(--primary);">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
          </div>
          <h3 class="feature-title">待办管理</h3>
          <p class="feature-desc">四色优先级、自定义标签、拖拽排序，配合毛玻璃卡片与微动效，让管理事项成为一种愉悦。</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon" style="background: rgba(33,150,243,0.1); color: #2196F3;">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
          </div>
          <h3 class="feature-title">组合系统</h3>
          <p class="feature-desc">用「组合」归类待办，支持共享协作。可分配成员、设定完成方式，让团队事半功倍。</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon" style="background: rgba(255,152,0,0.1); color: #FF9800;">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
          <h3 class="feature-title">日历集成</h3>
          <p class="feature-desc">待办截止日期在日历上打点标记，点击日期查看当日事项，规划一目了然。</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon" style="background: rgba(156,39,176,0.1); color: #9C27B0;">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
          </div>
          <h3 class="feature-title">语音输入</h3>
          <p class="feature-desc">集成微信语音识别，开口即记。在想法的瞬间快速捕捉，不错过任何一个灵感。</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon" style="background: rgba(0,178,106,0.1); color: var(--primary);">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          </div>
          <h3 class="feature-title">数据洞察</h3>
          <p class="feature-desc">完成率、趋势图表、每日分析，可视化你的效率轨迹，用数据驱动持续进步。</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon" style="background: rgba(45,212,191,0.1); color: #2dd4bf;">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
          </div>
          <h3 class="feature-title">离线同步</h3>
          <p class="feature-desc">离线优先架构，本地存储先响应，再异步同步云端。增量同步 + 冲突合并，无网也能用。</p>
        </div>
      </div>
    </div>
  </section>
```

功能矩阵 CSS:

```css
    .section-alt { background: var(--surface-card); }
    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: var(--space-md);
    }
    .feature-card {
      background: var(--canvas);
      border-radius: var(--radius-xl);
      padding: var(--space-md);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    .feature-card:hover {
      transform: translateY(-4px);
      box-shadow: var(--shadow-sm);
    }
    .feature-icon {
      width: 52px;
      height: 52px;
      border-radius: var(--radius-xl);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: var(--space-sm);
    }
    .feature-title {
      font-size: clamp(15px, 4vw, 18px);
      font-weight: 600;
      color: var(--ink);
      margin-bottom: 6px;
    }
    .feature-desc {
      font-size: clamp(13px, 3.2vw, 14.5px);
      color: var(--body-secondary);
      line-height: 1.7;
    }
```

- [ ] **Step 3: Commit**

```bash
git add intro.yzjtiantian.cn/index.html
git commit -m "feat(landing): add product philosophy and feature grid"
```

---

### Task 4: 设计亮点展示区

**Files:**
- Modify: `E:\WechatDevelop\intro.yzjtiantian.cn\index.html`

- [ ] **Step 1: 在功能矩阵后插入设计亮点区 HTML**

```html
  <!-- ===== 设计亮点 ===== -->
  <section class="section" id="design">
    <div class="container">
      <h2 class="section-title">设计语言</h2>
      <p class="section-subtitle">绿色即情绪，圆角即态度</p>
      <div class="design-showcase">
        <div class="design-item">
          <div class="design-visual frost-demo">
            <div class="frost-panel">
              <span class="frost-label">毛玻璃</span>
              <span class="frost-hint">blur(20px)</span>
            </div>
          </div>
          <div class="design-text">
            <h3>毛玻璃质感</h3>
            <p>导航栏与弹出层采用`backdrop-filter: blur(20px)`，薄荷绿半透明背景让页面层次通透而温暖。</p>
          </div>
        </div>
        <div class="design-item reverse">
          <div class="design-visual radius-demo">
            <div class="radius-shape"></div>
          </div>
          <div class="design-text">
            <h3>超圆角语言</h3>
            <p>32rpx 通用圆角——卡片、按钮、输入框、弹窗，所有容器统一使用同一曲率，形成强烈的视觉签名。</p>
          </div>
        </div>
        <div class="design-item">
          <div class="design-visual color-demo">
            <div class="color-bar primary-bar"></div>
            <div class="color-bar light-bar"></div>
            <div class="color-bar canvas-bar"></div>
          </div>
          <div class="design-text">
            <h3>单色绿色系统</h3>
            <p>仅有一个品牌色 `#00b26a`，从薄荷画布到按钮高光，全部围绕绿色轴展开，克制而纯粹。</p>
          </div>
        </div>
        <div class="design-item reverse">
          <div class="design-visual motion-demo">
            <div class="motion-dot"></div>
          </div>
          <div class="design-text">
            <h3>微动效反馈</h3>
            <p>完成待办的脉冲动画、星标弹跳、拖拽浮起阴影——每一次操作都有细腻的触感回应。</p>
          </div>
        </div>
      </div>
    </div>
  </section>
```

设计亮点 CSS:

```css
    /* ===== 设计亮点 ===== */
    .design-showcase { display: flex; flex-direction: column; gap: var(--space-xl); margin-top: var(--space-lg); }
    .design-item {
      display: flex;
      align-items: center;
      gap: var(--space-lg);
    }
    .design-item.reverse { flex-direction: row-reverse; }
    .design-visual {
      flex-shrink: 0;
      width: clamp(140px, 35vw, 220px);
      height: clamp(100px, 25vw, 160px);
      border-radius: var(--radius-xl);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
    }
    .design-text h3 {
      font-size: clamp(16px, 4.27vw, 20px);
      font-weight: 600;
      color: var(--ink);
      margin-bottom: 6px;
    }
    .design-text p {
      font-size: clamp(13px, 3.2vw, 15px);
      color: var(--body-secondary);
      line-height: 1.7;
    }
    @media (max-width: 480px) {
      .design-item, .design-item.reverse { flex-direction: column; text-align: center; }
    }

    .frost-demo { background: var(--gradient-primary); position: relative; overflow: hidden; }
    .frost-panel {
      background: rgba(255,255,255,0.4);
      -webkit-backdrop-filter: blur(12px);
      backdrop-filter: blur(12px);
      border-radius: 16px;
      padding: 12px 20px;
      border: 1px solid rgba(255,255,255,0.3);
      text-align: center;
    }
    .frost-label { display: block; font-size: 16px; font-weight: 600; color: #fff; }
    .frost-hint { display: block; font-size: 11px; color: rgba(255,255,255,0.7); margin-top: 2px; }

    .radius-demo { background: var(--canvas); justify-content: center; }
    .radius-shape {
      width: 60px; height: 60px;
      background: var(--gradient-btn);
      border-radius: var(--radius-xl);
    }

    .color-demo { background: #f0f0f0; flex-direction: row; gap: 8px; }
    .color-bar {
      width: 28px; height: 60px;
      border-radius: 14px;
    }
    .primary-bar { background: var(--primary); }
    .light-bar { background: var(--primary-light); }
    .canvas-bar { background: var(--canvas); }

    .motion-demo { background: var(--primary-light); }
    .motion-dot {
      width: 24px; height: 24px;
      background: var(--primary);
      border-radius: 50%;
      animation: motionBounce 1.5s ease-in-out infinite;
    }
    @keyframes motionBounce {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.5); opacity: 0.5; }
    }
```

- [ ] **Step 2: Commit**

```bash
git add intro.yzjtiantian.cn/index.html
git commit -m "feat(landing): add design language showcase"
```

---

### Task 5: 企业信息 + Footer

**Files:**
- Modify: `E:\WechatDevelop\intro.yzjtiantian.cn\index.html`

- [ ] **Step 1: 在设计亮点后插入企业信息区 + Footer HTML**

```html
  <!-- ===== 企业信息 ===== -->
  <section class="section section-alt" id="about">
    <div class="container">
      <h2 class="section-title">关于我们</h2>
      <p class="section-subtitle">笺云科技 CloudNote Studio — 让技术温暖日常</p>
      <div class="about-card">
        <div class="about-row">
          <span class="about-label">企业名称</span>
          <span class="about-value">深圳市龙岗区横岗街道笺云科技工作室</span>
        </div>
        <div class="about-row">
          <span class="about-label">英文名称</span>
          <span class="about-value">CloudNote Studio</span>
        </div>
        <div class="about-row">
          <span class="about-label">统一社会信用代码</span>
          <span class="about-value mono">92440300MAKHNTQ68D</span>
        </div>
        <div class="about-row">
          <span class="about-label">企业类型</span>
          <span class="about-value">个体工商户</span>
        </div>
        <div class="about-row">
          <span class="about-label">成立日期</span>
          <span class="about-value">2024-08-08</span>
        </div>
        <div class="about-row">
          <span class="about-label">经营范围</span>
          <span class="about-value">软件开发、软件外包服务、互联网信息服务、信息技术咨询服务</span>
        </div>
        <div class="about-row">
          <span class="about-label">联系邮箱</span>
          <span class="about-value">contact@yzjtiantian.cn</span>
        </div>
        <div class="about-row">
          <span class="about-label">产品官网</span>
          <span class="about-value"><a href="https://intro.yzjtiantian.cn" target="_blank">intro.yzjtiantian.cn</a></span>
        </div>
      </div>
      <div class="about-qr">
        <div class="qr-placeholder">
          <div class="qr-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><line x1="6" y1="6" x2="6" y2="6.01"/><line x1="17" y1="6" x2="17" y2="6.01"/><line x1="6" y1="17" x2="6" y2="17.01"/><line x1="17" y1="17" x2="17" y2="17.01"/></svg>
          </div>
          <p class="qr-text">微信扫码体验<br><strong>时光绿径待办</strong></p>
        </div>
      </div>
    </div>
  </section>

  <!-- ===== Footer ===== -->
  <footer class="footer">
    <div class="container">
      <div class="footer-brand">
        <span class="footer-brand-cn">笺云科技</span>
        <span class="footer-brand-en">CloudNote Studio</span>
      </div>
      <div class="footer-links">
        <a href="#product">产品</a>
        <a href="#features">功能</a>
        <a href="#about">关于</a>
      </div>
      <div class="footer-info">
        <p>深圳市龙岗区横岗街道笺云科技工作室</p>
        <p>统一社会信用代码：92440300MAKHNTQ68D</p>
        <p class="footer-icp">ICP 备案号：粤ICP备xxxxxxxx号-x</p>
      </div>
      <div class="footer-copy">
        &copy; 2024-2026 笺云科技工作室 CloudNote Studio. All rights reserved.
      </div>
    </div>
  </footer>
```

企业信息和 Footer CSS:

```css
    /* ===== 企业信息 ===== */
    .about-card {
      background: var(--surface-card);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-card);
      padding: var(--space-lg);
      max-width: 580px;
      margin: 0 auto;
    }
    .about-row {
      display: flex;
      padding: var(--space-sm) 0;
      border-bottom: 1px solid #f0f0f0;
      gap: var(--space-sm);
    }
    .about-row:last-child { border-bottom: none; }
    .about-label {
      flex-shrink: 0;
      width: clamp(80px, 22vw, 130px);
      font-size: clamp(13px, 3.2vw, 15px);
      color: var(--muted);
      font-weight: 500;
    }
    .about-value {
      font-size: clamp(13px, 3.2vw, 15px);
      color: var(--body);
      word-break: break-all;
    }
    .about-value.mono {
      font-family: 'Courier New', Courier, monospace;
      letter-spacing: 0.5px;
      font-size: clamp(12px, 2.93vw, 14px);
    }
    .about-qr {
      display: flex;
      justify-content: center;
      margin-top: var(--space-xl);
    }
    .qr-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-sm);
      padding: var(--space-lg) var(--space-xl);
      background: var(--surface-card);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-card);
      min-width: 180px;
    }
    .qr-icon { color: var(--primary); }
    .qr-text {
      text-align: center;
      font-size: clamp(13px, 3.2vw, 15px);
      color: var(--body-secondary);
      line-height: 1.6;
    }
    .qr-text strong { color: var(--ink); }

    /* ===== Footer ===== */
    .footer {
      background: var(--ink);
      color: rgba(255,255,255,0.7);
      padding: var(--space-xl) 0 var(--space-lg);
      text-align: center;
    }
    .footer-brand {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-bottom: var(--space-md);
    }
    .footer-brand-cn {
      font-size: clamp(16px, 4.27vw, 20px);
      font-weight: 700;
      color: #fff;
    }
    .footer-brand-en {
      font-size: clamp(11px, 2.67vw, 13px);
      color: rgba(255,255,255,0.4);
    }
    .footer-links {
      display: flex;
      justify-content: center;
      gap: var(--space-md);
      margin-bottom: var(--space-md);
    }
    .footer-links a {
      color: rgba(255,255,255,0.6);
      font-size: clamp(13px, 3.2vw, 15px);
      transition: color 0.2s;
    }
    .footer-links a:hover { color: var(--primary); }
    .footer-info p {
      font-size: clamp(12px, 2.93vw, 14px);
      line-height: 1.8;
    }
    .footer-icp { margin-top: 4px; color: rgba(255,255,255,0.4); }
    .footer-copy {
      margin-top: var(--space-md);
      padding-top: var(--space-md);
      border-top: 1px solid rgba(255,255,255,0.1);
      font-size: clamp(11px, 2.67vw, 13px);
      color: rgba(255,255,255,0.35);
    }
```

- [ ] **Step 2: Commit**

```bash
git add intro.yzjtiantian.cn/index.html
git commit -m "feat(landing): add company info and footer"
```

---

### Task 6: 收尾动效 + 滚动动画 + 最终调优

**Files:**
- Modify: `E:\WechatDevelop\intro.yzjtiantian.cn\index.html`

- [ ] **Step 1: 添加 IntersectionObserver 滚动入场动画 JS**

替换 `<script>` 标签内容为（保留之前的导航 JS 并追加）:

```javascript
    // 导航栏滚动效果
    const navbar = document.getElementById('navbar');
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');

    window.addEventListener('scroll', () => {
      if (window.scrollY > 60) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    });

    // 移动端菜单
    navToggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });
    navLinks.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => navLinks.classList.remove('open'));
    });

    // 滚动入场动画
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.feature-card, .design-item, .about-row').forEach(el => {
      el.classList.add('fade-in');
      observer.observe(el);
    });
```

追加 CSS 动画类:

```css
    /* ===== 滚动入场 ===== */
    .fade-in {
      opacity: 0;
      transform: translateY(30px);
      transition: opacity 0.6s ease-out, transform 0.6s ease-out;
    }
    .fade-in.visible {
      opacity: 1;
      transform: translateY(0);
    }
    .feature-card:nth-child(2) { transition-delay: 0.1s; }
    .feature-card:nth-child(3) { transition-delay: 0.2s; }
    .feature-card:nth-child(4) { transition-delay: 0.3s; }
    .feature-card:nth-child(5) { transition-delay: 0.1s; }
    .feature-card:nth-child(6) { transition-delay: 0.2s; }
    .design-item:nth-child(2) { transition-delay: 0.1s; }
    .design-item:nth-child(3) { transition-delay: 0.2s; }
    .design-item:nth-child(4) { transition-delay: 0.3s; }
```

- [ ] **Step 2: 添加平滑锚点滚动 JS**

在 `navLinks.querySelectorAll` 后面补充:

```javascript
    // 平滑锚点滚动
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.querySelector(anchor.getAttribute('href'));
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
```

- [ ] **Step 3: Commit**

```bash
git add intro.yzjtiantian.cn/index.html
git commit -m "feat(landing): add scroll animations and smooth anchor nav"
```

---

### 规格核查

| 设计文档条目 | 对应 Task |
|---|---|
| Hero 区全屏渐变 + 毛玻璃导航 | Task 2 |
| 产品理念：成长/自然/进步 | Task 3 理念区 |
| 功能矩阵：6 大核心功能 | Task 3 功能矩阵 |
| 设计亮点：毛玻璃/圆角/色彩/动效 | Task 4 |
| 企业信息：名称/信用代码/地址/联系方式 | Task 5 |
| Footer + 备案号占位 | Task 5 |
| 移动端适配 + 桌面适配 | Task 2 (responsive navbar) + Task 6 (clamp units) |
| 微动效 + 滚动入场 | Task 6 |
| 英文名 CloudNote Studio | Task 2 (navbar) + Task 5 (about + footer) |
