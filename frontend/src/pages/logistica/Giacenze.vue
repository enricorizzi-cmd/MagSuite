<template>
  <div>
    <Topbar />
    <main class="max-w-7xl mx-auto px-4 py-6">
      <h1 class="text-xl font-semibold mb-2">Giacenze</h1>
      <p class="text-slate-400 mb-4">Quantità disponibili per articolo (fino a 100 risultati).</p>

      <div v-if="loading" class="text-slate-400">Caricamento…</div>
      <div v-else-if="error" class="text-rose-400">{{ error }}</div>
      <div v-else>
        <ListFiltersTable
          :items="rows"
          :fields="giacenzeFields"
          new-label="Nuovo articolo"
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

        <!-- Modale Articolo -->
        <transition name="fade">
          <div v-if="itemModal.open" class="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div class="w-full max-w-lg bg-[#0b1020] border border-white/10 rounded-xl p-4">
              <div class="flex items-center mb-3">
                <h2 class="text-lg font-semibold">{{ itemModal.mode==='create' ? 'Nuovo articolo' : 'Modifica articolo' }}</h2>
                <button class="ml-auto p-2 rounded hover:bg-white/10" @click="closeItemModal" aria-label="Chiudi">✕</button>
              </div>
              <div class="grid gap-3 sm:grid-cols-2">
                <label class="text-sm text-slate-300 sm:col-span-2">Nome
                  <input v-model="itemForm.name" type="text" class="mt-1 w-full bg-white/10 border border-white/10 rounded px-2 py-1.5 text-sm text-slate-200" />
                </label>
                <label class="text-sm text-slate-300">SKU
                  <input v-model="itemForm.sku" type="text" class="mt-1 w-full bg-white/10 border border-white/10 rounded px-2 py-1.5 text-sm text-slate-200" />
                </label>
                <label class="text-sm text-slate-300">Tipo
                  <input v-model="itemForm.type" type="text" class="mt-1 w-full bg-white/10 border border-white/10 rounded px-2 py-1.5 text-sm text-slate-200" />
                </label>
                <label class="text-sm text-slate-300">Categoria
                  <input v-model="itemForm.category" type="text" class="mt-1 w-full bg-white/10 border border-white/10 rounded px-2 py-1.5 text-sm text-slate-200" />
                </label>
                <label class="text-sm text-slate-300">Fornitore
                  <input v-model="itemForm.supplier" type="text" class="mt-1 w-full bg-white/10 border border-white/10 rounded px-2 py-1.5 text-sm text-slate-200" />
                </label>
                <label class="text-sm text-slate-300 flex items-center gap-2">
                  <input v-model="itemForm.lotti" type="checkbox" class="rounded" /> Lotti
                </label>
                <label class="text-sm text-slate-300 flex items-center gap-2">
                  <input v-model="itemForm.seriali" type="checkbox" class="rounded" /> Seriali
                </label>
              </div>
              <div v-if="itemModal.error" class="mt-2 text-sm text-rose-400">{{ itemModal.error }}</div>
              <div class="mt-4 flex items-center gap-2">
                <button
                  class="px-3 py-1.5 rounded-lg text-sm bg-white/10 hover:bg-white/20 text-slate-200 disabled:opacity-60"
                  :disabled="itemModal.saving || itemModal.deleting"
                  @click="closeItemModal"
                >Annulla</button>
                <button
                  v-if="itemModal.mode==='edit' && itemModal.id"
                  type="button"
                  class="ml-auto px-3 py-1.5 rounded-lg text-sm border border-rose-500/40 text-rose-300 hover:bg-rose-500/10 disabled:opacity-60"
                  :disabled="itemModal.saving || itemModal.deleting"
                  @click="deleteItem"
                >
                  <span v-if="itemModal.deleting">Eliminazione…</span>
                  <span v-else>Elimina articolo</span>
                </button>
                <button
                  class="px-3 py-1.5 rounded-lg text-sm bg-fuchsia-600 hover:bg-fuchsia-500 text-white disabled:opacity-60"
                  :class="itemModal.mode==='edit' && itemModal.id ? '' : 'ml-auto'"
                  :disabled="itemModal.saving || itemModal.deleting"
                  @click="saveItemModal"
                >
                  <span v-if="itemModal.saving">Salvataggio…</span>
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

type ItemRow = { id: number; sku: string; name: string; category?: string; quantity_on_hand?: number };

const rows = ref<ItemRow[]>([]);
const loading = ref(false);
const error = ref('');
const page = ref(1);
const limit = ref(20);
const total = ref(0);
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit.value)));
const giacenzeFields = [
  { key: 'sku', label: 'SKU', type: 'string' },
  { key: 'name', label: 'Nome', type: 'string' },
  { key: 'category', label: 'Categoria', type: 'string' },
  { key: 'quantity_on_hand', label: 'Giacenza', type: 'number' },
];

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const { data } = await api.get('/items', { params: { page: page.value, limit: limit.value } });
    const items: any[] = data?.items || [];
    rows.value = items.map(i => ({
      id: i.id,
      sku: i.sku,
      name: i.name,
      category: i.category,
      quantity_on_hand: typeof i.quantity_on_hand === 'number' ? i.quantity_on_hand : 0
    }));
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

