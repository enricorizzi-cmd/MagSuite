import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';

// Lazy load components for better performance
const Auth = () => import('./pages/auth/Auth.vue');
const Dashboard = () => import('./pages/dashboard/Dashboard.vue');
const AllSettings = () => import('./pages/settings/AllSettings.vue');
const Users = () => import('./pages/users/Users.vue');
// Gestionale
const GestionaleDashboard = () => import('./pages/gestionale/Dashboard.vue');
const GestionaleOrdini = () => import('./pages/gestionale/Ordini.vue');
const GestionaleOrdiniPortafoglio = () => import('./pages/gestionale/OrdiniPortafoglio.vue');
const GestionaleOrdiniErogazioni = () => import('./pages/gestionale/OrdiniErogazioni.vue');
const GestionaleContatti = () => import('./pages/gestionale/Contatti.vue');
const GestionaleSottoprodotti = () => import('./pages/gestionale/Sottoprodotti.vue');
const GestionaleProvvigioni = () => import('./pages/gestionale/Provvigioni.vue');
const GestionaleGames = () => import('./pages/gestionale/Games.vue');
const GestionaleMarketingClienti = () => import('./pages/gestionale/MarketingClienti.vue');
const GestionaleTarget = () => import('./pages/gestionale/Target.vue');
const GestionaleProfile = () => import('./pages/gestionale/Profile.vue');
// Logistica
const Giacenze = () => import('./pages/logistica/Giacenze.vue');
const Inventario = () => import('./pages/logistica/Inventario.vue');
const Magazzini = () => import('./pages/logistica/Magazzini.vue');
const Movimenti = () => import('./pages/logistica/Movimenti.vue');
// Direzione commerciale
const BPApp = () => import('./pages/direzione-commerciale/BPApp.vue');
// Direzione amministrativa
const PianoFinanziario = () => import('./pages/direzione-amministrativa/PianoFinanziario.vue');
const Marginalita = () => import('./pages/direzione-amministrativa/Marginalita.vue');
const FlussoDiCassa = () => import('./pages/direzione-amministrativa/FlussoDiCassa.vue');
const Scadenzari = () => import('./pages/direzione-amministrativa/Scadenzari.vue');
// Anagrafiche
const Clienti = () => import('./pages/anagrafiche/Clienti.vue');
const Fornitori = () => import('./pages/anagrafiche/Fornitori.vue');
const Articoli = () => import('./pages/anagrafiche/Articoli.vue');
const Operatori = () => import('./pages/anagrafiche/Operatori.vue');
// Edilizia
const SAL = () => import('./pages/edilizia/SAL.vue');
const MaterialiCantiere = () => import('./pages/edilizia/MaterialiCantiere.vue');
const ManodoperaCantiere = () => import('./pages/edilizia/ManodoperaCantiere.vue');
// Risorse umane
const FeriePermessi = () => import('./pages/risorse-umane/FeriePermessi.vue');
const EntrataUscita = () => import('./pages/risorse-umane/EntrataUscita.vue');
const Turni = () => import('./pages/risorse-umane/Turni.vue');

const routes: Array<RouteRecordRaw> = [
  { path: '/', name: 'auth', component: Auth },
  { path: '/dashboard', name: 'dashboard', component: Dashboard },
  { path: '/all-settings', name: 'all-settings', component: AllSettings },
  { path: '/users', name: 'users', component: Users },
  // Gestionale
  { path: '/gestionale', name: 'gestionale-dashboard', component: GestionaleDashboard },
  { path: '/gestionale/ordini', name: 'gestionale-ordini', component: GestionaleOrdini },
  { path: '/gestionale/ordini-portafoglio', name: 'gestionale-ordini-portafoglio', component: GestionaleOrdiniPortafoglio },
  { path: '/gestionale/ordini-erogazioni', name: 'gestionale-ordini-erogazioni', component: GestionaleOrdiniErogazioni },
  { path: '/gestionale/contatti', name: 'gestionale-contatti', component: GestionaleContatti },
  { path: '/gestionale/sottoprodotti', name: 'gestionale-sottoprodotti', component: GestionaleSottoprodotti },
  { path: '/gestionale/provvigioni', name: 'gestionale-provvigioni', component: GestionaleProvvigioni },
  { path: '/gestionale/games', name: 'gestionale-games', component: GestionaleGames },
  { path: '/gestionale/marketing-clienti', name: 'gestionale-marketing-clienti', component: GestionaleMarketingClienti },
  { path: '/gestionale/target', name: 'gestionale-target', component: GestionaleTarget },
  { path: '/gestionale/profile', name: 'gestionale-profile', component: GestionaleProfile },
  // Anagrafiche
  { path: '/anagrafiche/clienti', name: 'clienti', component: Clienti },
  { path: '/anagrafiche/fornitori', name: 'fornitori', component: Fornitori },
  { path: '/anagrafiche/articoli', name: 'articoli', component: Articoli },
  { path: '/anagrafiche/operatori', name: 'operatori', component: Operatori },
  // Logistica
  { path: '/logistica/giacenze', name: 'giacenze', component: Giacenze },
  { path: '/logistica/inventario', name: 'inventario', component: Inventario },
  { path: '/logistica/magazzini', name: 'magazzini', component: Magazzini },
  { path: '/logistica/movimenti', name: 'movimenti', component: Movimenti },
  // Edilizia
  { path: '/edilizia/sal', name: 'sal', component: SAL },
  { path: '/edilizia/materiali-cantiere', name: 'materiali-cantiere', component: MaterialiCantiere },
  { path: '/edilizia/manodopera-cantiere', name: 'manodopera-cantiere', component: ManodoperaCantiere },
  // Risorse umane
  { path: '/risorse-umane/ferie-permessi', name: 'ferie-permessi', component: FeriePermessi },
  { path: '/risorse-umane/entrata-uscita', name: 'entrata-uscita', component: EntrataUscita },
  { path: '/risorse-umane/turni', name: 'turni', component: Turni },
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
