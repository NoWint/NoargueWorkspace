---
version: alpha
name: TimeGreen Path Todo
description: A nature-green WeChat Mini Program todo application with a frosted-glass aesthetic. The system anchors on a pale mint canvas with a vibrant green primary, ultra-rounded cards with soft shadows, and frosted-glass navigation bars. The brand identity revolves around "green path" (时光绿径) — growth, nature, and progress — expressed through a green-dominant color palette, organic rounded shapes, and micro-animations that reward completion. The design deliberately avoids competing brand colors: green is the single source of brand voltage against a mint canvas.

colors:
  primary: "#00b26a"
  primary-rgb: "0, 178, 106"
  primary-light: "#e0f2ec"
  primary-light-fill: "#e8f8f0"
  primary-active: "#008550"
  canvas: "#e3f5eb"
  surface-card: "#ffffff"
  surface-frost: "rgba(255, 255, 255, 0.78)"
  surface-input: "#f8f8f8"
  surface-tag: "#f5f5f5"
  hairline: "#e8e8e8"
  hairline-soft: "#f5f5f5"
  tab-bar-bg: "#ffffff"
  tab-bar-inactive: "#666666"
  tab-bar-active: "#00b26a"
  ink: "#2d3436"
  body: "#333333"
  body-secondary: "#666666"
  muted: "#999999"
  muted-soft: "#cccccc"
  on-primary: "#ffffff"
  on-frost: "#333333"
  input-placeholder: "#bbbbbb"
  danger: "#e34d59"
  danger-strong: "#ff4d4f"
  danger-deep: "#d90000"
  success: "#00b26a"
  warning: "#faad14"
  error: "#e34d59"
  link: "#00b26a"
  love-active: "#ff4757"
  teal: "#2dd4bf"
  star-gold-1: "#fbbf24"
  star-gold-2: "#f59e0b"

  priority-p1: "#e34d59"
  priority-p2: "#2196F3"
  priority-p3: "#FF9800"
  priority-p4: "#999999"

  tag-work: "#2196F3"
  tag-study: "#4CAF50"
  tag-life: "#FF9800"
  tag-health: "#E91E63"
  tag-shopping: "#FF5722"
  tag-other: "#607D8B"

  gradient-primary: "linear-gradient(135deg, #3ddaa0 0%, #12b086 100%)"
  gradient-amber: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)"
  gradient-progress: "linear-gradient(90deg, #00b26a 0%, #81c784 100%)"
  gradient-star: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 0%)"
  gradient-tab-active: "linear-gradient(135deg, #00b26a 0%, #3ddaa0 100%)"
  gradient-btn-primary: "linear-gradient(135deg, #00b26a 0%, #3ddaa0 100%)"
  gradient-wechat: "linear-gradient(135deg, #07c160 0%, #06ad56 56%)"
  gradient-completed: "linear-gradient(135deg, #ecfdf5 0%, #90e0b7 100%)"
  gradient-notice: "linear-gradient(135deg, #f6ffed 0%, #e8f8f0 100%)"

typography:
  hero:
    fontSize: 72rpx
    fontWeight: 700
    color: "#ffffff"
  display:
    fontSize: 50rpx
    fontWeight: 600
    lineHeight: 1.3
    color: "#2d3436"
  heading-lg:
    fontSize: 46rpx
    fontWeight: 700
    lineHeight: 1.3
    color: "#2d3436"
  heading:
    fontSize: 42rpx
    fontWeight: 600
    lineHeight: 1.4
    color: "#2d3436"
  stat-number:
    fontSize: 48rpx
    fontWeight: 600
    lineHeight: 1.2
    color: "#2d3436"
  subheading:
    fontSize: 36rpx
    fontWeight: 600
    lineHeight: 1.4
    color: "#333333"
  body-lg:
    fontSize: 32rpx
    fontWeight: 500
    lineHeight: 1.5
    color: "#333333"
  body:
    fontSize: 28rpx
    fontWeight: 400
    lineHeight: 1.6
    color: "#666666"
  caption:
    fontSize: 26rpx
    fontWeight: 400
    lineHeight: 1.5
    color: "#999999"
  caption-bold:
    fontSize: 26rpx
    fontWeight: 500
    lineHeight: 1.5
    color: "#666666"
  tiny:
    fontSize: 24rpx
    fontWeight: 400
    lineHeight: 1.4
    color: "#999999"
  mini:
    fontSize: 22rpx
    fontWeight: 400
    lineHeight: 1.4
    color: "#999999"
  button:
    fontSize: 32rpx
    fontWeight: 600
    lineHeight: 1
    color: "#ffffff"

rounded:
  xs: 12rpx
  sm: 16rpx
  md: 22rpx
  lg: 24rpx
  xl: 32rpx
  round: 50%
  pill: 9999rpx

spacing:
  xxs: 8rpx
  xs: 12rpx
  sm: 16rpx
  md: 20rpx
  lg: 24rpx
  xl: 30rpx
  xxl: 40rpx
  section: 48rpx
  page-bottom: 400rpx

