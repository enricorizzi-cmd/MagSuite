<template>
  <div>
    <Topbar />
    <main class="max-w-5xl mx-auto px-4 py-6">
      <h1 class="text-xl font-semibold mb-4">Utenti</h1>
      <p class="text-slate-300 mb-4">Utenti della tua azienda.</p>
      <div v-if="error" class="text-rose-400 text-sm mb-3">{{ error }}</div>
      <div v-if="users.length === 0" class="text-slate-400">Nessun utente.</div>
      <div v-for="u in users" :key="u.id" class="flex items-center justify-between gap-3 py-2 border-b border-white/10 text-sm">
        <div class="flex-1 min-w-0">
          <div class="text-slate-200 truncate">{{ u.email }}</div>
          <div class="text-slate-500 text-xs" v-if="u.name">Nome: {{ u.name }}</div>
        </div>
        <div class="w-28 text-slate-400 shrink-0">{{ u.role }}</div>
        <div class="hidden sm:block text-slate-500 shrink-0">Ultimo login: {{ formatTime(u.last_login) }}</div>
        <button v-if="role==='super_admin'" class="px-2 py-1 rounded-lg text-xs bg-white/10 hover:bg-white/20 text-slate-200 shrink-0" @click="openEdit(u)">Modifica</button>
      </div>
    </main>
  </div>

  <!-- Edit Modal -->
  <transition name="fade">
    <div v-if="isEditing" class="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" @click.self="closeEdit">
      <div class="w-full max-w-lg bg-[#0b1020] border border-white/10 rounded-xl p-4">
        <div class="flex items-center justify-between mb-2">
          <h2 class="text-lg font-semibold">Modifica utente</h2>
          <button class="p-2 rounded-lg hover:bg-white/10" @click="closeEdit" aria-label="Chiudi">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5"><path d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div v-if="editError" class="text-rose-400 text-sm mb-2">{{ editError }}</div>
        <div class="grid gap-3">
          <div>
            <label class="block text-xs text-slate-400 mb-1">Nome</label>
            <input v-model="form.name" class="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm" placeholder="Nome" />
          </div>
          <div>
            <label class="block text-xs text-slate-400 mb-1">Email</label>
            <input v-model="form.email" class="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm" placeholder="email@example.com" />
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs text-slate-400 mb-1">Ruolo</label>
              <select v-model="form.role" class="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm">
                <option value="super_admin">super_admin</option>
                <option value="admin">admin</option>
                <option value="standard">standard</option>
                <option value="manager">manager</option>
                <option value="worker">worker</option>
              </select>
            </div>
            <div>
              <label class="block text-xs text-slate-400 mb-1">Azienda</label>
              <select v-model.number="form.company_id" class="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm">
                <option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>
          </div>
          <div>
            <label class="block text-xs text-slate-400 mb-1">Nuova password (opzionale)</label>
            <input v-model="form.password" type="password" class="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm" placeholder="Min 8 caratteri, maiuscole, numeri e simboli" />
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <button class="px-3 py-2 rounded-lg text-sm bg-white/5 hover:bg-white/10" @click="closeEdit">Annulla</button>
            <button class="px-3 py-2 rounded-lg text-sm bg-fuchsia-600 hover:bg-fuchsia-500 text-white" :disabled="saving" @click="saveEdit">Salva</button>
          </div>
        </div>
      </div>
    </div>
  </transition>
  
</template>

<script setup lang="ts">
import { ref } from 'vue';
import Topbar from '../../components/Topbar.vue';
import api from '../../services/api';

type U = { id: number; email: string; role: string; last_login?: string; name?: string; company_id?: number };
const users = ref<Array<U>>([]);
const error = ref('');
const role = ref<string>('');
const companies = ref<Array<{ id: number; name: string }>>([]);

const isEditing = ref(false);
const saving = ref(false);
const editError = ref('');
const editingUser = ref<U | null>(null);
const form = ref<{ name: string; email: string; role: string; company_id: number | null; password: string }>({
  name: '', email: '', role: 'standard', company_id: null, password: ''
});

function formatTime(iso?: string) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString(); } catch { return '—'; }
}

async function loadUsers() {
  try {
    const { data } = await api.get('/auth/my-company/users');
    users.value = data || [];
  } catch (e: any) {
    error.value = e?.message || 'Errore caricamento utenti';
  }
}

async function loadMe() {
  try {
    const { data } = await api.get('/auth/me');
    role.value = data?.role || '';
  } catch {}
}

async function loadCompaniesIfAllowed() {
  if (role.value !== 'super_admin') return;
  try {
    const { data } = await api.get('/auth/companies');
    companies.value = data || [];
  } catch {}
}

function openEdit(u: U) {
  editingUser.value = u;
  editError.value = '';
  form.value = {
    name: u.name || '',
    email: u.email,
    role: u.role,
    company_id: typeof u.company_id === 'number' ? u.company_id : (companies.value[0]?.id ?? null),
    password: ''
  };
  isEditing.value = true;
}

function closeEdit() {
  isEditing.value = false;
  saving.value = false;
}

async function saveEdit() {
  if (!editingUser.value) return;
  saving.value = true;
  editError.value = '';
  try {
    const payload: any = { email: form.value.email, role: form.value.role, company_id: form.value.company_id, name: form.value.name };
    if (form.value.password) payload.password = form.value.password;
    await api.put(`/auth/users/${editingUser.value.id}`, payload);
    await loadUsers();
    closeEdit();
  } catch (e: any) {
    editError.value = e?.response?.data?.error || e?.message || 'Errore salvataggio';
  } finally {
    saving.value = false;
  }
}

loadMe().then(() => Promise.all([loadCompaniesIfAllowed(), loadUsers()]));
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity .2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>

