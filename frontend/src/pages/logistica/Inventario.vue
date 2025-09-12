<template>
  <div>
    <Topbar />
    <main class="max-w-6xl mx-auto px-4 py-6">
      <div class="flex items-center mb-3">
        <h1 class="text-xl font-semibold">Inventario</h1>
      </div>
      <p class="text-slate-400 mb-4">Sessioni di inventario.</p>

      <div v-if="loading" class="text-slate-400">Caricamento…</div>
      <div v-else-if="error" class="text-rose-400">{{ error }}</div>
      <div v-else>
        <ListFiltersTable
          :items="rows"
          :fields="invFields"
          new-label="Nuovo inventario"
          :page="page"
          :limit="limit"
          @new="createInventory"
          @edit="openEdit"
        />

        <!-- Pagination (client-side) -->
        <div class="mt-3 flex items-center gap-3">
          <div class="text-slate-400 text-sm">Pagina {{ page }}</div>
          <div class="ml-auto flex gap-2">
            <button class="px-2 py-1 rounded border border-white/10 text-sm" :disabled="page<=1" @click="page = page - 1">Indietro</button>
            <button class="px-2 py-1 rounded border border-white/10 text-sm" :disabled="(page*limit) >= rows.length" @click="page = page + 1">Avanti</button>
            <select v-model.number="limit" class="px-2 py-1 rounded bg-white/10 border border-white/10 text-sm text-slate-200">
              <option :value="20">20</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>
          </div>
        </div>

        <!-- Edit/Actions modal -->
        <transition name="fade">
          <div v-if="modal.open" class="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div class="w-full max-w-md bg-[#0b1020] border border-white/10 rounded-xl p-4">
              <div class="flex items-center mb-3">
                <h2 class="text-lg font-semibold">Inventario #{{ modal.id }}</h2>
                <button class="ml-auto p-2 rounded hover:bg-white/10" @click="closeModal" aria-label="Chiudi">✕</button>
              </div>
              <div class="text-sm text-slate-300">Stato: <span :class="statusClass(modal.status)" class="px-2 py-0.5 rounded text-xs">{{ modal.status }}</span></div>
              <div v-if="modal.error" class="mt-2 text-sm text-rose-400">{{ modal.error }}</div>
              <div class="mt-4 flex flex-wrap gap-2">
                <button v-if="modal.status==='open'" class="px-3 py-1.5 rounded-lg text-sm bg-white/10 hover:bg-white/20 text-slate-200" :disabled="modal.busy" @click="freezeInv">Congela</button>
                <button v-if="modal.status==='frozen'" class="px-3 py-1.5 rounded-lg text-sm bg-white/10 hover:bg-white/20 text-slate-200" :disabled="modal.busy" @click="approveInv">Approva</button>
                <button v-if="modal.status!=='closed'" class="px-3 py-1.5 rounded-lg text-sm bg-white/10 hover:bg-white/20 text-slate-200 ml-auto" :disabled="modal.busy" @click="closeInv">Chiudi</button>
              </div>
            </div>
          </div>
        </transition>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import Topbar from '../../components/Topbar.vue';
import ListFiltersTable from '../../components/ListFiltersTable.vue';
import api from '../../services/api';

type Inventory = { id: number; status: string };

const rows = ref<Inventory[]>([]);
const loading = ref(false);
const error = ref('');
const creating = ref(false);
const page = ref(1);
const limit = ref(20);
const invFields = [
  { key: 'id', label: 'ID', type: 'number' },
  { key: 'status', label: 'Stato', type: 'enum', options: ['open','frozen','closed'] },
];

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const { data } = await api.get('/inventories', { params: { limit: 100, offset: 0 } });
    rows.value = data?.items || [];
  } catch (e: any) {
    error.value = e?.response?.data?.error || e?.message || 'Errore caricamento';
  } finally {
    loading.value = false;
  }
}

async function createInventory() {
  creating.value = true;
  try {
    await api.post('/inventories', { scope: null });
    await load();
  } catch (e: any) {
    alert(e?.response?.data?.error || e?.message || 'Errore creazione inventario');
  } finally {
    creating.value = false;
  }
}

function statusClass(s: string) {
  if (s === 'open') return 'bg-sky-500/20 text-sky-200';
  if (s === 'frozen') return 'bg-yellow-500/20 text-yellow-200';
  if (s === 'closed') return 'bg-slate-500/20 text-slate-200';
  return 'bg-white/10 text-slate-200';
}

// Modal/actions
const modal = ref<{ open: boolean; id: number|null; status: string; busy: boolean; error: string }>({ open: false, id: null, status: 'open', busy: false, error: '' });

function openEdit(row: Inventory) {
  modal.value = { open: true, id: row.id, status: row.status, busy: false, error: '' };
}
function closeModal() { modal.value.open = false; }
async function freezeInv() {
  if (!modal.value.id) return;
  modal.value.busy = true; modal.value.error = '';
  try {
    await api.post(`/inventories/${modal.value.id}/freeze`);
    await load();
    modal.value.status = 'frozen';
  } catch (e: any) {
    modal.value.error = e?.response?.data?.error || e?.message || 'Errore freeze';
  } finally { modal.value.busy = false; }
}
async function approveInv() {
  if (!modal.value.id) return;
  modal.value.busy = true; modal.value.error = '';
  try {
    await api.post(`/inventories/${modal.value.id}/approve`);
    await load();
  } catch (e: any) {
    modal.value.error = e?.response?.data?.error || e?.message || 'Errore approvazione';
  } finally { modal.value.busy = false; }
}
async function closeInv() {
  if (!modal.value.id) return;
  modal.value.busy = true; modal.value.error = '';
  try {
    await api.post(`/inventories/${modal.value.id}/close`);
    await load();
    modal.value.status = 'closed';
  } catch (e: any) {
    modal.value.error = e?.response?.data?.error || e?.message || 'Errore chiusura';
  } finally { modal.value.busy = false; }
}

onMounted(load);
</script>

<style scoped></style>