components:
  top-nav:
    backgroundColor: "rgba(227, 245, 235, 0.6)"
    textColor: "{colors.ink}"
    typography: "{typography.display}"
    backdropFilter: "blur(20rpx) saturate(180%)"
    zIndex: 999
  card-standard:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.body}"
    rounded: "{rounded.xl}"
    shadow: "0 8rpx 40rpx rgba(0,0,0,0.1)"
    padding: "{spacing.xl}"
    marginBottom: 20rpx
  card-compact:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.body}"
    rounded: "{rounded.xl}"
    shadow: "0 4rpx 12rpx rgba(0,0,0,0.06)"
    padding: "{spacing.lg}"
    marginBottom: 20rpx
  card-completed:
    backgroundColor: "{colors.gradient-completed}"
    textColor: "{colors.success}"
    rounded: "{rounded.xl}"
    textDecoration: "line-through"
  card-weather:
    backgroundColor: "{colors.gradient-primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.xl}"
    shadow: "0 12rpx 30rpx rgba(0,0,0,0.1)"
    padding: 28rpx
  card-frost:
    backgroundColor: "{colors.surface-frost}"
    textColor: "{colors.on-frost}"
    rounded: "{rounded.xl}"
    backdropFilter: "blur(24rpx) saturate(180%)"
    border: "1rpx solid rgba(255,255,255,0.3)"
  button-primary:
    backgroundColor: "{colors.gradient-btn-primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: 44rpx
    height: 88rpx
    shadow: "0 8rpx 20rpx rgba(0,178,106,0.25)"
  button-primary-disabled:
    backgroundColor: "#cccccc"
    textColor: "{colors.muted}"
    rounded: 44rpx
    shadow: none
  button-secondary:
    backgroundColor: "#f5f5f5"
    textColor: "#8c8c8c"
    rounded: 40rpx
    height: 72rpx
  button-swipe-edit:
    backgroundColor: "#ed7b2f"
    textColor: "{colors.on-primary}"
    width: 110rpx
  button-swipe-delete:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.on-primary}"
    width: 110rpx
  button-swipe-approve:
    backgroundColor: "#08bd8f"
    textColor: "{colors.on-primary}"
    width: 110rpx
  button-swipe-reject:
    backgroundColor: "#f5f5f5"
    textColor: "{colors.danger-deep}"
    width: 110rpx
  button-wechat:
    backgroundColor: "{colors.gradient-wechat}"
    textColor: "{colors.on-primary}"
    rounded: 44rpx
    height: 88rpx
  fab-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    right: 32rpx
    bottom: 32rpx
  tab-pill-container:
    backgroundColor: "{colors.surface-card}"
    rounded: "{rounded.xl}"
    shadow: "0 4rpx 12rpx rgba(0,0,0,0.06)"
    padding: 8rpx
    margin: 20rpx
  tab-pill-active:
    backgroundColor: "{colors.gradient-tab-active}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.xl}"
    fontWeight: 500
  tab-pill-inactive:
    backgroundColor: transparent
    textColor: "{colors.body-secondary}"
    rounded: "{rounded.xl}"
    fontSize: 32rpx
  text-input:
    backgroundColor: "{colors.surface-input}"
    textColor: "{colors.body}"
    rounded: "{rounded.xl}"
    padding: "26rpx 32rpx"
  form-question:
    fontSize: 36rpx
    fontWeight: 500
    color: "{colors.body}"
    paddingLeft: 32rpx
    dotColor: "{colors.primary}"
    dotSize: 16rpx
  tag-chip:
    backgroundColor: "{colors.surface-tag}"
    textColor: "{colors.body-secondary}"
    rounded: "{rounded.xl}"
    padding: "12rpx 24rpx"
    fontSize: 28rpx
  tag-chip-selected:
    backgroundColor: "rgba(0,178,106,0.15)"
    rounded: "{rounded.xl}"
    padding: "12rpx 24rpx"
    fontSize: 28rpx
  badge-role-owner:
    backgroundColor: "#fff3e0"
    textColor: "#ff9800"
    rounded: 8rpx
    padding: "4rpx 14rpx"
    fontSize: 22rpx
  badge-role-admin:
    backgroundColor: "{colors.gradient-btn-primary}"
    textColor: "{colors.on-primary}"
    rounded: 8rpx
    padding: "4rpx 14rpx"
    fontSize: 22rpx
  badge-role-member:
    backgroundColor: "{colors.surface-tag}"
    textColor: "{colors.muted}"
    rounded: 8rpx
    padding: "4rpx 14rpx"
    fontSize: 22rpx
  badge-star:
    backgroundColor: "{colors.gradient-star}"
    rounded: "0 0 30rpx 0"
    position: "top-left fixed"
  notice-bar:
    backgroundColor: "{colors.gradient-notice}"
    rounded: "{rounded.xl}"
    borderLeft: "6rpx solid {colors.teal}"
    shadow: "0 4rpx 20rpx rgba(45,212,191,0.12)"
    padding: "8rpx 24rpx"
    margin: "20rpx"
  popup-bottom-sheet:
    backgroundColor: "{colors.surface-card}"
    rounded: "{rounded.xl} {rounded.xl} 0 0"
  popup-centered:
    rounded: "{rounded.xl}"
    width: "580-700rpx"
    overflow: "hidden"
  dropdown-menu:
    rounded: "{rounded.xl}"
    shadow: "0 8rpx 32rpx rgba(0,0,0,0.15)"
    selectedColor: "{colors.primary}"
    selectedBackground: "{colors.primary-light-fill}"
    overlayColor: "rgba(0,0,0,0.3)"
  progress-bar:
    backgroundColor: "#f0f0f0"
    fillColor: "{colors.gradient-progress}"
    rounded: 30rpx
    height: 100%
---

## Overview

TimeGreen Path Todo (时光绿径待办) presents itself as a refreshing green-themed task management mini-program with a warm, organic visual identity. Every surface — from the frosted navigation bar to the super-rounded cards and pill-shaped buttons — communicates calm and approachability. The green is not just a color choice; it is the entire emotional framework: `{colors.primary}` (`#00b26a`) reads as growth, completion, and clarity, while the `{colors.canvas}` (`#e3f5eb`) feels like a soft meadow beneath the content. Cards float on gentle shadows, list items spill out into standalone rounded islands, and each micro-interaction (pulse on complete, bounce on star, lift on drag) rewards the user with a tactile, almost playful feedback loop.

