<template>
  <div>
    <Topbar />
    <main class="max-w-5xl mx-auto px-4 py-6">
      <h1 class="text-xl font-semibold mb-4">All Settings</h1>
      <p class="text-slate-300 mb-4">Elenco aziende. Clicca per vedere gli utenti e l'ultimo accesso.</p>

      <div v-if="error" class="text-rose-400 text-sm mb-3">{{ error }}</div>

      <div v-if="companies.length === 0" class="text-slate-400">Nessuna azienda.</div>

      <!-- Header Filters + List -->
      <ListFilters
        v-else
        :items="companies"
        :fields="[
          { key: 'id', label: 'ID', type: 'number' },
          { key: 'name', label: 'Nome', type: 'string' },
          { key: 'suspended', label: 'Sospesa', type: 'boolean' }
        ]"
        new-label="Nuova azienda"
        @new="openCreateCompany"
        v-slot="{ filtered }"
      >
      <div v-if="filtered.length === 0" class="text-slate-400">Nessun risultato con i filtri correnti.</div>
      <div v-for="c in filtered" :key="c.id" class="mb-3 border border-white/10 rounded-xl overflow-hidden">
        <button @click="toggle(c.id)" class="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/10">
          <div class="font-medium flex items-center gap-2">
            <span>{{ c.name }}</span>
            <span v-if="c.suspended" class="text-amber-400 text-xs border border-amber-400/40 rounded px-2 py-0.5">Sospesa</span>
          </div>
          <div class="text-sm text-slate-400">{{ expanded.has(c.id) ? 'Nascondi' : 'Mostra' }}</div>
        </button>
        <div v-if="expanded.has(c.id)" class="px-4 py-3 bg-white/5 border-t border-white/10">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div class="text-sm text-slate-400">ID: {{ c.id }}</div>
            <div class="flex items-center gap-2">
              <button
                class="px-3 py-1 rounded border border-sky-500/40 text-sky-300 hover:bg-sky-500/10 text-sm"
                @click.stop="openFeatures(c)"
              >Abilitazioni</button>
              <button
                class="px-3 py-1 rounded border text-sm"
                :class="c.suspended ? 'border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10' : 'border-amber-500/40 text-amber-300 hover:bg-amber-500/10'"
                @click.stop="toggleSuspend(c)"
              >{{ c.suspended ? 'Riattiva azienda' : 'Sospendi azienda' }}</button>
              <button
                class="px-3 py-1 rounded border border-rose-500/40 text-rose-300 hover:bg-rose-500/10 text-sm"
                @click.stop="confirmDelete(c)"
              >Elimina azienda</button>
            </div>
          </div>
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
      </ListFilters>
    </main>

    <!-- Create Company Modal -->
    <transition name="fade">
      <div v-if="isCreating" class="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" @click.self="closeCreateCompany">
        <div class="w-full max-w-lg bg-[#0b1020] border border-white/10 rounded-xl p-4">
          <div class="flex items-center justify-between mb-2">
            <h2 class="text-lg font-semibold">Nuova azienda</h2>
            <button class="p-2 rounded-lg hover:bg-white/10" @click="closeCreateCompany" aria-label="Chiudi">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5"><path d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div v-if="createError" class="text-rose-400 text-sm mb-2">{{ createError }}</div>
          <div class="grid gap-3">
            <div>
              <label class="block text-xs text-slate-400 mb-1">Nome azienda</label>
              <input v-model="createForm.company_name" class="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm" placeholder="Es. ACME S.p.A." />
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs text-slate-400 mb-1">Email admin</label>
                <input v-model="createForm.email" class="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm" placeholder="admin@example.com" />
              </div>
               <div>
                 <label class="block text-xs text-slate-400 mb-1">Password admin</label>
                 <input v-model="createForm.password" type="password" autocomplete="new-password" class="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm" placeholder="Min 8 caratteri, maiuscole, numeri e simboli" />
               </div>
            </div>
            <div>
              <label class="block text-xs text-slate-400 mb-1">Nome admin (opzionale)</label>
              <input v-model="createForm.name" class="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm" placeholder="Nome e cognome" />
            </div>
            <div class="flex justify-end items-center gap-2 pt-2">
              <button class="px-3 py-2 rounded-lg text-sm bg-white/5 hover:bg-white/10" @click="closeCreateCompany">Annulla</button>
              <button class="px-3 py-2 rounded-lg text-sm bg-fuchsia-600 hover:bg-fuchsia-500 text-white" :disabled="creating" @click="saveCreateCompany">Crea</button>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- Company Features Modal -->
    <CompanyFeaturesModal :open="featuresOpen" :company="featuresCompany" @close="featuresOpen=false" @saved="/* noop */ void 0" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import Topbar from '../../components/Topbar.vue';
