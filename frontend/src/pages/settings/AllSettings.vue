<template>
  <div>
    <Topbar />
    <main class="max-w-5xl mx-auto px-4 py-6">
      <h1 class="text-xl font-semibold mb-4">All Settings</h1>
      <p class="text-slate-300 mb-4">Elenco aziende. Clicca per vedere gli utenti e l'ultimo accesso.</p>

      <div v-if="error" class="text-rose-400 text-sm mb-3">{{ error }}</div>

      <div v-if="companies.length === 0" class="text-slate-400">Nessuna azienda.</div>

      <div v-for="c in companies" :key="c.id" class="mb-3 border border-white/10 rounded-xl overflow-hidden">
        <button @click="toggle(c.id)" class="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/10">
          <div class="font-medium">{{ c.name }}</div>
          <div class="text-sm text-slate-400">{{ expanded.has(c.id) ? 'Nascondi' : 'Mostra' }}</div>
        </button>
        <div v-if="expanded.has(c.id)" class="px-4 py-3 bg-white/5 border-t border-white/10">
          <div v-if="loadingUsers[c.id]" class="text-slate-400 text-sm">Caricamento utenti…</div>
          <div v-else>
            <div v-if="(usersByCompany[c.id] || []).length === 0" class="text-slate-400 text-sm">Nessun utente.</div>
            <div v-for="u in usersByCompany[c.id]" :key="u.id" class="flex items-center justify-between py-2 text-sm">
              <div class="text-slate-200">{{ u.email }}</div>
              <div class="text-slate-400">{{ u.role }}</div>
              <div class="text-slate-500">Ultimo login: {{ formatTime(u.last_login) }}</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import Topbar from '../../components/Topbar.vue';
import api from '../../services/api';

const companies = ref<Array<{ id: number; name: string }>>([]);
const expanded = ref<Set<number>>(new Set());
const usersByCompany = ref<Record<number, Array<{ id: number; email: string; role: string; last_login?: string }>>>({});
const loadingUsers = ref<Record<number, boolean>>({});
const error = ref('');

function formatTime(iso?: string) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString(); } catch { return '—'; }
}

async function loadCompanies() {
  try {
    const { data } = await api.get('/auth/companies');
    companies.value = data || [];
  } catch (e: any) {
    error.value = e?.response?.status === 403 ? 'Non autorizzato (solo super admin)' : (e?.message || 'Errore caricamento aziende');
  }
}

async function loadUsers(companyId: number) {
  loadingUsers.value[companyId] = true;
  try {
    const { data } = await api.get(`/auth/company-users/${companyId}`);
    usersByCompany.value[companyId] = data || [];
  } catch (e: any) {
    usersByCompany.value[companyId] = [];
  } finally {
    loadingUsers.value[companyId] = false;
  }
}

function toggle(id: number) {
  if (expanded.value.has(id)) {
    expanded.value.delete(id);
    expanded.value = new Set(expanded.value);
  } else {
    expanded.value.add(id);
    expanded.value = new Set(expanded.value);
    if (!usersByCompany.value[id]) loadUsers(id);
  }
}

loadCompanies();
</script>

<style scoped></style>