The system has three dominant surface modes:
1. **Mint canvas** (`{colors.canvas}` — `#e3f5eb`) — page background, consistent across all pages
2. **White cards** (`{colors.surface-card}` — `#ffffff`) — content containers, todo items, forms, stats
3. **Frosted glass** (`{colors.surface-frost}` — `rgba(255,255,255,0.78)`) — navigation bars, popups, search bars

**Key Characteristics:**
- Monochromatic green palette — `{colors.primary}` (`#00b26a`) primary, `{colors.canvas}` (`#e3f5eb`) canvas — with zero competing brand colors. The six system tag colors are the only non-green elements, appearing exclusively as small dot indicators.
- Ultra-rounded corners (`{rounded.xl}` — 32rpx) applied universally: cards, buttons, inputs, popups, tabs, badges. This is the single strongest visual signature.
- Frosted glass navigation bar (`backdrop-filter: blur(20rpx) saturate(180%)`) with semi-transparent green-tinted background.
- Rich micro-animation system: `slideInUp` entry, `bounceIn` success, `completePulse` on todo done, `badgeBounce` on star, `dragLift` on reorder.
- TDesign WeChat component library (v1.12.3) as the UI foundation, heavily customized via CSS variables overriding the default blue brand color.
- Card-on-canvas layout rhythm: every white card floats on the mint canvas with 20rpx separation — no card touches another.

## Colors

> Coverage is uniform across all pages (todo, calendar, stats, community, more, add-todo, forms, user-center, login) — the system is tightly constrained to a single green axis.

### Brand & Primary
- **Brand Green** (`{colors.primary}` — `#00b26a`): The entire brand. Primary buttons, active tab fills, link text, completed-state text, icon accents, toggle switches, FAB. Every "active" or "selected" moment uses this exact hue.
- **Brand Green Light** (`{colors.primary-light}` — `#e0f2ec`): Light variant used for hover-like states and light button backgrounds.
- **Brand Green Fill** (`{colors.primary-light-fill}` — `#e8f8f0`): Selected-state backgrounds in dropdowns and tag selectors.
- **Brand Green Deep** (`{colors.primary-active}` — `#008550`): Pressed state for primary buttons.
- **Brand Canvas** (`{colors.canvas}` — `#e3f5eb`): The single page background color. Every page, every surface — no variation.

### Surface
- **Card White** (`{colors.surface-card}` — `#ffffff`): Primary card and content surface against the mint canvas.
- **Frosted Glass** (`{colors.surface-frost}` — `rgba(255,255,255,0.78)`): Translucent white used on navigation bars, popups, search bars, and notice cards. Always paired with `backdrop-filter: blur(20-24rpx) saturate(180%)`.
- **Input Fill** (`{colors.surface-input}` — `#f8f8f8`): Input field backgrounds, picker fields — slightly cool light gray creating a subtle depression.
- **Tag Surface** (`{colors.surface-tag}` — `#f5f5f5`): Unselected tag chip backgrounds, secondary button fills.
- **Hairline** (`{colors.hairline}` — `#e8e8e8`): Dividers, border-lines, table row separators. Soft variant (`{colors.hairline-soft}` — `#f5f5f5`) for lighter dividers.

### Text
- **Ink** (`{colors.ink}` — `#2d3436`): Primary headlines and navigation titles — the darkest point in the palette.
- **Body** (`{colors.body}` — `#333333`): Body text on white cards, form labels, todo titles.
- **Body Secondary** (`{colors.body-secondary}` — `#666666`): Secondary information, subtitles, metadata.
- **Muted** (`{colors.muted}` — `#999999`): Placeholder text, empty state hints, timestamps, captions.
- **Muted Soft** (`{colors.muted-soft}` — `#cccccc`): Dividers, footnote text, limit indicators.
- **On Primary** (`{colors.on-primary}` — `#ffffff`): Text on green buttons and badges.
- **On Frost** (`{colors.on-frost}` — `#333333`): Text on frosted-glass surfaces.

### Priority Colors
| Priority | Color | Meaning |
|----------|-------|---------|
| P1 | `{colors.priority-p1}` — `#e34d59` (red) | Urgent + important |
| P2 | `{colors.priority-p2}` — `#2196F3` (blue) | Important, not urgent |
| P3 | `{colors.priority-p3}` — `#FF9800` (orange) | Urgent, not important |
| P4 | `{colors.priority-p4}` — `#999999` (gray) | Neither |

Priorities are always rendered as both a left-edge vertical bar (8rpx wide, rounded-right corners) and a colored dot indicator. The bar extends the full height of the todo cell.

### Semantic
- **Success** (`{colors.success}` — `#00b26a`): Completion, confirmation. Shares the primary green — completion is inherently positive.
- **Warning** (`{colors.warning}` — `#faad14`): Warning callouts, alert banners.
- **Error/Danger** (`{colors.danger}` — `#e34d59`): Delete actions, error states, swipe-delete buttons. Stronger variant (`{colors.danger-strong}` — `#ff4d4f`) for comment delete text. Deep variant (`{colors.danger-deep}` — `#d90000`) for reject actions.
- **Love Active** (`{colors.love-active}` — `#ff4757`): Community post like heart in active state. The only pink in the system — a deliberate scarce accent.
- **Teal** (`{colors.teal}` — `#2dd4bf`): Notice bar accent (border-left), informational icons.
- **Star Gold** (`{colors.star-gold-1}` → `{colors.star-gold-2}` — `#fbbf24` → `#f59e0b`): Gold gradient for starred/favorited badge.

### Tag Colors
Six system-preset tags map to distinct hues — the only non-green elements in the entire system:

| Tag | Color | Usage |
|-----|-------|-------|
| Work | `{colors.tag-work}` — `#2196F3` | Blue — professional tasks |
| Study | `{colors.tag-study}` — `#4CAF50` | Green — learning tasks |
| Life | `{colors.tag-life}` — `#FF9800` | Orange — daily life |
| Health | `{colors.tag-health}` — `#E91E63` | Pink — health & fitness |
| Shopping | `{colors.tag-shopping}` — `#FF5722` | Deep orange — errands |
| Other | `{colors.tag-other}` — `#607D8B` | Blue-gray — uncategorized |

