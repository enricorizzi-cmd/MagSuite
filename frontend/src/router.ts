import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import Auth from './pages/auth/Auth.vue';
import Dashboard from './pages/dashboard/Dashboard.vue';
import AllSettings from './pages/settings/AllSettings.vue';
import Users from './pages/users/Users.vue';
// Logistica
import Giacenze from './pages/logistica/Giacenze.vue';
import Inventario from './pages/logistica/Inventario.vue';
import Magazzini from './pages/logistica/Magazzini.vue';
import Movimenti from './pages/logistica/Movimenti.vue';
// Direzione commerciale
import BPApp from './pages/direzione-commerciale/BPApp.vue';
// Direzione amministrativa
import PianoFinanziario from './pages/direzione-amministrativa/PianoFinanziario.vue';
import Marginalita from './pages/direzione-amministrativa/Marginalita.vue';
import FlussoDiCassa from './pages/direzione-amministrativa/FlussoDiCassa.vue';
import Scadenzari from './pages/direzione-amministrativa/Scadenzari.vue';

const routes: Array<RouteRecordRaw> = [
  { path: '/', name: 'auth', component: Auth },
  { path: '/dashboard', name: 'dashboard', component: Dashboard },
  { path: '/all-settings', name: 'all-settings', component: AllSettings },
  { path: '/users', name: 'users', component: Users },
  // Logistica
  { path: '/logistica/giacenze', name: 'giacenze', component: Giacenze },
  { path: '/logistica/inventario', name: 'inventario', component: Inventario },
  { path: '/logistica/magazzini', name: 'magazzini', component: Magazzini },
  { path: '/logistica/movimenti', name: 'movimenti', component: Movimenti },
  // Direzione commerciale (placeholder section)
  { path: '/direzione-commerciale/bpapp', name: 'bpapp', component: BPApp },
  // Direzione amministrativa
  { path: '/direzione-amministrativa/piano-finanziario', name: 'piano-finanziario', component: PianoFinanziario },
  { path: '/direzione-amministrativa/marginalita', name: 'marginalita', component: Marginalita },
  { path: '/direzione-amministrativa/flusso-di-cassa', name: 'flusso-di-cassa', component: FlussoDiCassa },
  { path: '/direzione-amministrativa/scadenzari', name: 'scadenzari', component: Scadenzari },
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
