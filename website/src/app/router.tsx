/**
 * 时光绿径待办 — Web 前端路由
 * @author  NoWint (https://github.com/NoWint)
 */
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { AppLayout } from '@/features/layout/AppLayout'
import { LoginView } from '@/features/auth/LoginView'
import { TodayView } from '@/features/todo/TodayView'
import { AllTodosView } from '@/features/todo/AllTodosView'
import { TodoForm } from '@/features/todo/TodoForm'
import { TodoDetail } from '@/features/todo/TodoDetail'
import { CalendarView } from '@/features/calendar/CalendarView'
import { StatsView } from '@/features/stats/StatsView'
import { CombosView } from '@/features/todo/CombosView'
import { ComboDetailView } from '@/features/todo/ComboDetailView'
import { CollaborationView } from '@/features/combo/CollaborationView'
import { JoinCollabView } from '@/features/combo/JoinCollabView'
import { ComboStatsView } from '@/features/combo/ComboStatsView'
import { SearchView } from '@/features/search/SearchView'
import { TrashView } from '@/features/trash/TrashView'

import { StarView } from '@/features/star/StarView'
import { UserCenterView } from '@/features/user/UserCenterView'
import { TagManageView } from '@/features/tags/TagManageView'
import { NoticeView } from '@/features/notice/NoticeView'
import { ChangelogView } from '@/features/changelog/ChangelogView'
import { GuideView } from '@/features/guide/GuideView'

import { PasswordGeneratorView } from '@/features/tools/PasswordGeneratorView'
import { EatingView } from '@/features/tools/EatingView'
import { MotivationView } from '@/features/tools/MotivationView'
import { DataManageView } from '@/features/tools/DataManageView'

import { CheckinView } from '@/features/checkin/CheckinView'
import { LeaderboardView } from '@/features/checkin/LeaderboardView'

import { ReportBoardView } from '@/features/report/ReportBoardView'
import { ReportDetailView } from '@/features/report/ReportDetailView'
import { ReportEditView } from '@/features/report/ReportEditView'
import { ReportTemplatesView } from '@/features/report/ReportTemplatesView'

import { CommunityHomeView } from '@/features/community/CommunityHomeView'
import { PostDetailView } from '@/features/community/PostDetailView'
import { PostEditView } from '@/features/community/PostEditView'
import { UserHomeView } from '@/features/community/UserHomeView'

import { AdminHomeView } from '@/features/admin/AdminHomeView'
import { AdminUsersView } from '@/features/admin/AdminUsersView'
import { AdminNoticesView } from '@/features/admin/AdminNoticesView'
import { AdminChangelogView } from '@/features/admin/AdminChangelogView'
import { AdminReportsView } from '@/features/admin/AdminReportsView'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginView />,
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <TodayView /> },
      { path: 'todos', element: <AllTodosView /> },
      { path: 'todos/new', element: <TodoForm mode="create" /> },
      { path: 'todos/:id/edit', element: <TodoForm mode="edit" /> },
      { path: 'todos/:id', element: <TodoDetail /> },
      { path: 'calendar', element: <CalendarView /> },
      { path: 'stats', element: <StatsView /> },
      { path: 'combos', element: <CombosView /> },
      { path: 'combos/:id', element: <ComboDetailView /> },
      { path: 'combos/:id/collaboration', element: <CollaborationView /> },
      { path: 'combos/:id/stats', element: <ComboStatsView /> },
      { path: 'join-collab', element: <JoinCollabView /> },
      { path: 'search', element: <SearchView /> },
      { path: 'trash', element: <TrashView /> },

      { path: 'star', element: <StarView /> },
      { path: 'user-center', element: <UserCenterView /> },
      { path: 'tags', element: <TagManageView /> },
      { path: 'notice', element: <NoticeView /> },
      { path: 'changelog', element: <ChangelogView /> },
      { path: 'guide', element: <GuideView /> },

      { path: 'tools/password', element: <PasswordGeneratorView /> },
      { path: 'tools/eating', element: <EatingView /> },
      { path: 'tools/motivation', element: <MotivationView /> },
      { path: 'tools/data', element: <DataManageView /> },

      { path: 'checkin', element: <CheckinView /> },
      { path: 'leaderboard', element: <LeaderboardView /> },

      { path: 'reports', element: <ReportBoardView /> },
      { path: 'reports/new', element: <ReportEditView mode="create" /> },
      { path: 'reports/templates', element: <ReportTemplatesView /> },
      { path: 'reports/:id/edit', element: <ReportEditView mode="edit" /> },
      { path: 'reports/:id', element: <ReportDetailView /> },

      { path: 'community', element: <CommunityHomeView /> },
      { path: 'community/new', element: <PostEditView /> },
      { path: 'community/user/:userId', element: <UserHomeView /> },
      { path: 'community/:postId/edit', element: <PostEditView /> },
      { path: 'community/:postId', element: <PostDetailView /> },

      { path: 'admin', element: <AdminHomeView /> },
      { path: 'admin/users', element: <AdminUsersView /> },
      { path: 'admin/notices', element: <AdminNoticesView /> },
      { path: 'admin/changelog', element: <AdminChangelogView /> },
      { path: 'admin/reports', element: <AdminReportsView /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