### Gradients
- **Primary Gradient** (`{colors.gradient-primary}` — `135deg, #3ddaa0 → #12b086`): Default weather card, splash screen accent.
- **Button Primary** (`{colors.gradient-btn-primary}` — `135deg, #00b26a → #3ddaa0`): Primary CTA buttons. The green glow.
- **Active Tab** (`{colors.gradient-tab-active}` — `135deg, #00b26a → #3ddaa0`): Active state for pill-style tab navigation.
- **Progress** (`{colors.gradient-progress}` — `90deg, #00b26a → #81c784`): Progress bar fill, left-to-right.
- **Completed** (`{colors.gradient-completed}` — `135deg, #ecfdf5 → #90e0b7`): Completed todo card background overlay.
- **Star** (`{colors.gradient-star}` — `135deg, #fbbf24 → #f59e0b`): Star badge background.
- **Notice** (`{colors.gradient-notice}` — `135deg, #f6ffed → #e8f8f0`): Notice bar background.
- **WeChat** (`{colors.gradient-wechat}` — `135deg, #07c160 → #06ad56`): WeChat login button — distinct from brand green.
- **Amber** (`{colors.gradient-amber}` — `135deg, #fbbf24 → #f59e0b`): Sunny weather card.

**Weather card gradients** also include: cloudy (`#93a5cf → #6b7fa8`), overcast (`#7a8a9e → #5a6a7e`), rainy (`#4a90d9 → #357abd`), snowy (`#a0b4cc → #7a8fa8`), foggy (`#b0b8c4 → #8a94a0`), windy (`#5fa8a0 → #3d8b83`).

## Typography

### Font Family
**System native stack** — no custom font loaded. The app relies entirely on the WeChat rendering engine's default fonts:
```
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC',
             'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue',
             Helvetica, Arial, sans-serif;
```
PingFang SC (iOS) and Microsoft YaHei (Android/Windows) provide Chinese glyph coverage. The design deliberately avoids custom fonts for startup performance.

### Hierarchy

| Token | Size (rpx) | Weight | Color | Use |
|---|---|---|---|---|
| `{typography.hero}` | 72 | 700 | `#fff` | Temperature on weather card |
| `{typography.display}` | 50 | 600 | `#2d3436` | Page navigation titles (uniform across all 5 tab pages) |
| `{typography.heading-lg}` | 46 | 700 | `#2d3436` | Login page hero title |
| `{typography.stat-number}` | 48 | 600 | `#2d3436` | Stat counters, completion numbers |
| `{typography.heading}` | 42 | 600 | `#2d3436` / `#2e7d32` | Success messages, user nickname |
| `{typography.subheading}` | 36 | 600 | `#333` | Modal titles, form question labels |
| `{typography.body-lg}` | 32 | 500 | `#333` / `#666` | Combo names, dropdown items, tab labels |
| `{typography.body}` | 28 | 400 | `#666` / `#999` | Secondary body, descriptions, hints |
| `{typography.caption}` | 26 | 400 | `#999` | Subtle captions, helper text |
| `{typography.caption-bold}` | 26 | 500 | `#666` | Bold captions, labeled values |
| `{typography.tiny}` | 24 | 400 | `#999` | Badge text, timestamps, counts |
| `{typography.mini}` | 22 | 400 | `#999` | Role badges, update timestamps |
| `{typography.button}` | 32 | 600 | `#fff` | Primary button labels |

### Principles
- **Single size spectrum** — all sizes in `rpx`, scaling uniformly across devices. The entire range (22–72rpx) covers every role without overlap.
- **Weight discipline:** 400 (body), 500 (medium emphasis), 600 (headings/buttons), 700 (hero). 800+ never used.
- **Green emphasis** — completed items, success messages, and brand moments use `{colors.primary}` at matching weights.
- **No letter-spacing modulation** — unlike editorial systems, no tightening of hero text or loosening of body copy. Standard spacing throughout.
- Page titles are consistently 50rpx weight 600 across all 5 main tab pages — a strong, repeatable visual hierarchy.

## Layout

### Spacing System
- **Base unit:** 4rpx.
- **Tokens:** `{spacing.xxs}` 8rpx · `{spacing.xs}` 12rpx · `{spacing.sm}` 16rpx · `{spacing.md}` 20rpx · `{spacing.lg}` 24rpx · `{spacing.xl}` 30rpx · `{spacing.xxl}` 40rpx · `{spacing.section}` 48rpx.
- **Page horizontal margins:** `{spacing.md}` (20rpx) — consistent across all content pages.
- **Card external margin:** `{spacing.md}` (20rpx) — applied consistently to every card-like container.
- **Card internal padding:** `{spacing.lg}`–`{spacing.xl}` (24–30rpx).
- **List item internal padding:** `12–20rpx` vertical, `{spacing.md}` (24rpx) horizontal.
- **Bottom safe area:** `{spacing.xxl}` (60rpx) on simple pages, up to 280–600rpx on form pages with floating controls.

### Page Structure
```
┌─────────────────────────────────────────┐
│  Frosted Nav (fixed)          z-index:999│  ← backdrop-filter: blur(20rpx)
│  ┌─────────────────────────────────────┐ │
│  │  Page Title (50rpx bold)     [icon] │ │
│  └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│                                          │
│  ┌─────────────────────────────────────┐ │
│  │  Card                               │ │  ← white, 32rpx radius, shadow
│  │  margin: 0 20rpx                    │ │
│  └─────────────────────────────────────┘ │
│        ↑ 20rpx gap                       │
│  ┌─────────────────────────────────────┐ │
│  │  Card                               │ │
│  └─────────────────────────────────────┘ │
│                                          │
├─────────────────────────────────────────┤
│  Bottom safe area (padding-bottom)       │  ← 60–600rpx
└─────────────────────────────────────────┘
```

