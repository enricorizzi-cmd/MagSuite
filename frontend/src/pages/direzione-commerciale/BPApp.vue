<template>
  <div>
    <Topbar />
    <main class="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <header class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-slate-100">Direzione commerciale</h1>
          <p class="text-sm text-slate-400">Pianificazione commerciale, andamento squadra e pipeline vendite.</p>
        </div>
        <div class="flex flex-wrap gap-2 text-sm">
          <RouterLink
            class="rounded-lg border border-white/10 px-3 py-1.5 text-slate-200 hover:bg-white/10"
            to="/anagrafiche/clienti"
          >Apri anagrafiche clienti</RouterLink>
          <RouterLink
            class="rounded-lg border border-white/10 px-3 py-1.5 text-slate-200 hover:bg-white/10"
            to="/users"
          >Gestisci utenti</RouterLink>
        </div>
      </header>

      <nav class="flex flex-wrap gap-2 text-sm">
        <RouterLink
          v-for="tab in tabs"
          :key="tab.to"
          :to="tab.to"
          class="rounded-full border px-3 py-1.5 transition"
          :class="isActive(tab.to)
            ? 'border-cyan-400/60 bg-cyan-400/10 text-cyan-100'
            : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'"
        >{{ tab.label }}</RouterLink>
      </nav>

      <section class="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
        <DashboardView v-if="currentView === 'dashboard'" />
        <AgendaView v-else-if="currentView === 'agenda'" />
        <PeriodsView v-else-if="currentView === 'periodi'" />
        <ClientsView v-else-if="currentView === 'clienti'" />
        <SalesView v-else-if="currentView === 'vendite'" />
        <TeamView v-else-if="currentView === 'squadra'" />
        <SettingsView v-else-if="currentView === 'impostazioni'" />
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import Topbar from '../../components/Topbar.vue';
import { useBpStore } from '../../stores/bp';
import DashboardView from './components/DashboardView.vue';
import AgendaView from './components/AgendaView.vue';
import PeriodsView from './components/PeriodsView.vue';
import ClientsView from './components/ClientsView.vue';
import SalesView from './components/SalesView.vue';
import TeamView from './components/TeamView.vue';
import SettingsView from './components/SettingsView.vue';

const store = useBpStore();
const route = useRoute();
const router = useRouter();

const tabs = [
  { label: 'Dashboard', to: '/direzione-commerciale', view: 'dashboard' },
  { label: 'Agenda', to: '/direzione-commerciale/agenda', view: 'agenda' },
  { label: 'Periodi & KPI', to: '/direzione-commerciale/periodi', view: 'periodi' },
  { label: 'Clienti', to: '/direzione-commerciale/clienti', view: 'clienti' },
  { label: 'Vendite', to: '/direzione-commerciale/vendite', view: 'vendite' },
  { label: 'Squadra & provvigioni', to: '/direzione-commerciale/squadra', view: 'squadra' },
  { label: 'Impostazioni', to: '/direzione-commerciale/impostazioni', view: 'impostazioni' }
];

const currentView = computed(() => {
  const path = route.path;
  if (path === '/direzione-commerciale') return 'dashboard';
  if (path.includes('/agenda')) return 'agenda';
  if (path.includes('/periodi')) return 'periodi';
  if (path.includes('/clienti')) return 'clienti';
  if (path.includes('/vendite')) return 'vendite';
  if (path.includes('/squadra')) return 'squadra';
  if (path.includes('/impostazioni')) return 'impostazioni';
  return 'dashboard';
});

function isActive(path: string) {
  if (path === '/direzione-commerciale') {
    return route.path === path;
  }
  return route.path.startsWith(path);
}

onMounted(() => {
  store.loadConsultants().catch(() => undefined);
  if (route.path === '/direzione-commerciale/bpapp') {
    router.replace('/direzione-commerciale');
  }
});
</script>
