import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import Auth from './pages/auth/Auth.vue';
import Dashboard from './pages/dashboard/Dashboard.vue';
import AllSettings from './pages/settings/AllSettings.vue';
import Users from './pages/users/Users.vue';

const routes: Array<RouteRecordRaw> = [
  { path: '/', name: 'auth', component: Auth },
  { path: '/dashboard', name: 'dashboard', component: Dashboard },
  { path: '/all-settings', name: 'all-settings', component: AllSettings },
  { path: '/users', name: 'users', component: Users },
  { path: '/:pathMatch(.*)*', redirect: '/' }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');

  // If user hits the auth page and already has a token, send to dashboard
  if (to.path === '/') {
    if (token) return next('/dashboard');
    return next();
  }

  // For protected routes, require a token
  if (!token) return next({ path: '/', query: { redirect: to.fullPath } });
  next();
});

export default router;