### Navigation Bar Pattern (consistent across all pages)
```
.top (position: fixed, z-index: 999)
  .header
    .title (50rpx, 600, #2d3436 — left-aligned)
    optional .action-group (right-aligned icons)
```
- Background: `rgba(227, 245, 235, 0.6)` with `backdrop-filter: blur(20rpx) saturate(180%)`
- Height: dynamic, computed from device status bar + nav bar
- All main pages share this exact structure, with styles imported cross-file

### Tab Bar
- 5 bottom tabs: Todo, Calendar, Community, Stats, More
- Background: `{colors.tab-bar-bg}` (white)
- Active: `{colors.tab-bar-active}` (green `#00b26a`), Inactive: `{colors.tab-bar-inactive}` (`#666`)
- Tab icons as PNG pairs (active/inactive) in `/images/`

### Whitespace Philosophy
The `{colors.canvas}` acts as generous breathing room between cards. No card touches another — every white container floats on the green background with 20rpx of visual separation. This card-on-canvas pattern creates a consistent "floating island" rhythm. Inside cards, content is generously padded (24–30rpx) and never feels cramped. The bottom of each page carries a large padding (`{spacing.page-bottom}` — 400rpx) to account for the fixed tab bar and enable comfortable scroll overshoot.

## Elevation & Depth

| Level | Value | Use |
|---|---|---|
| 0 (flat) | No shadow | Calendar cells, plain text areas |
| 1 (subtle) | `0 4rpx 8rpx rgba(0,0,0,0.1)` | Advertisement cards, lightweight surfaces |
| 2 (card) | `0 4rpx 12rpx rgba(0,0,0,0.06-0.08)` | Todo cells, combo cards, stats cards |
| 3 (elevated) | `0 8rpx 20rpx rgba(0,0,0,0.08)` | Feature cards, tab containers |
| 4 (heavy) | `0 8rpx 40rpx rgba(0,0,0,0.1)` | Standard card-style wrapper |
| 5 (modal) | `0 8rpx 32rpx rgba(0,0,0,0.15)` | Dropdown menus, floating panels |
| 6 (drag) | `0 20rpx 60rpx rgba(45,212,191,0.3)` | Drag-lift state — green-tinted glow |
| Button | `0 8rpx 20rpx rgba(0,178,106,0.25)` | Primary buttons — green glow signature |

### Glassmorphism
The navigation bar is the primary glass element:
- Background: `rgba(227, 245, 235, 0.6)` (semi-transparent canvas)
- Backdrop filter: `blur(20rpx) saturate(180%)` via `-webkit-backdrop-filter` for iOS
- Applied to: top navigation bar, search bars, popup surfaces, notice cards

Cards themselves are purely flat with shadow — no glass effect on content surfaces. The frosted effect is reserved for layered UI (nav, popups) where the mint canvas should peek through.

### Interactive Depth
- **Card press feedback:** `transform: scale(0.97-0.98)` on `:active`
- **Drag lift:** `transform: scale(1.03)` + green-tinted shadow — `0 20rpx 60rpx rgba(45,212,191,0.3)`
- **Popup overlay:** Semi-transparent dark backdrop (`rgba(0,0,0,0.3)`)

## Shapes

### Border Radius Scale

| Token | Value | Use |
|---|---|---|
| `{rounded.xs}` | 12rpx | Small tags, voice tip bubbles |
| `{rounded.sm}` | 16rpx | Smaller card surfaces |
| `{rounded.md}` | 22rpx | Icon containers, edit buttons |
| `{rounded.lg}` | 24rpx | Inner popup content |
| **`{rounded.xl}`** | **32rpx** | **Universal default — cards, buttons, inputs, tabs, popups, cells, every surfaced element** |
| `{rounded.round}` | 50% | Avatars, color pickers, tag dots |
| `{rounded.pill}` | 9999rpx / 44-50rpx | Login buttons |

**Critical insight:** 32rpx (`{rounded.xl}`) is the universal radius. Unlike systems that tier radii for different component types, TimeGreen applies the same corner softening to nearly everything. This is the single strongest visual signature — the entire surface language reads as "super-rounded."

### Exceptions:
- Tags use 8rpx (`{rounded.xs}`) — small, distinct from containers
- Role badges use 8rpx inline — compact metadata pills
- Avatars and priority dots use 50% (`{rounded.round}`)
- Login/primary buttons use 44-50rpx (pill-shaped, taller than wide)

## Components

### Top Navigation

**`top-nav`** — Fixed frosted-glass bar at the top of every page. Semi-transparent canvas-green background (`rgba(227,245,235,0.6)`) with `backdrop-filter: blur(20rpx) saturate(180%)`. Contains a left-aligned page title in `{typography.display}` (50rpx, weight 600, `#2d3436`) and optional right-aligned action icons. Height is dynamically computed to include the device status bar. Applied uniformly across all pages.

### Buttons

**`button-primary`** — The signature green CTA. Background gradient `{colors.gradient-btn-primary}` (`135deg, #00b26a → #3ddaa0`), text `{colors.on-primary}` (white), type `{typography.button}` (32rpx, weight 600), height 88rpx, rounded pill (`44rpx`). Shadow `0 8rpx 20rpx rgba(0,178,106,0.25)` — the green glow. Disabled: background `#ccc`, no shadow.

**`button-secondary`** — Light gray pill for cancel/secondary actions. Background `#f5f5f5`, text `#8c8c8c`, rounded `40rpx`, height `72rpx`.

