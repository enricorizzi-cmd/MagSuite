<template>
  <div>
    <Topbar />
    <main class="max-w-5xl mx-auto px-4 py-6">
      <h1 class="text-xl font-semibold mb-4">Utenti</h1>
      <p class="text-slate-300 mb-4">Utenti della tua azienda.</p>
      <div v-if="error" class="text-rose-400 text-sm mb-3">{{ error }}</div>
      <ListFiltersTable
        :items="users"
        :fields="[
          { key: 'email', label: 'Email', type: 'string' },
          { key: 'name', label: 'Nome', type: 'string' },
          { key: 'role', label: 'Ruolo', type: 'enum', options: ['super_admin','admin','standard','manager','worker'] },
          { key: 'status', label: 'Stato', type: 'enum', options: ['active','pending','suspended'] },
          { key: 'last_login', label: 'Ultimo login', type: 'string' }
        ]"
        :new-label="role==='super_admin' ? 'Nuovo utente' : ''"
        :show-new="role==='super_admin'"
        empty-label="Nessun utente."
        @new="openCreate"
        @edit="openEdit"
      />
    </main>
  </div>

  <!-- Create Modal -->
  <transition name="fade">
    <div v-if="isCreating" class="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" @click.self="closeCreate">
      <div class="w-full max-w-lg bg-[#0b1020] border border-white/10 rounded-xl p-4">
        <div class="flex items-center justify-between mb-2">
          <h2 class="text-lg font-semibold">Nuovo utente</h2>
          <button class="p-2 rounded-lg hover:bg-white/10" @click="closeCreate" aria-label="Chiudi">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5"><path d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div v-if="createError" class="text-rose-400 text-sm mb-2">{{ createError }}</div>
        <div class="grid gap-3">
          <div>
            <label class="block text-xs text-slate-400 mb-1">Nome</label>
            <input v-model="createForm.name" class="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm" placeholder="Nome" />
          </div>
          <div>
            <label class="block text-xs text-slate-400 mb-1">Email</label>
            <input v-model="createForm.email" class="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm" placeholder="email@example.com" />
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs text-slate-400 mb-1">Ruolo</label>
              <select v-model="createForm.role" class="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200">
                <option value="super_admin">super_admin</option>
                <option value="admin">admin</option>
                <option value="standard">standard</option>
                <option value="manager">manager</option>
                <option value="worker">worker</option>
              </select>
            </div>
            <div>
              <label class="block text-xs text-slate-400 mb-1">Azienda</label>
              <select v-model.number="createForm.company_id" class="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200" :disabled="role!=='super_admin'">
                <option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>
          </div>
          <div>
            <label class="block text-xs text-slate-400 mb-1">Password</label>
            <input v-model="createForm.password" type="password" class="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm" placeholder="Min 8 caratteri, maiuscole, numeri e simboli" />
          </div>
          <div class="flex justify-end items-center gap-2 pt-2">
            <button class="px-3 py-2 rounded-lg text-sm bg-white/5 hover:bg-white/10" @click="closeCreate">Annulla</button>
            <button class="px-3 py-2 rounded-lg text-sm bg-fuchsia-600 hover:bg-fuchsia-500 text-white" :disabled="creating" @click="saveCreate">Crea</button>
          </div>
        </div>
      </div>
    </div>
  </transition>

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
              <select v-model="form.role" class="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200">
                <option value="super_admin">super_admin</option>
                <option value="admin">admin</option>
                <option value="standard">standard</option>
                <option value="manager">manager</option>
                <option value="worker">worker</option>
              </select>
            </div>
            <div>
              <label class="block text-xs text-slate-400 mb-1">Azienda</label>
              <select v-model.number="form.company_id" class="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200">
                <option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>
          </div>
          <div>
            <label class="block text-xs text-slate-400 mb-1">Stato</label>
            <select v-model="form.status" class="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200">
              <option value="active">attivo</option>
              <option value="pending">in attivazione</option>
              <option value="suspended">sospeso</option>
            </select>
          </div>
           <div>
             <label class="block text-xs text-slate-400 mb-1">Nuova password (opzionale)</label>
             <input v-model="form.password" type="password" autocomplete="new-password" class="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm" placeholder="Min 8 caratteri, maiuscole, numeri e simboli" />
           </div>
          <div class="flex justify-between items-center gap-2 pt-2">
            <button class="px-3 py-2 rounded-lg text-sm bg-rose-700/30 hover:bg-rose-700/50 text-rose-200" :disabled="saving" @click="confirmDelete">Elimina utente</button>
            <div class="flex items-center gap-2">
              <button
                class="px-3 py-2 rounded-lg text-sm bg-white/5 hover:bg-white/10 disabled:opacity-60"
                :disabled="saving || deleting"
                @click="closeEdit"
              >Annulla</button>
              <button
                v-if="editingUser"
                type="button"
                class="ml-auto px-3 py-2 rounded-lg text-sm border border-rose-500/40 text-rose-300 hover:bg-rose-500/10 disabled:opacity-60"
                :disabled="saving || deleting"
                @click="confirmDelete"
              >
                <span v-if="deleting">Eliminazione…</span>
                <span v-else>Elimina utente</span>
              </button>
              <button
                class="px-3 py-2 rounded-lg text-sm bg-fuchsia-600 hover:bg-fuchsia-500 text-white disabled:opacity-60"
                :class="editingUser ? '' : 'ml-auto'"
                :disabled="saving || deleting"
                @click="saveEdit"
              >Salva</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </transition>
  
