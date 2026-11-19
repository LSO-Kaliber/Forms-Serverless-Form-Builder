import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // Public routes (direct lightweight)
    {
      path: '/forms/:slug',
      name: 'public-form',
      component: () => import('@/views/public/PublicFormView.vue'),
    },
    {
      path: '/forms/:slug/terima-kasih',
      name: 'thank-you',
      component: () => import('@/views/public/ThankYouView.vue'),
    },
    {
      path: '/e/:token',
      name: 'edit-response',
      component: () => import('@/views/public/EditResponseView.vue'),
    },

    // Auth & Admin routes (lazy loaded)
    {
      path: '/login',
      name: 'admin-login',
      component: () => import('@/views/admin/AdminLoginView.vue'),
    },
    {
      path: '/admin',
      name: 'admin-dashboard',
      component: () => import('@/views/admin/AdminDashboardView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin/templates',
      name: 'admin-templates',
      component: () => import('@/views/admin/AdminTemplatesView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin/forms/:id/builder',
      name: 'admin-builder',
      component: () => import('@/views/admin/AdminFormBuilderView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin/forms/:id/responses',
      name: 'admin-responses',
      component: () => import('@/views/admin/AdminResponsesView.vue'),
      meta: { requiresAuth: true },
    },

    // Fallback
    {
      path: '/',
      redirect: '/login',
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/login',
    },
  ],
});

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();

  if (to.meta.requiresAuth) {
    if (authStore.isAuthenticated === null) {
      await authStore.checkAuth();
    }
    if (!authStore.isAuthenticated) {
      return next({ path: '/login', query: { redirect: to.fullPath } });
    }
  } else if (to.path === '/login') {
    if (authStore.isAuthenticated === null) {
      await authStore.checkAuth();
    }
    if (authStore.isAuthenticated) {
      return next('/admin');
    }
  }

  next();
});

export default router;