**`button-swipe-*`** — Sliding cell action buttons behind `t-swipe-cell`:
- Edit: `{colors.button-swipe-edit}` (`#ed7b2f`), 110rpx wide
- Delete: `{colors.button-swipe-delete}` (`#e34d59`), 110rpx wide
- Approve: `#08bd8f`, 110rpx wide
- Reject: `#f5f5f5`, text `#d90000`, 110rpx wide

**`button-wechat`** — WeChat login button with distinct green gradient (`{colors.gradient-wechat}` — `135deg, #07c160 → #06ad56`), distinct from the brand green. Height 88rpx, rounded `44rpx`. Includes WeChat icon + "微信登录" text.

**FAB (Floating Action Button)** — Circular TDesign `t-fab`. Background `{colors.primary}`, placed at `right: 32rpx`, `bottom: 32rpx`. Multiple stacked FABs offset vertically (primary at 32rpx, voice at 150rpx, back-to-top at 268rpx).

### Cards

Card Anatomy:
```
┌──────────────────────────────────┐
│  [icon/avatar]  Title    [badge] │  ← Header zone (24-30rpx padding)
│──────────────────────────────────│
│  Body content                    │  ← Body zone
│──────────────────────────────────│
│  [action]            [action]    │  ← Footer zone (optional)
└──────────────────────────────────┘
```
Every card: white background, `border-radius: {rounded.xl}` (32rpx), `margin-bottom: 20rpx`.

**`card-standard`** — Feature cards, stats sections, settings panels, tool grids. Shadow `0 8rpx 40rpx rgba(0,0,0,0.1)`, internal padding `{spacing.xl}` (30rpx).

**`card-compact`** — Todo list items, combo items. Shadow `0 4rpx 12rpx rgba(0,0,0,0.06)`, internal padding `{spacing.lg}` (24rpx). Wrapped in `t-swipe-cell` for swipe-to-reveal actions.

**`card-completed`** — Completed todo state. Background shifts to `{colors.gradient-completed}` (`135deg, #ecfdf5 → #90e0b7`), text color shifts to `{colors.success}` with strikethrough.

**`card-weather`** — Full-gradient weather summary card. Background `{colors.gradient-primary}` (or weather-specific variant), text white, shadow `0 12rpx 30rpx rgba(0,0,0,0.1)`, padding 28rpx.

**`card-frost`** — Frosted glass container. Background `{colors.surface-frost}` with `backdrop-filter: blur(24rpx) saturate(180%)` and `1rpx solid rgba(255,255,255,0.3)` border. Used for search bars, notice cards, dropdowns.

**Card Animation:**
- Entry: `animation: slideInUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)`
- Exit: `animation: slideOutRight 0.3s ease-out forwards`
- Todo complete: `animation: completePulse 0.5s ease-out`
- Star bounce: `animation: badgeBounce 0.4s ease-out`
- Drag lift: `transform: scale(1.03)`, shadow → `0 20rpx 60rpx rgba(45,212,191,0.3)`

### Tabs

**`tab-pill-container`** — White pill-style tab bar. Container: `display: flex; margin: 20rpx; background: #fff; border-radius: {rounded.xl}; padding: 8rpx; box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.06)`.

**`tab-pill-active`** — Active tab with green gradient background: `{colors.gradient-tab-active}` (`135deg, #00b26a → #3ddaa0`), white text, weight 500, rounded `{rounded.xl}`.

**`tab-pill-inactive`** — Inactive tab: transparent background, `{colors.body-secondary}` text, 32rpx font.

This is the signature navigation pattern: three pill tabs (e.g. All / Private / Shared) inside a white rounded container, the active tab filled with green gradient. Transition: `all 0.3s ease`.

### Forms

**`form-question`** — Form section header. Font 36rpx, weight 500, color `{colors.body}`, `padding-left: 32rpx`, with a `::before` pseudo-element: 16rpx green dot (`{colors.primary}`) as a left ornament. Required fields get a red asterisk.

**`text-input`** — Capsule-shaped input fields. Background `{colors.surface-input}` (`#f8f8f8`), `border-radius: {rounded.xl}` (32rpx), padding `26rpx 32rpx`. TDesign override: `--td-input-border-radius: 32rpx`. Placeholder: `{colors.muted-soft}` (`#bbbbbb`).

**`tag-chip`** — Tag chip grid inside forms. Container: `display: flex; flex-wrap: wrap; gap: 16rpx`. Chips: padding `12rpx 24rpx`, background `#f5f5f5`, `border-radius: 32rpx`, font 28rpx, color `#666`. Selected: background `rgba(0,178,106,0.15)`, border shifts to tag color.

### Todo Cells

The core todo list item: white card with 32rpx radius, compact shadow, 24rpx padding, 16rpx margin-bottom. Contains:
- Custom checkbox: 40rpx circle, `3rpx solid #ccc` border, checked state fills `{colors.primary}`
- Title text
- Optional tag/date label
- Optional left-edge priority bar: 8rpx wide, rounded-right corners, priority color
- Optional star badge: gold gradient, top-left fixed, `border-radius: 0 0 30rpx 0`

Wrapped in `t-swipe-cell` for swipe-to-reveal actions (edit/delete).

### Tags & Badges

**`badge-role-owner`** — "超" owner badge. Background `#fff3e0`, text `#ff9800`, rounded `8rpx`, padding `4rpx 14rpx`, font 22rpx.

**`badge-role-admin`** — "管" admin badge. Green gradient pill, white text.

**`badge-role-member`** — Member badge. Gray `#f5f5f5` background, `#999` text.

**`badge-star`** — Starred badge on todo items. Gold gradient `{colors.gradient-star}`, top-left position with `border-radius: 0 0 30rpx 0`. Bounce animation on add.

### Notifications & Popups

**`notice-bar`** — In-page notice announcement. Background `{colors.gradient-notice}` (`135deg, #f6ffed → #e8f8f0`), `border-left: 6rpx solid {colors.teal}`, rounded `{rounded.xl}`, shadow `0 4rpx 20rpx rgba(45,212,191,0.12)`. Padding `8rpx 24rpx`, margin `20rpx`.