</template>

<script setup lang="ts">
import { ref } from 'vue';
import Topbar from '../../components/Topbar.vue';
import ListFiltersTable from '../../components/ListFiltersTable.vue';
import api from '../../services/api';

type U = { id: number; email: string; role: string; last_login?: string; name?: string; company_id?: number; status?: string };
const users = ref<Array<U>>([]);
const error = ref('');
const role = ref<string>('');
const myCompanyId = ref<number | null>(null);
const companies = ref<Array<{ id: number; name: string }>>([]);

const isEditing = ref(false);
const saving = ref(false);
const deleting = ref(false);
const editError = ref('');
const editingUser = ref<U | null>(null);
const form = ref<{ name: string; email: string; role: string; company_id: number | null; password: string; status: string }>({
  name: '', email: '', role: 'standard', company_id: null, password: '', status: 'active'
});

const isCreating = ref(false);
const creating = ref(false);
const createError = ref('');
const createForm = ref<{ name: string; email: string; role: string; company_id: number | null; password: string }>({
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
    myCompanyId.value = typeof data?.company_id === 'number' ? data.company_id : null;
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
  deleting.value = false;
  saving.value = false;
  form.value = {
    name: u.name || '',
    email: u.email,
    role: u.role,
    company_id: typeof u.company_id === 'number' ? u.company_id : (companies.value[0]?.id ?? null),
    password: '',
    status: u.status || 'active'
  };
  isEditing.value = true;
}

function closeEdit() {
  isEditing.value = false;
  saving.value = false;
  deleting.value = false;
}

function openCreate() {
  createError.value = '';
  createForm.value = {
    name: '',
    email: '',
    role: 'standard',
    company_id: (role.value === 'super_admin' ? (companies.value[0]?.id ?? null) : (myCompanyId.value ?? null)),
    password: ''
  };
  isCreating.value = true;
}

function closeCreate() {
  isCreating.value = false;
  creating.value = false;
}

async function saveCreate() {
  creating.value = true;
  createError.value = '';
  try {
    const payload: any = {
      email: createForm.value.email,
      password: createForm.value.password,
      role: createForm.value.role,
      name: createForm.value.name,
      company_id: role.value === 'super_admin' ? createForm.value.company_id : (myCompanyId.value ?? null)
    };
    await api.post('/auth/register', payload);
    await loadUsers();
    closeCreate();
  } catch (e: any) {
    createError.value = e?.response?.data?.error || e?.message || 'Errore creazione';
  } finally {
    creating.value = false;
  }
}

async function saveEdit() {
  if (!editingUser.value || deleting.value) return;
  saving.value = true;
  editError.value = '';
  try {
    const payload: any = { email: form.value.email, role: form.value.role, company_id: form.value.company_id, name: form.value.name, status: form.value.status };
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

async function approveUser(u: U) {
  const r = prompt('Ruolo per questo utente (super_admin, admin, standard, manager, worker):', 'standard');
  if (!r) return;
  try {
    await api.post(`/auth/users/${u.id}/approve`, { role: r });
    await loadUsers();
  } catch (e: any) {
    alert(e?.response?.data?.error || e?.message || 'Errore approvazione');
  }
}

async function confirmDelete() {
  if (!editingUser.value || deleting.value) return;
  if (!confirm('Eliminare definitivamente questo utente?')) return;
  deleting.value = true;
  editError.value = '';
  try {
    await api.delete(`/auth/users/${editingUser.value.id}`);
    await loadUsers();
    closeEdit();
  } catch (e: any) {
    editError.value = e?.response?.data?.error || e?.message || 'Errore eliminazione';
  } finally {
    deleting.value = false;
  }
}

loadMe().then(() => Promise.all([loadCompaniesIfAllowed(), loadUsers()]));
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity .2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