import ListFilters from '../../components/ListFilters.vue';
import api from '../../services/api';
import CompanyFeaturesModal from '../../components/CompanyFeaturesModal.vue';

const companies = ref<Array<{ id: number; name: string; suspended?: boolean }>>([]);
const expanded = ref<Set<number>>(new Set());
const usersByCompany = ref<Record<number, Array<{ id: number; email: string; role: string; last_login?: string }>>>({});
const loadingUsers = ref<Record<number, boolean>>({});
const error = ref('');

const isCreating = ref(false);
const creating = ref(false);
const createError = ref('');
const createForm = ref<{ company_name: string; email: string; password: string; name: string }>({
  company_name: '', email: '', password: '', name: ''
});

const featuresOpen = ref(false);
const featuresCompany = ref<{ id: number; name: string } | null>(null);

function formatTime(iso?: string) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString(); } catch { return '—'; }
}

async function loadCompanies() {
  try {
    const { data } = await api.get('/auth/companies');
    companies.value = (data || []).map((c: any) => ({ id: c.id, name: c.name, suspended: !!c.suspended }));
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

async function toggleSuspend(c: { id: number; name: string; suspended?: boolean }) {
  const desired = !c.suspended;
  const msg = desired
    ? `Sospendere l'azienda "${c.name}"? Gli utenti non potranno più accedere.`
    : `Riattivare l'azienda "${c.name}" e consentire di nuovo l'accesso?`;
  if (!confirm(msg)) return;
  try {
    const { data } = await api.post(`/auth/companies/${c.id}/suspend`, { suspended: desired });
    // Update local state
    const idx = companies.value.findIndex((x) => x.id === c.id);
    if (idx >= 0) companies.value[idx].suspended = !!data.suspended;
  } catch (e: any) {
    alert(e?.response?.data?.error || 'Errore nel cambiare lo stato di sospensione');
  }
}

async function confirmDelete(c: { id: number; name: string }) {
  // Double confirmation as requested
  if (!confirm(`Eliminare l'azienda "${c.name}" e tutti i suoi dati?`)) return;
  if (!confirm('Conferma definitiva: l\'operazione è irreversibile. Procedere?')) return;
  try {
    await api.delete(`/auth/companies/${c.id}`);
    // Remove from list and related caches
    companies.value = companies.value.filter((x) => x.id !== c.id);
    expanded.value.delete(c.id);
    delete usersByCompany.value[c.id];
  } catch (e: any) {
    alert(e?.response?.data?.error || 'Errore eliminazione azienda');
  }
}

loadCompanies();

function openCreateCompany() {
  createError.value = '';
  createForm.value = { company_name: '', email: '', password: '', name: '' };
  isCreating.value = true;
}

function closeCreateCompany() {
  isCreating.value = false;
  creating.value = false;
}

async function saveCreateCompany() {
  creating.value = true;
  createError.value = '';
  try {
    const payload: any = {
      company_name: createForm.value.company_name,
      company_mode: 'new',
      email: createForm.value.email,
      password: createForm.value.password,
      role: 'admin',
      name: createForm.value.name || undefined,
    };
    await api.post('/auth/register', payload);
    await loadCompanies();
    closeCreateCompany();
  } catch (e: any) {
    createError.value = e?.response?.data?.error || e?.message || 'Errore creazione azienda';
  } finally {
    creating.value = false;
  }
}

function openFeatures(c: { id: number; name: string }) {
  featuresCompany.value = { id: c.id, name: c.name };
  featuresOpen.value = true;
}
</script>

<style scoped></style>
