import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import Auth from './pages/auth/Auth.vue';
import Dashboard from './pages/dashboard/Dashboard.vue';

const routes: Array<RouteRecordRaw> = [
  { path: '/', name: 'auth', component: Auth },
  { path: '/dashboard', name: 'dashboard', component: Dashboard },
  { path: '/:pathMatch(.*)*', redirect: '/' }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach((to, from, next) => {
  if (to.path === '/') return next();
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (!token) return next({ path: '/', query: { redirect: to.fullPath } });
  next();
});

export default router;
