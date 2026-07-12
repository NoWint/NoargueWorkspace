# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**时光绿径待办 (TimeGreen Path Todo)** — A WeChat Mini Program todo app with Node.js/Express backend and MySQL 5.5. Features: todo CRUD with drag-and-drop, combo (folder) system with collaboration/shared todos, calendar integration, voice input (WechatSI), charts, community posts, check-in, work reports, password generator, admin panel, offline-first sync.

## Architecture

```
WeChat Mini Program <-> HTTP/JSON <-> Express API (ECS) <-> MySQL 5.5
                                        ^
                                    website/ (Vite+Vue, in-dev web version)
```

### Frontend (Mini Program)

- **`utils/api.js`** — Centralized API client: `authApi`, `todosApi`, `tagsApi`, `combosApi`, `collabApi`, `notifyApi`, `configApi`, `adminApi`, `shareApi`, `communityApi`, `userApi`, `checkinApi`, `workReportApi`, `reportTemplateApi`. Auto-attaches JWT via `Authorization: Bearer`, handles 401 → login redirect.
- **`utils/sync.js`** — Offline-first sync: per-todo incremental storage (`todo_{id}` keys), timestamp-based conflict resolution (`mergeChanges()`), incremental/full sync strategies.
- **`utils/logger.js`** — Frontend logger with env-aware sampling, auto ERROR batch reporting to backend.
- **`utils/util.js`** — Date/time formatting helpers.
- **`app.js`** — Global app: config loading, auth, data sync, custom nav bar height calc, version check, share link scene parsing.
- **UI**: TDesign Miniprogram components, `@lspriv/wx-calendar` calendar, `ec-canvas` charts, WechatSI voice plugin, custom navigation bar, dark green theme (`--primary-color: #00b26a`).

### Page Structure (app.json)

| Package | Root | Pages |
|---------|------|-------|
| Main tabs | `pages/` | todo, calendar, community-home, stats, more |
| Admin | `packageAdmin/` | index, users, user-detail, notices, notice-edit, changelog, changelog-edit, reports, report-detail |
| Combo | `packageCombo/` | combo-edit, combo-detail, collaboration, combo-stats, report-board, report-templates |
| Tools | `packageTools/` | eating, password-generator, motivation, star, acknowledge, join-collab, trash, datamanage, tag-manage |
| Pages | `packagePages/` | add-todo, changelog, daily-stats, day-todos, guide, login, notice, todo-detail, share-config, todo-search, user-center, checkin, checkinLeaderboard, report-detail, report-edit |
| Community | `packageCommunity/` | post-detail, post-edit |
| Profile | `packageProfile/` | user-home |

Preload rules: todo page preloads combo+pages+profile; community-home preloads community+pages+profile; more preloads tools.

### Backend (`backend/`)

- **`app.js`** — Express on port 3000. Mounts 19 route groups: auth, todos, tags, combos, collab, notify, config, upload, admin, comments, share, log, posts, likes, post-comments, reports, users, checkin, work-reports. Also has share snapshot cleanup, notification scheduler.
- **`config/database.js`** — MySQL 5.5 connection pool (mysql2) with `query()` and `transaction()` helpers. Uses TEXT fields for serialized data (no JSON column support in MySQL 5.5).
- **`middleware/auth.js`** — JWT (`jsonwebtoken`, 7-day expiry). `authMiddleware` (required), `optionalAuth` (attaches user if token present), `isAdmin` (checks admin ID list).
- **`services/wechatService.js`** — WeChat template message notification + scheduler.
- **`services/qrcodeSession.js`** — QR code login session management.
- **`controllers/`** (20 files) — Business logic per domain.
- **`routes/`** (19 files) — Express routers delegating to controllers.
- **`migrations/`** (30+ SQL files) — Incremental DB migrations ordered by prefix number.
- **`utils/logger.js`** — Structured backend logger with colored console output, level-based filtering, API/DB/System log categories.
- **`utils/ipLocator.js`** — IP geolocation via ip2region.
- **`utils/checkinBadgeHelper.js`** — Check-in badge/achievement logic.

### Web Version (`website/`)

Vite + Vue 3 + TypeScript + Pinia + TDesign Vue Next + Vue Router. In development — covers todo list, calendar, stats, community, user center. No CLI build step for the mini program; the web version uses `npm run dev` / `npm run build`.

## Database

MySQL `timegreenpath`. Tables: users, tags, todo_tags, todos, combos, combo_items, collab_todos, collab_members, collab_messages, posts, post_likes, post_images, comments, comment_likes, notices, changelogs, reports, qr_sessions, share_snapshots, share_visitors, checkin_logs, work_reports, report_templates, sync_logs.

**Note**: MySQL 5.5 has no JSON column support and only allows one TIMESTAMP with CURRENT_TIMESTAMP — migrations/ directory has workaround patterns.

## Common Commands

```bash
# Backend (production)
cd backend
npm install           # Install deps first
npm start             # Start on port 3000

# Backend (development with hot reload)
cd backend
npm run dev           # nodemon

# Backend requires .env with: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME,
# JWT_SECRET, WECHAT_APPID, WECHAT_SECRET, etc.

# Web version (if working on website/)
cd website
npm install
npm run dev           # Vite dev server
npm run build         # vue-tsc check + vite build

# Miniprogram: no CLI build — open project root in WeChat Developer Tools
# (project.config.json defines the project config)
```

## Key Patterns

- **Auth**: JWT in `wx.getStorageSync('authToken')`, sent as `Authorization: Bearer <token>`. Backend verifies via `authMiddleware`. Token expiry: 7 days.
- **Sync**: Offline-first. Each todo stored as `todo_{id}` key in wx storage. Index maintained in `todos_index`. Sync strategies: incremental (default, diff-based), full (fallback), cloud-wins, local-wins. Conflict resolution compares `updatedAt` timestamps.
- **API flow**: MiniProgram → `utils/api.js` `request()` wrapper → Express routes/controllers → MySQL. Response format: `{ success: boolean, data?: any, message?: string }`.
- **Routes**: Backend routes in `app.js` use `app.use('/prefix', routeModule)` pattern. Each route file creates an `express.Router()`, defines CRUD endpoints, exports the router.
- **Custom nav bar**: All pages use a custom component-based navigation bar. `app.js` onLaunch calculates `navBarHeight`, `menuTop`, `menuRight`, `menuHeight` from system info and menu button bounding rect, stored in `globalData`.
- **SubPackages**: Heavy use of WeChat subPackages for code splitting. Preload rules in `app.json` for main tab pages.
- **Backend logging**: Structured logger at `backend/utils/logger.js` with `systemInfo`, `systemError`, `apiWarn`, `dbError`, etc. — uses LOG_MODULES enum (AUTH, TODO, COMBO, DB, API, SYSTEM, etc.).
