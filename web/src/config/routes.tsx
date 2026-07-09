/**
 * 路由配置
 *
 * 定义应用的所有路由规则，使用 React.lazy 实现路由级懒加载。
 * 主应用路由需要配合 AuthGuard 和 AppLayout 使用。
 */

import type { RouteObject } from 'react-router-dom';
import { lazy } from 'react';

// ==================== 懒加载页面组件 ====================

/** 待办相关 */
const TodoList = lazy(() => import('@/pages/todo/TodoList/TodoList'));
const AddTodo = lazy(() => import('@/pages/todo/AddTodo/AddTodo'));
const TodoDetail = lazy(() => import('@/pages/todo/TodoDetail/TodoDetail'));
const TodoSearch = lazy(() => import('@/pages/todo/TodoSearch/TodoSearch'));

/** 组合相关 */
const ComboList = lazy(() => import('@/pages/combo/ComboList/ComboList'));
const ComboEdit = lazy(() => import('@/pages/combo/ComboEdit/ComboEdit'));
const ComboDetail = lazy(() => import('@/pages/combo/ComboDetail/ComboDetail'));

/** 日历相关 */
const CalendarView = lazy(() => import('@/pages/calendar/CalendarView/CalendarView'));
const DayTodos = lazy(() => import('@/pages/calendar/DayTodos/DayTodos'));

/** 统计相关 */
const StatsOverview = lazy(() => import('@/pages/stats/StatsOverview/StatsOverview'));
const DailyStats = lazy(() => import('@/pages/stats/DailyStats/DailyStats'));

/** 标签管理 */
const TagManage = lazy(() => import('@/pages/tag/TagManage/TagManage'));

/** 数据管理 */
const DataManage = lazy(() => import('@/pages/data/DataManage/DataManage'));
const Trash = lazy(() => import('@/pages/data/Trash/Trash'));

/** 用户中心 */
const UserCenter = lazy(() => import('@/pages/user/UserCenter/UserCenter'));

/** 工具页面 */
const PasswordGenerator = lazy(
  () => import('@/pages/tools/PasswordGenerator/PasswordGenerator')
);
const Eating = lazy(() => import('@/pages/tools/Eating/Eating'));
const Motivation = lazy(() => import('@/pages/tools/Motivation/Motivation'));
const Star = lazy(() => import('@/pages/tools/Star/Star'));
const Acknowledge = lazy(() => import('@/pages/tools/Acknowledge/Acknowledge'));

/** 系统页面 */
const Notice = lazy(() => import('@/pages/system/Notice/Notice'));
const Changelog = lazy(() => import('@/pages/system/Changelog/Changelog'));
const NotificationList = lazy(() => import('@/pages/notification/NotificationList'));

/** 协作 */
const CollabJoin = lazy(() => import('@/pages/collab/CollabJoin/CollabJoin'));

// ==================== 主应用路由配置 ====================

/**
 * 主应用路由数组
 *
 * 这些路由需要在 AppLayout 内部渲染，并受 AuthGuard 保护。
 * 所有路径均为相对于根路径 "/" 的子路由。
 */
export const routes: RouteObject[] = [
  // ---------- 待办模块 ----------
  {
    index: true,
    element: <TodoList />,
  },
  {
    path: 'todo/add',
    element: <AddTodo />,
  },
  {
    path: 'todo/:id/edit',
    element: <AddTodo />,
  },
  {
    path: 'todo/:id',
    element: <TodoDetail />,
  },
  {
    path: 'search',
    element: <TodoSearch />,
  },

  // ---------- 日历模块 ----------
  {
    path: 'calendar',
    element: <CalendarView />,
  },
  {
    path: 'calendar/:date',
    element: <DayTodos />,
  },

  // ---------- 组合模块 ----------
  {
    path: 'combos',
    element: <ComboList />,
  },
  {
    path: 'combos/new',
    element: <ComboEdit />,
  },
  {
    path: 'combos/:id/edit',
    element: <ComboEdit />,
  },
  {
    path: 'combos/:id',
    element: <ComboDetail />,
  },

  // ---------- 统计模块 ----------
  {
    path: 'stats',
    element: <StatsOverview />,
  },
  {
    path: 'stats/daily/:date',
    element: <DailyStats />,
  },

  // ---------- 标签管理 ----------
  {
    path: 'tags',
    element: <TagManage />,
  },

  // ---------- 工具页面 ----------
  {
    path: 'tools/password-generator',
    element: <PasswordGenerator />,
  },
  {
    path: 'tools/eating',
    element: <Eating />,
  },
  {
    path: 'tools/motivation',
    element: <Motivation />,
  },
  {
    path: 'tools/star',
    element: <Star />,
  },
  {
    path: 'tools/acknowledge',
    element: <Acknowledge />,
  },

  // ---------- 数据管理 ----------
  {
    path: 'data/manage',
    element: <DataManage />,
  },
  {
    path: 'data/trash',
    element: <Trash />,
  },

  // ---------- 用户中心 ----------
  {
    path: 'user-center',
    element: <UserCenter />,
  },

  // ---------- 系统页面 ----------
  {
    path: 'notice',
    element: <Notice />,
  },
  {
    path: 'changelog',
    element: <Changelog />,
  },
  {
    path: 'notifications',
    element: <NotificationList />,
  },

  // ---------- 协作 ----------
  {
    path: 'collab/join',
    element: <CollabJoin />,
  },
];
