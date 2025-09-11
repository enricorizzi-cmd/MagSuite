<template>
  <header class="sticky top-0 z-40 backdrop-blur bg-black/20 border-b border-white/10">
    <!-- Top row: brand + sections + actions -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4 overflow-x-hidden">
      <!-- Left: Logo + Menu (mobile) -->
      <div class="flex items-center gap-2 sm:gap-3">
        <!-- On mobile: use the "M" icon as the menu button -->
        <button class="md:hidden p-1 -ml-1 rounded-lg hover:bg-white/10 text-slate-200" @click="isMenuOpen = true" aria-label="Apri menu">
          <img src="/icon.svg" alt="Apri menu" class="h-7 w-7" />
        </button>
        <!-- On desktop: show the static brand icon -->
        <img src="/icon.svg" alt="MagSuite" class="hidden md:block h-7 w-7" />
        <span class="hidden sm:inline text-sm font-semibold tracking-wide">MagSuite</span>
      </div>

      <!-- Center: Sections (desktop) -->
      <nav class="hidden md:flex items-center gap-2 text-sm">
        <RouterLink
          v-for="s in sections"
          :key="s.key"
          :to="s.base"
          class="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10"
          :class="{ 'bg-white/10 text-white': currentSection === s.key }"
        >
          {{ s.label }}
        </RouterLink>
      </nav>

      <!-- Right: Company, Notifications, Logout -->
      <div class="flex items-center gap-2 sm:gap-3 min-w-0">
        <!-- Company field: dropdown for super admin, static otherwise -->
        <div v-if="role==='super_admin'" class="min-w-0 sm:min-w-[160px] md:min-w-[220px] max-w-[50vw]">
          <select v-model="selectedCompanyId" @change="onCompanyChange"
                  class="company-select w-full bg-white/10 border border-white/10 rounded-lg px-2 sm:px-3 py-1.5 text-xs sm:text-sm text-slate-100 truncate">
            <option v-for="c in companies" :key="c.id" :value="String(c.id)">{{ c.name }}</option>
          </select>
        </div>
        <div v-else class="text-xs sm:text-sm text-slate-200 min-w-0 max-w-[48vw] truncate">
          <span class="opacity-70 hidden sm:inline">Azienda:</span> <span class="truncate inline-block align-bottom max-w-full">{{ currentCompany?.name || '-' }}</span>
        </div>

        <!-- Ask notifications permission (only if needed) -->
        <button v-if="showNotifCTA" @click="askNotifPermission"
                class="hidden sm:inline-flex px-2 py-1 rounded-lg text-xs bg-white/10 hover:bg-white/20 text-slate-200">
          Attiva notifiche
        </button>

        <!-- Notifications bell -->
        <div class="relative shrink-0">
          <button @click="toggleNotifications" class="p-2 rounded-lg hover:bg-white/10 relative" aria-label="Notifiche">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6">
              <path d="M12 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 006 14h12a1 1 0 00.707-1.707L18 11.586V8a6 6 0 00-6-6z"/>
              <path d="M8 16a4 4 0 008 0H8z"/>
            </svg>
            <span v-if="unread > 0" class="absolute -top-1 -right-1 bg-fuchsia-500 text-white text-[10px] rounded-full px-1.5 py-0.5">
              {{ unread > 99 ? '99+' : unread }}
            </span>
          </button>

          <div v-if="notifOpen" class="absolute right-0 mt-2 w-80 max-w-[92vw] max-h-96 overflow-auto bg-[#0b1020]/95 border border-white/10 rounded-xl shadow-xl p-2">
            <div class="flex items-center justify-between px-2 py-1">
              <div class="text-sm font-semibold">Notifiche</div>
              <button class="text-xs text-slate-300 hover:text-white" @click="markAll">Segna tutte lette</button>
            </div>
            <div v-if="notifications.length === 0" class="text-sm text-slate-400 px-2 py-4">Nessuna notifica</div>
            <div v-for="(n, idx) in notifications" :key="idx" class="px-2 py-2 rounded-lg hover:bg-white/5">
              <div class="text-sm text-slate-100">{{ n.title }}</div>
              <div class="text-xs text-slate-400" v-if="n.body">{{ n.body }}</div>
              <div class="text-[10px] text-slate-500" v-if="n.time">{{ formatTime(n.time) }}</div>
            </div>
          </div>
        </div>

        <!-- Logout -->
        <button @click="logout" class="px-2 py-1.5 rounded-lg text-sm bg-white/10 hover:bg-white/20 text-slate-200 shrink-0"
                aria-label="Esci">
          <svg class="w-5 h-5 sm:hidden" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><path d="M15.75 2.25a.75.75 0 01.75.75v5.25a.75.75 0 01-1.5 0V4.81l-8.47 8.47a.75.75 0 11-1.06-1.06L13.94 3.75H10.5a.75.75 0 010-1.5h5.25z"/><path d="M4.5 20.25h9.75a.75.75 0 010 1.5H4.5A2.25 2.25 0 012.25 19.5V4.5A2.25 2.25 0 014.5 2.25h9.75a.75.75 0 010 1.5H4.5c-.414 0-.75.336-.75.75v15a.75.75 0 00.75.75z"/></svg>
          <span class="hidden sm:inline">Esci</span>
        </button>
      </div>
    </div>

    <!-- Second row: Tabs (desktop) -->
    <div class="hidden md:block border-t border-white/10">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-10 flex items-center gap-2 overflow-x-auto">
        <RouterLink
          v-for="t in sectionTabs"
          :key="t.path"
          :to="t.path"
          class="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 whitespace-nowrap"
          :class="{ 'bg-white/10 text-white': isActive(t.path) }"
        >
          {{ t.label }}
        </RouterLink>
      </div>
    </div>

    <!-- Mobile drawer -->
    <transition name="fade">
      <div v-if="isMenuOpen" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-[1px]" @click="isMenuOpen=false"></div>
    </transition>
    <transition name="slide">
      <aside v-if="isMenuOpen" class="fixed top-0 left-0 h-full w-72 bg-[#0b1020]/95 border-r border-white/10 p-4 z-50 shadow-2xl">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <img src="/icon.svg" class="h-6 w-6" />
            <span class="font-semibold">MagSuite</span>
          </div>
          <button class="p-2 rounded-lg hover:bg-white/10" @click="isMenuOpen=false" aria-label="Chiudi menu">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <nav class="grid gap-2 overflow-y-auto pr-1">
          <div v-for="s in sections" :key="s.key" class="">
            <div class="text-[11px] uppercase tracking-wide text-slate-400 px-2">{{ s.label }}</div>
            <RouterLink
              v-for="t in tabsForSection(s.key)"
              :key="t.path"
              :to="t.path"
              @click="isMenuOpen=false"
              class="block px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10"
              :class="{ 'bg-white/10 text-white': isActive(t.path) }"
            >
              {{ t.label }}
            </RouterLink>
          </div>
        </nav>
      </aside>
    </transition>
  </header>