**`popup-bottom-sheet`** — Bottom action sheet via `t-popup`. Content: white background, `border-radius: {rounded.xl} {rounded.xl} 0 0` (top corners only). Header padding 32rpx, bottom border 1rpx `#eee`. Close button: round, background `#eee`.

**`popup-centered`** — Centered dialog. Width 580-700rpx, `border-radius: {rounded.xl}`, `overflow: hidden`. Inner padding `48rpx 40rpx`. Dual-action buttons in flex row with 16rpx gap.

### Dropdown Menu

Fixed positioning below trigger, `left/right: 20rpx`. Border-radius `{rounded.xl}`, shadow `0 8rpx 32rpx rgba(0,0,0,0.15)`. Selected item: color `{colors.primary}`, weight 500, background `{colors.primary-light-fill}`. Color dot indicator: 24rpx, `border-radius: 50%`. Overlay: `rgba(0,0,0,0.3)`. `max-height: 60vh; overflow-y: auto`.

### Progress Bar

Container: `height: 100%; background: #f0f0f0; border-radius: 30rpx`. Fill: `{colors.gradient-progress}` (`linear-gradient(90deg, #00b26a, #81c784)`). Animation: `transition: width 0.6s ease-out`.

## Icons

The system uses **TDesign Icons** exclusively via the `<t-icon>` component. No emoji or custom SVG icons are used in the UI.

**Icon Size Scale:** 32rpx (inline) · 40rpx (list items) · 56rpx (section icons) · 88rpx (combo icons) · 120rpx (modal feature icons)

**Key Icon References (TDesign name → purpose):**
- `check` — complete · `close` — dismiss · `add` — create · `delete` — remove
- `edit-1` — edit · `scan` — QR scan · `share` — share · `star` — favorite
- `calendar` — date · `time` — time · `location` — location · `camera` — photo
- `search` — search · `filter` — filter · `sort` — sort · `more` — more
- `user` — profile · `setting` — settings · `power` — logout · `notice` — notification
- `chevron-left` / `chevron-right` — navigation arrows

## Animations

The app has a deliberate micro-animation system for tactile feedback:

### Animation Tokens

| Token | Duration | Easing | Use |
|---|---|---|---|
| `{anim.fast}` | 0.15s | `ease` | Hover states, simple transitions |
| `{anim.normal}` | 0.3s | `ease` / `ease-out` | General transitions, card state changes |
| `{anim.slow}` | 0.4-0.5s | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Card entry (bounce-out elastic) |
| `{anim.progress}` | 0.6s | `ease-out` | Progress bar fill |

### Keyframe Library

```css
@keyframes slideInUp {
  from { transform: translateY(40rpx) scale(0.95); opacity: 0; }
  to { transform: translateY(0) scale(1); opacity: 1; }
}
@keyframes completePulse {
  0% { transform: scale(1); background: #fff; }
  50% { transform: scale(1.02); background: linear-gradient(135deg, #ecfdf5, #90e0b7); }
  100% { transform: scale(1); }
}
@keyframes badgeBounce {
  0% { transform: scale(0) rotate(-30deg); }
  60% { transform: scale(1.2) rotate(5deg); }
  100% { transform: scale(1) rotate(0deg); }
}
@keyframes dragLift {
  to { transform: scale(1.03); box-shadow: 0 20rpx 60rpx rgba(45,212,191,0.3); }
}
@keyframes slideOutRight {
  to { transform: translateX(100%) scale(0.9); opacity: 0; }
}
@keyframes bounceIn {
  0% { transform: scale(0); }
  50% { transform: scale(1.12); }
  100% { transform: scale(1); }
}
@keyframes weatherFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10rpx); }
}
@keyframes noticeNewPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
```

### Interaction Principles
- Tap feedback: `transform: scale(0.98)` on active cards — subtle press response
- Drag: elevated shadow + scale(1.03) for lifted state
- Swipe: TDesign `t-swipe-cell` with native gesture handling
- Transition easing: elastic `cubic-bezier(0.34, 1.56, 0.64, 1)` for entrance, standard `cubic-bezier(0.23, 1, 0.32, 1)` for menus
- All cards have `transition: transform 0.3s ease, box-shadow 0.3s ease`

## Component Library

The app is built on **TDesign MiniProgram** (v1.12.3) with heavy customization:

**TDesign components in use:** `t-icon`, `t-cell` / `t-cell-group`, `t-swipe-cell`, `t-radio`, `t-button`, `t-fab`, `t-popup`, `t-action-sheet`, `t-tag`, `t-grid` / `t-grid-item`, `t-input`, `t-textarea`, `t-calendar`, `t-upload`, `t-switch`, `t-checkbox`, `t-loading`, `t-chat-markdown`, `t-drawer`, `t-overlay`, `t-divider`.

**Customization:** The primary customization is overriding `--td-brand-color` from TDesign's default blue to `{colors.primary}` (`#00b26a`), making all TDesign components adopt the green brand color. Additional overrides include `--td-button-border-radius: 32rpx` and `--td-input-border-radius: 32rpx` for the super-rounded shape language.

**Other dependencies:** `@lspriv/wx-calendar` (v1.8.4) with `@lspriv/wc-plugin-lunar` (v1.0.3-alpha.0) for calendar views; `ec-canvas` (v1.0.0) for ECharts stats; WeUI via `useExtendedLib`.

**Custom components:** One custom component — `components/post-card/` — for community post rendering (avatar, nickname with role badges, title, body, image grid, location, todo reference, stats bar).

## Dark Mode

**Current state: Partial / Not fully implemented.**