// Modale Articolo (riuso come in Articoli)
const itemModal = ref<{ open: boolean; mode: 'create'|'edit'; id?: number|null; saving: boolean; deleting: boolean; error: string }>({ open: false, mode: 'create', id: null, saving: false, deleting: false, error: '' });
const itemForm = ref<{ name: string; sku: string; type: string; category: string; supplier: string; lotti: boolean; seriali: boolean }>({
  name: '', sku: '', type: '', category: '', supplier: '', lotti: false, seriali: false
});

function openCreate() {
  itemModal.value = { open: true, mode: 'create', id: null, saving: false, deleting: false, error: '' };
  itemForm.value = { name: '', sku: '', type: '', category: '', supplier: '', lotti: false, seriali: false };
}
function openEdit(row: any) {
  itemModal.value = { open: true, mode: 'edit', id: row.id, saving: false, deleting: false, error: '' };
  itemForm.value = {
    name: row.name || '',
    sku: row.sku || '',
    type: (row as any).type || '',
    category: row.category || '',
    supplier: (row as any).supplier || '',
    lotti: !!(row as any).lotti,
    seriali: !!(row as any).seriali,
  };
}
function closeItemModal() { itemModal.value.open = false; itemModal.value.saving = false; itemModal.value.deleting = false; }
async function saveItemModal() {
  if (itemModal.value.deleting) return;
  try {
    itemModal.value.saving = true;
    itemModal.value.error = '';
    const payload: any = { ...itemForm.value };
    if (itemModal.value.mode === 'create') {
      if (!payload.sku) delete payload.sku;
      await api.post('/items', payload);
    } else if (itemModal.value.mode === 'edit' && itemModal.value.id) {
      await api.put(`/items/${itemModal.value.id}`, payload);
    }
    itemModal.value.open = false;
    await load();
  } catch (e: any) {
    itemModal.value.error = e?.response?.data?.error || e?.message || 'Errore salvataggio articolo';
  } finally {
    itemModal.value.saving = false;
  }
}

async function deleteItem() {
  if (itemModal.value.deleting) return;
  if (!itemModal.value.id) return;
  if (!confirm('Eliminare definitivamente questo articolo?')) return;
  itemModal.value.deleting = true;
  itemModal.value.error = '';
  try {
    await api.delete(`/items/${itemModal.value.id}`);
    itemModal.value.open = false;
    await load();
  } catch (e: any) {
    itemModal.value.error = e?.response?.data?.error || e?.message || 'Errore eliminazione articolo';
  } finally {
    itemModal.value.deleting = false;
  }
}

</script>

<style scoped></style>