</template>

<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../services/api';
import { connectNotifications, unreadCount, items as notifItems, markAllRead, canRequestNotificationPermission, requestNotificationPermission } from '../services/notifications';

const route = useRoute();
const router = useRouter();

// Sections and tabs
type Tab = { label: string; path: string };
type Section = { key: 'home' | 'anagrafiche' | 'logistica' | 'edilizia' | 'commerciale' | 'amministrativa' | 'impostazioni'; label: string; base: string };

const role = ref<string>('');

const sections = computed<Section[]>(() => [
  { key: 'home', label: 'Home', base: '/dashboard' },
  { key: 'anagrafiche', label: 'Anagrafiche', base: '/anagrafiche/clienti' },
  { key: 'logistica', label: 'Logistica', base: '/logistica/giacenze' },
  { key: 'edilizia', label: 'Edilizia', base: '/edilizia/sal' },
  { key: 'commerciale', label: 'Direzione commerciale', base: '/direzione-commerciale/bpapp' },
  { key: 'amministrativa', label: 'Direzione amministrativa', base: '/direzione-amministrativa/piano-finanziario' },
  { key: 'impostazioni', label: 'Impostazioni', base: role.value === 'super_admin' ? '/all-settings' : '/users' },
]);

function sectionFromPath(path: string): Section['key'] {
  if (path.startsWith('/anagrafiche')) return 'anagrafiche';
  if (path.startsWith('/logistica')) return 'logistica';
  if (path.startsWith('/edilizia')) return 'edilizia';
  if (path.startsWith('/direzione-commerciale')) return 'commerciale';
  if (path.startsWith('/direzione-amministrativa')) return 'amministrativa';
  if (path === '/users' || path === '/all-settings') return 'impostazioni';
  return 'home';
}

const currentSection = computed(() => sectionFromPath(route.path));

