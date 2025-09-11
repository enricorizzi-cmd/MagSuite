<template>
  <header class="sticky top-0 z-40 backdrop-blur bg-black/20 border-b border-white/10">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
      <!-- Left: Logo + Menu (mobile) -->
      <div class="flex items-center gap-3">
        <button class="md:hidden p-2 rounded-lg hover:bg-white/10" @click="isMenuOpen = true" aria-label="Apri menu">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
        <img src="/icon.svg" alt="MagSuite" class="h-7 w-7" />
        <span class="hidden sm:inline text-sm font-semibold tracking-wide">MagSuite</span>
      </div>

      <!-- Center: Tabs (desktop) -->
      <nav class="hidden md:flex items-center gap-2 text-sm">
        <RouterLink v-for="t in tabs" :key="t.path" :to="t.path"
          class="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10"
          :class="{ 'bg-white/10 text-white': isActive(t.path) }">
          {{ t.label }}
        </RouterLink>
      </nav>

      <!-- Right: Company, Notifications -->
      <div class="flex items-center gap-3">
        <!-- Company field: dropdown for super admin, static otherwise -->
        <div v-if="role==='super_admin'" class="min-w-[220px]">
          <select v-model="selectedCompanyId" @change="onCompanyChange"
                  class="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-1.5 text-sm">
            <option v-for="c in companies" :key="c.id" :value="String(c.id)">{{ c.name }}</option>
          </select>
        </div>
        <div v-else class="text-sm text-slate-200 min-w-[180px] truncate">
          <span class="opacity-70">Azienda:</span> {{ currentCompany?.name || '—' }}
        </div>

        <!-- Ask notifications permission (only if needed) -->
        <button v-if="showNotifCTA" @click="askNotifPermission"
                class="px-2 py-1 rounded-lg text-xs bg-white/10 hover:bg-white/20 text-slate-200">
          Attiva notifiche
        </button>

        <!-- Notifications bell -->
        <div class="relative">
          <button @click="toggleNotifications" class="p-2 rounded-lg hover:bg-white/10 relative" aria-label="Notifiche">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6">
              <path d="M12 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 006 14h12a1 1 0 00.707-1.707L18 11.586V8a6 6 0 00-6-6z"/>
              <path d="M8 16a4 4 0 008 0H8z"/>
            </svg>
            <span v-if="unread > 0" class="absolute -top-1 -right-1 bg-fuchsia-500 text-white text-[10px] rounded-full px-1.5 py-0.5">
              {{ unread > 99 ? '99+' : unread }}
            </span>
          </button>

          <div v-if="notifOpen" class="absolute right-0 mt-2 w-80 max-h-96 overflow-auto bg-[#0b1020]/95 border border-white/10 rounded-xl shadow-xl p-2">
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
      </div>
    </div>

    <!-- Mobile drawer -->
    <transition name="fade">
      <div v-if="isMenuOpen" class="fixed inset-0 bg-black/60" @click="isMenuOpen=false"></div>
    </transition>
    <transition name="slide">
      <aside v-if="isMenuOpen" class="fixed top-0 left-0 h-full w-72 bg-[#0b1020] border-r border-white/10 p-4">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <img src="/icon.svg" class="h-6 w-6" />
            <span class="font-semibold">MagSuite</span>
          </div>
          <button class="p-2 rounded-lg hover:bg-white/10" @click="isMenuOpen=false" aria-label="Chiudi menu">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <nav class="grid gap-1">
          <RouterLink v-for="t in tabs" :key="t.path" :to="t.path" @click.native="isMenuOpen=false"
            class="px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10"
            :class="{ 'bg-white/10 text-white': isActive(t.path) }">
            {{ t.label }}
          </RouterLink>
        </nav>
      </aside>
    </transition>
  </header>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import api from '../services/api';
import { connectNotifications, unreadCount, items as notifItems, markAllRead, canRequestNotificationPermission, requestNotificationPermission } from '../services/notifications';

const route = useRoute();
const tabs = computed(() => {
  const base = [{ label: 'Dashboard', path: '/dashboard' }];
  const list = [{ label: 'Utenti', path: '/users' }, ...base];
  if (role.value === 'super_admin') list.unshift({ label: 'All Settings', path: '/all-settings' });
  return list;
});

const isMenuOpen = ref(false);
const notifOpen = ref(false);
const unread = unreadCount;
const notifications = notifItems;
const showNotifCTA = ref(false);

const role = ref<string>('');
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
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity .2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.slide-enter-active, .slide-leave-active { transition: transform .25s ease; }
.slide-enter-from, .slide-leave-to { transform: translateX(-100%); }
</style>



