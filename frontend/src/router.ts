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

function getToken(): string | null {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
}

function isTokenValid(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload?.exp) return false;
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

function clearToken() {
  try { localStorage.removeItem('token'); } catch {}
  try { sessionStorage.removeItem('token'); } catch {}
}

router.beforeEach((to, from, next) => {
  let token = getToken();
  const valid = token ? isTokenValid(token) : false;

  // If token exists but is invalid/expired, clear it
  if (token && !valid) {
    clearToken();
    token = null;
  }

  // If user hits the auth page and already has a valid token, send to dashboard
  if (to.path === '/') {
    if (token) return next('/dashboard');
    return next();
  }

  // For protected routes, require a valid token
  if (!token) return next({ path: '/', query: { redirect: to.fullPath } });
  next();
});

export default router;