- TDesign components provide built-in dark mode support via `@media (prefers-color-scheme: dark)` CSS variables.
- The app overrides `--td-brand-color` in `app.wxss` for light mode only.
- There is **no** `@media (prefers-color-scheme: dark)` block in any of the app's own `.wxss` files.
- The mint canvas (`#e3f5eb`) and text colors (`#333`, `#666`, `#2d3436`) are hardcoded values, not CSS variables.
- TDesign interactive components respect dark mode at the component level, but the app's custom styling does not adapt.

## Responsive Behavior

### Design Standard
- Design width: **750rpx** (standard WeChat Mini Program design spec)
- All dimensions use `rpx` (responsive pixel), scaling proportionally with screen width
- No CSS media query breakpoints in the app's own styles

### Layout Behavior
- Flexbox is the primary layout method throughout
- CSS Grid used for: stats card grid (4 columns), priority quadrant (2 columns), image grids (1/2/3 columns)
- Text truncation: `text-overflow: ellipsis; white-space: nowrap` (single-line), `-webkit-line-clamp: 2` (multi-line)
- All dimensions in `rpx` — no `px` usage except for `border`
- Safe area insets (`env(safe-area-inset-bottom)`) applied to bottom-anchored UI

### Device Adaptation
| Device | Width | Behavior |
|--------|-------|----------|
| iPhone SE | 375px | Minimum width. Single-column, responsive via rpx. |
| iPhone 13 | 390px | Reference design width. All layouts as designed. |
| iPhone 14 Pro Max | 430px | Maximum width. More horizontal breathing room. |
| Android typical | 360-410px | Handled by rpx uniform scaling. |

### Touch Targets
- Primary buttons: 88rpx height (~44px) — meets minimum touch target
- Tab pills: ~80rpx effective height (comfortable)
- Swipe actions: 110rpx fixed width
- Bottom FAB: TDesign default, positioned `bottom: 32rpx; right: 32rpx`
- Connector/icon tiles: entire card area is tappable

## Do's and Don'ts

### Do
- Use `{colors.primary}` (`#00b26a`) for ALL active/selected/completed/success states — never introduce another brand color.
- Apply `{rounded.xl}` (32rpx) as the default corner radius for every surfaced element. This is the single strongest visual signature.
- Keep cards on the `{colors.canvas}` (`#e3f5eb`) with 20rpx separation — cards should never touch each other.
- Use the green gradient (`{colors.gradient-tab-active}`) on active tab pills, primary buttons, and gradient cards. Don't apply it to text or small elements.
- Animate card entry with `slideInUp` (0.4s, bounce-out easing) and completion with `completePulse`.
- Use priority color bars (red/blue/orange/gray) as the left-edge accent on todo cells for immediate visual categorization.
- Use `env(safe-area-inset-bottom)` on bottom-anchored elements (comment input, popups).

### Don't
- Don't introduce a second brand color. The system is monochromatic green — no blue accents, no purple highlights.
- Don't use corner radii smaller than 32rpx for containers. Tags (8rpx), badges (8rpx), and avatars (50%) are the only exceptions.
- Don't mix card border-radius values in the same viewport — inconsistent rounding breaks the visual language.
- Don't use shadows stronger than `0 8rpx 40rpx rgba(0,0,0,0.1)` on standard surfaces. Reserve green-tinted shadows for drag/button states only.
- Don't add glassmorphism to cards — the frosted effect is reserved exclusively for the navigation bar, popups, and search bars.
- Don't use `overflow: hidden` on card containers in atomic components (unsupported in glass-easel).
- Don't use the `gap` CSS property in atomic components (unsupported in glass-easel).
- Don't change the tab bar active color from green. The green active state is the primary navigation signal.

## Iteration Guide

1. Always check the existing spec before adding a new color, radius, or shadow — the system is intentionally constrained to a single green axis.
2. Reference component names and tokens directly (`{colors.primary}`, `{rounded.xl}`, `{typography.body}`) rather than hardcoding values.
3. When applying `border-radius: 32rpx`, verify it is the ONLY radius used in the viewport (except for tags and avatars).
4. New cards should default to `card-compact` or `card-standard` patterns — don't invent new card archetypes without design review.
5. Animations should reference the existing keyframe library — don't add new animation types unless necessary.
6. All shadows should come from the shadow scale. If a new shadow level is needed, add it to the scale, not inline.
7. For atomic components (AI mode cards), apply the same radius/shadow/padding tokens as regular cards, but respect glass-easel constraints: no `gap`, no `overflow`, no animations.
8. The design system is complete when a developer can build a new page using only these tokens and component patterns — without introducing any new values.

## Known Gaps

- **Dark mode is not implemented.** The system is light-mode-only. A full implementation would need dark variants of canvas, card, and all text colors, plus a `@media (prefers-color-scheme: dark)` block in `app.wxss`.
- **Font system is platform-default.** The app does not import custom fonts — it relies entirely on the WeChat system font stack. Brand typography differentiation would require licensed font loading.
- **Animation system is not tokenized.** Entrance animations, completion pulses, and drag lifts are defined inline as CSS keyframes, not extracted into a centralized animation token system.
- **Weather gradient variants** cover 8 weather conditions but are applied inline per-page rather than organized as a tokenized palette.
- **Form validation states** beyond the basic input style are not extracted — focused, error, and success states need a dedicated form flow to confirm.
- **Chart colors** in ECharts may use their own palette independent of the design tokens. Verify actual chart implementation against `{colors.gradient-progress}`.
- **Accessibility (a11y)** considerations are not formally documented — focus indicators, contrast ratios, and screen-reader labels follow WeChat Mini Platform defaults.
- **Safe area bottom padding** varies across pages (60-600rpx) due to differing bottom controls. This is page-level configuration, not a system token inconsistency.
- `{spacing.card-margin}` (20rpx) is a de-facto standard used across 28+ locations in 7 pages but does not cleanly fit the 8rpx increment scale. Consider formalizing it as a token.
