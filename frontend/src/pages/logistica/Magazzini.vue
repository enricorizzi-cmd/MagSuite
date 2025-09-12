<template>
  <div>
    <Topbar />
    <main class="max-w-5xl mx-auto px-4 py-6">
      <h1 class="text-xl font-semibold mb-2">Magazzini</h1>
      <p class="text-slate-400 mb-4">Elenco magazzini aziendali.</p>

      <div v-if="loading" class="text-slate-400">Caricamento…</div>
      <div v-else-if="error" class="text-rose-400">{{ error }}</div>
      <div v-else>
        <ListFiltersTable
          :items="items"
          :fields="warehouseFields"
          new-label="Nuovo magazzino"
          :page="page"
          :limit="limit"
          @new="openCreate"
          @edit="openEdit"
        />

        <!-- Pagination (client-side) -->
        <div class="mt-3 flex items-center gap-3">
          <div class="text-slate-400 text-sm">Pagina {{ page }}</div>
          <div class="ml-auto flex gap-2">
            <button class="px-2 py-1 rounded border border-white/10 text-sm" :disabled="page<=1" @click="page = page - 1">Indietro</button>
            <button class="px-2 py-1 rounded border border-white/10 text-sm" :disabled="(page*limit) >= items.length" @click="page = page + 1">Avanti</button>
            <select v-model.number="limit" class="px-2 py-1 rounded bg-white/10 border border-white/10 text-sm text-slate-200">
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
                <h2 class="text-lg font-semibold">{{ modal.mode==='create' ? 'Nuovo magazzino' : 'Modifica magazzino' }}</h2>
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
import { onMounted, ref } from 'vue';
import Topbar from '../../components/Topbar.vue';
import ListFiltersTable from '../../components/ListFiltersTable.vue';
import api from '../../services/api';

type Warehouse = { id: number; name: string };

const items = ref<Warehouse[]>([]);
const loading = ref(false);
const error = ref('');
const page = ref(1);
const limit = ref(20);
const warehouseFields = [
  { key: 'id', label: 'ID', type: 'number' },
  { key: 'name', label: 'Nome', type: 'string' },
];

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const { data } = await api.get('/warehouses');
    items.value = data?.items || [];
  } catch (e: any) {
    error.value = e?.response?.data?.error || e?.message || 'Errore caricamento';
  } finally {
    loading.value = false;
  }
}

onMounted(load);

// Modal state for create/edit
const modal = ref<{ open: boolean; mode: 'create'|'edit'; id?: number|null; saving: boolean; error: string }>({ open: false, mode: 'create', id: null, saving: false, error: '' });
const form = ref<{ name: string }>({ name: '' });

function openCreate() {
  modal.value = { open: true, mode: 'create', id: null, saving: false, error: '' };
  form.value = { name: '' };
}
function openEdit(row: Warehouse) {
  modal.value = { open: true, mode: 'edit', id: row.id, saving: false, error: '' };
  form.value = { name: row.name };
}
function closeModal() { modal.value.open = false; }
async function saveModal() {
  try {
    modal.value.saving = true;
    modal.value.error = '';
    if (modal.value.mode === 'create') {
      await api.post('/warehouses', { name: form.value.name });
    } else if (modal.value.mode === 'edit' && modal.value.id) {
      await api.put(`/warehouses/${modal.value.id}`, { name: form.value.name });
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
