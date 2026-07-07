import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/LoginView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/',
      name: 'Todo',
      component: () => import('@/views/TodoView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/todos/add',
      name: 'TodoAdd',
      component: () => import('@/components/todo/TodoForm.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/todos/:id',
      name: 'TodoDetail',
      component: () => import('@/components/todo/TodoDetail.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/todos/:id/edit',
      name: 'TodoEdit',
      component: () => import('@/components/todo/TodoForm.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/user-center',
      name: 'UserCenter',
      component: () => import('@/views/UserCenterView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/trash',
      name: 'Trash',
      component: () => import('@/views/TrashView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/notices',
      name: 'Notices',
      component: () => import('@/views/NoticeView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/changelogs',
      name: 'Changelogs',
      component: () => import('@/views/ChangelogView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/calendar',
      name: 'Calendar',
      component: () => import('@/views/CalendarView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/community',
      name: 'Community',
      component: () => import('@/views/CommunityView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/stats',
      name: 'Stats',
      component: () => import('@/views/StatsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/more',
      name: 'More',
      component: () => import('@/views/MoreView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/not-found',
      name: 'NotFound',
      component: () => import('@/views/NotFoundView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/not-found',
    },
  ],
})

router.beforeEach((to) => {
  const authStore = useAuthStore()
  if (to.meta.requiresAuth && !authStore.isLoggedIn) return '/login'
  if (to.path === '/login' && authStore.isLoggedIn) return '/'
})

export default router
