import { createBrowserRouter, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { AppLayout } from '@/features/layout/AppLayout'
import { LoginView } from '@/features/auth/LoginView'
import { TodayView } from '@/features/todo/TodayView'
import { AllTodosView } from '@/features/todo/AllTodosView'
import { TodoForm } from '@/features/todo/TodoForm'
import { TodoDetail } from '@/features/todo/TodoDetail'
import { CalendarView } from '@/features/calendar/CalendarView'

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
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
