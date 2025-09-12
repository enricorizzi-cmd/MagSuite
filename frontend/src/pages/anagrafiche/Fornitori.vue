<template>
  <div>
    <Topbar />
    <main class="max-w-6xl mx-auto px-4 py-6">
      <h1 class="text-xl font-semibold mb-2">Fornitori</h1>
      <p class="text-slate-400 mb-4">Anagrafica fornitori (fino a 100 risultati).</p>

      <div v-if="loading" class="text-slate-400">Caricamento…</div>
      <div v-else-if="error" class="text-rose-400">{{ error }}</div>
      <div v-else>
        <div class="flex items-center mb-3">
          <div class="text-slate-400 text-sm">Totale: {{ total }}</div>
          <div class="ml-auto flex gap-2">
            <button class="px-3 py-1.5 rounded-lg text-sm bg-white/10 hover:bg-white/20 text-slate-200" @click="exportSuppliers('csv')">Export CSV</button>
            <button class="px-3 py-1.5 rounded-lg text-sm bg-white/10 hover:bg-white/20 text-slate-200" @click="exportSuppliers('xlsx')">Export XLSX</button>
          </div>
        </div>

        <ListFiltersTable
          :items="items"
          :fields="supplierFields"
          new-label="Nuovo fornitore"
          @new="openCreate"
          @edit="openEdit"
        />

        <!-- Pagination -->
        <div class="mt-3 flex items-center gap-3">
          <div class="text-slate-400 text-sm">Pagina {{ page }} di {{ totalPages }}</div>
          <div class="ml-auto flex gap-2">
            <button class="px-2 py-1 rounded border border-white/10 text-sm" :disabled="page<=1" @click="prevPage">Indietro</button>
            <button class="px-2 py-1 rounded border border-white/10 text-sm" :disabled="page>=totalPages" @click="nextPage">Avanti</button>
            <select v-model.number="limit" class="px-2 py-1 rounded bg-white/10 border border-white/10 text-sm text-slate-200" @change="changeLimit">
              <option :value="20">20</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>
          </div>
        </div>

        <!-- Create/Edit modal -->
        <transition name="fade">
          <div v-if="modal.open" class="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div class="w-full max-w-md bg-[#0b1020] border border-white/10 rounded-xl p-4">
              <div class="flex items-center mb-3">
                <h2 class="text-lg font-semibold">{{ modal.mode==='create' ? 'Nuovo fornitore' : 'Modifica fornitore' }}</h2>
                <button class="ml-auto p-2 rounded hover:bg-white/10" @click="closeModal" aria-label="Chiudi">✕</button>
              </div>
              <div class="grid gap-3">
                <label class="text-sm text-slate-300">Nome
                  <input v-model="form.name" type="text" class="mt-1 w-full bg-white/10 border border-white/10 rounded px-2 py-1.5 text-sm text-slate-200" />
                </label>
              </div>
              <div v-if="modal.error" class="mt-2 text-sm text-rose-400">{{ modal.error }}</div>
              <div class="mt-4 flex items-center gap-2">
                <button class="px-3 py-1.5 rounded-lg text-sm bg-white/10 hover:bg-white/20 text-slate-200" @click="closeModal">Annulla</button>
                <button class="ml-auto px-3 py-1.5 rounded-lg text-sm bg-fuchsia-600 hover:bg-fuchsia-500 text-white" :disabled="modal.saving" @click="saveModal">
                  <span v-if="modal.saving">Salvataggio…</span>
                  <span v-else>Salva</span>
                </button>
              </div>
            </div>
          </div>
        </transition>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import Topbar from '../../components/Topbar.vue';
import ListFiltersTable from '../../components/ListFiltersTable.vue';
import api from '../../services/api';

type Supplier = { id: number; name: string };

const items = ref<Supplier[]>([]);
const loading = ref(false);
const error = ref('');
const page = ref(1);
const limit = ref(20);
const total = ref(0);
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit.value)));

const supplierFields = [
  { key: 'id', label: 'ID', type: 'number' },
  { key: 'name', label: 'Nome', type: 'string' },
];

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const { data } = await api.get('/suppliers', { params: { page: page.value, limit: limit.value } });
    items.value = data?.items || [];
    total.value = typeof data?.total === 'number' ? data.total : 0;
  } catch (e: any) {
    error.value = e?.response?.data?.error || e?.message || 'Errore caricamento';
  } finally {
    loading.value = false;
  }
}

onMounted(load);

function prevPage() {
  if (page.value <= 1) return;
  page.value -= 1;
  load();
}
function nextPage() {
  if (page.value >= totalPages.value) return;
  page.value += 1;
  load();
}
function changeLimit() {
  page.value = 1;
  load();
}

async function exportSuppliers(format: 'csv'|'xlsx') {
  try {
    const res = await api.get(`/suppliers/export`, { params: { format }, responseType: 'blob' });
    const blob = new Blob([res.data], { type: res.headers['content-type'] || (format==='xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv') });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fornitori.${format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (e: any) {
    alert(e?.response?.data?.error || e?.message || 'Errore export');
  }
}

// Modal state for create/edit
const modal = ref<{ open: boolean; mode: 'create'|'edit'; id?: number|null; saving: boolean; error: string }>({ open: false, mode: 'create', id: null, saving: false, error: '' });
const form = ref<{ name: string }>({ name: '' });

function openCreate() {
  modal.value = { open: true, mode: 'create', id: null, saving: false, error: '' };
  form.value = { name: '' };
}
function openEdit(row: Supplier) {
  modal.value = { open: true, mode: 'edit', id: row.id, saving: false, error: '' };
  form.value = { name: row.name };
}
function closeModal() {
  modal.value.open = false;
}
async function saveModal() {
  try {
    modal.value.saving = true;
    modal.value.error = '';
    if (modal.value.mode === 'create') {
      await api.post('/suppliers', { name: form.value.name });
    } else if (modal.value.mode === 'edit' && modal.value.id) {
      await api.put(`/suppliers/${modal.value.id}`, { name: form.value.name });
    }
    modal.value.open = false;
    await load();
  } catch (e: any) {
    modal.value.error = e?.response?.data?.error || e?.message || 'Errore salvataggio';
  } finally {
    modal.value.saving = false;
  }
}
</script>

<style scoped></style>