function tabsForSection(key: Section['key']): Tab[] {
  switch (key) {
    case 'home':
      return [{ label: 'Dashboard', path: '/dashboard' }];
    case 'anagrafiche':
      return [
        { label: 'Clienti', path: '/anagrafiche/clienti' },
        { label: 'Fornitori', path: '/anagrafiche/fornitori' },
        { label: 'Articoli', path: '/anagrafiche/articoli' },
        { label: 'Operatori', path: '/anagrafiche/operatori' },
      ];
    case 'logistica':
      return [
        { label: 'Giacenze', path: '/logistica/giacenze' },
        { label: 'Inventario', path: '/logistica/inventario' },
        { label: 'Magazzini', path: '/logistica/magazzini' },
        { label: 'Movimenti', path: '/logistica/movimenti' },
      ];
    case 'edilizia':
      return [
        { label: 'SAL', path: '/edilizia/sal' },
        { label: 'Materiali di cantiere', path: '/edilizia/materiali-cantiere' },
        { label: 'Manodopera di cantiere', path: '/edilizia/manodopera-cantiere' },
      ];
    case 'commerciale':
      return [
        { label: 'BPApp', path: '/direzione-commerciale/bpapp' },
      ];
    case 'amministrativa':
      return [
        { label: 'Piano Finanziario', path: '/direzione-amministrativa/piano-finanziario' },
        { label: 'Marginalità', path: '/direzione-amministrativa/marginalita' },
        { label: 'Flusso di Cassa', path: '/direzione-amministrativa/flusso-di-cassa' },
        { label: 'Scadenzari', path: '/direzione-amministrativa/scadenzari' },
      ];
    case 'impostazioni':
      return [
        ...(role.value === 'super_admin' ? [{ label: 'All Settings', path: '/all-settings' } as Tab] : []),
        { label: 'Utenti', path: '/users' },
      ];
  }
}

const sectionTabs = computed<Tab[]>(() => tabsForSection(currentSection.value));

const isMenuOpen = ref(false);
const notifOpen = ref(false);
const unread = unreadCount;
const notifications = notifItems;
const showNotifCTA = ref(false);

const companies = ref<Array<{ id: number; name: string }>>([]);
const currentCompany = ref<{ id: number; name: string } | null>(null);
const selectedCompanyId = ref<string>('');

function isActive(path: string) {
  return route.path === path;
}

function formatTime(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString();
}

function toggleNotifications() {
  notifOpen.value = !notifOpen.value;
  if (notifOpen.value) markAllRead();
}

async function askNotifPermission() {
  const res = await requestNotificationPermission();
  showNotifCTA.value = res === 'default';
}

async function loadMe() {
  const { data } = await api.get('/auth/me');
  role.value = data?.role;
}

async function loadCurrentCompany() {
  try {
    const { data } = await api.get('/auth/current-company');
    currentCompany.value = data;
    if (!selectedCompanyId.value) {
      selectedCompanyId.value = String(data.id);
      localStorage.setItem('companyId', selectedCompanyId.value);
    }
  } catch {
    // ignore
  }
}

async function loadCompaniesIfAllowed() {
  if (role.value !== 'super_admin') return;
  const { data } = await api.get('/auth/companies');
  companies.value = data || [];
  const saved = localStorage.getItem('companyId');
  if (saved && companies.value.some(c => String(c.id) === saved)) {
    selectedCompanyId.value = saved;
  } else if (companies.value[0]) {
    selectedCompanyId.value = String(companies.value[0].id);
  }
  if (selectedCompanyId.value) localStorage.setItem('companyId', selectedCompanyId.value);
}

function onCompanyChange() {
  if (selectedCompanyId.value) localStorage.setItem('companyId', selectedCompanyId.value);
  // Refresh current company label
  loadCurrentCompany();
}

onMounted(async () => {
  await loadMe();
  await loadCompaniesIfAllowed();
  await loadCurrentCompany();
  connectNotifications();
  // Show CTA if we can ask for notifications permission
  showNotifCTA.value = canRequestNotificationPermission();
});

// Prevent background scrolling when the mobile menu is open
watch(isMenuOpen, (open) => {
  try {
    document.body.style.overflow = open ? 'hidden' : '';
  } catch {}
});

function logout() {
  try { localStorage.removeItem('token'); } catch {}
  try { sessionStorage.removeItem('token'); } catch {}
  try { localStorage.removeItem('companyId'); } catch {}
  router.push('/');
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity .2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.slide-enter-active, .slide-leave-active { transition: transform .25s ease; }
.slide-enter-from, .slide-leave-to { transform: translateX(-100%); }
</style>

<!-- Global styles for native select dropdown contrast -->
<style>
/* Ensure readable options in the OS/native dropdown list */
.company-select { color-scheme: dark; }
.company-select option { color: #0f172a; background-color: #ffffff; }
</style>


