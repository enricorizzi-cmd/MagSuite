<template>
  <div>
    <Topbar />
    <main class="max-w-7xl mx-auto px-4 py-6">
      <h1 class="text-xl font-semibold mb-2">Articoli</h1>
      <p class="text-slate-400 mb-4">Catalogo articoli (fino a 100 risultati). Include giacenza attuale.</p>

      <div v-if="loading" class="text-slate-400">Caricamento…</div>
      <div v-else-if="error" class="text-rose-400">{{ error }}</div>
      <div v-else>
        <div class="flex items-center mb-3">
          <div class="text-slate-400 text-sm">Totale: {{ total }}</div>
          <div class="ml-auto flex gap-2">
            <button class="px-3 py-1.5 rounded-lg text-sm bg-white/10 hover:bg-white/20 text-slate-200" @click="exportItems('csv')">Export CSV</button>
            <button class="px-3 py-1.5 rounded-lg text-sm bg-white/10 hover:bg-white/20 text-slate-200" @click="exportItems('xlsx')">Export XLSX</button>
          </div>
        </div>
        <ListFiltersTable
          :items="rows"
          :fields="itemFields"
          new-label="Nuovo articolo"
          @new="openCreate"
          @edit="openEdit"
        />

        <!-- Create/Edit item modal -->
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
                <button class="px-3 py-1.5 rounded-lg text-sm bg-white/10 hover:bg-white/20 text-slate-200" @click="closeItemModal">Annulla</button>
                <button class="ml-auto px-3 py-1.5 rounded-lg text-sm bg-fuchsia-600 hover:bg-fuchsia-500 text-white" :disabled="itemModal.saving" @click="saveItemModal">
                  <span v-if="itemModal.saving">Salvataggio…</span>
                  <span v-else>Salva</span>
                </button>
              </div>
            </div>
          </div>
        </transition>

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
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import Topbar from '../../components/Topbar.vue';
import ListFiltersTable from '../../components/ListFiltersTable.vue';
import api from '../../services/api';

type ItemRow = {
  id: number; sku: string; name: string;
  category?: string; type?: string; supplier?: string;
  quantity_on_hand?: number
};

const rows = ref<ItemRow[]>([]);
const loading = ref(false);
const error = ref('');
const page = ref(1);
const limit = ref(20);
const total = ref(0);
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit.value)));

// Campi in ordine: usati sia per i filtri che per le colonne
const itemFields = [
  { key: 'sku', label: 'SKU', type: 'string' },
  { key: 'name', label: 'Nome', type: 'string' },
  { key: 'barcode', label: 'Barcode', type: 'string' },
  { key: 'code', label: 'Codice', type: 'string' },
  { key: 'description', label: 'Descrizione', type: 'string' },
  { key: 'type', label: 'Tipo', type: 'string' },
  { key: 'category', label: 'Categoria', type: 'string' },
  { key: 'group', label: 'Gruppo', type: 'string' },
  { key: 'class', label: 'Classe', type: 'string' },
  { key: 'manufacturer', label: 'Produttore', type: 'string' },
  { key: 'distributor', label: 'Distributore', type: 'string' },
  { key: 'supplier', label: 'Fornitore', type: 'string' },
  { key: 'notes', label: 'Note', type: 'string' },
  { key: 'size', label: 'Taglia', type: 'string' },
  { key: 'color', label: 'Colore', type: 'string' },
  { key: 'purchase_price', label: 'Prezzo acquisto', type: 'number' },
  { key: 'avg_weighted_price', label: 'Costo medio', type: 'number' },
  { key: 'min_stock', label: 'Scorta min', type: 'number' },
  { key: 'rotation_index', label: 'Indice rotazione', type: 'number' },
  { key: 'last_purchase_date', label: 'Ultimo acquisto', type: 'string' },
  { key: 'lotti', label: 'Lotti', type: 'boolean' },
  { key: 'seriali', label: 'Seriali', type: 'boolean' },
  { key: 'quantity_on_hand', label: 'Giacenza', type: 'number' },
];

const fields = [
  { key: 'sku', label: 'SKU', type: 'string' },
  { key: 'name', label: 'Nome', type: 'string' },
  { key: 'category', label: 'Categoria', type: 'string' },
  { key: 'type', label: 'Tipo', type: 'string' },
  { key: 'supplier', label: 'Fornitore', type: 'string' },
  { key: 'quantity_on_hand', label: 'Q.tà', type: 'number' },
];

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const { data } = await api.get('/items', { params: { page: page.value, limit: limit.value } });
    rows.value = (data?.items || []).map((i: any) => ({
      id: i.id,
      sku: i.sku,
      name: i.name,
      barcode: i.barcode,
      code: i.code,
      description: i.description,
      type: i.type,
      category: i.category,
      group: i.group,
      class: i.class,
      manufacturer: i.manufacturer,
      distributor: i.distributor,
      supplier: i.supplier,
      notes: i.notes,
      size: i.size,
      color: i.color,
      purchase_price: numberOrNull(i.purchase_price),
      avg_weighted_price: numberOrNull(i.avg_weighted_price),
      min_stock: intOrNull(i.min_stock),
      rotation_index: numberOrNull(i.rotation_index),
      last_purchase_date: i.last_purchase_date || null,
      lotti: !!i.lotti,
      seriali: !!i.seriali,
      quantity_on_hand: typeof i.quantity_on_hand === 'number' ? i.quantity_on_hand : 0
    }));
    total.value = typeof data?.total === 'number' ? data.total : 0;
  } catch (e: any) {
    error.value = e?.response?.data?.error || e?.message || 'Errore caricamento';
  } finally {
    loading.value = false;
  }
}

function formatQty(n?: number) {
  try { return (n ?? 0).toLocaleString(); } catch { return String(n ?? 0); }
}

// Full columns to render all planned item fields
const columns = [
  { key: 'sku', label: 'SKU', align: 'left' },
  { key: 'name', label: 'Nome', align: 'left' },
  { key: 'barcode', label: 'Barcode', align: 'left' },
  { key: 'code', label: 'Codice', align: 'left' },
  { key: 'description', label: 'Descrizione', align: 'left' },
  { key: 'type', label: 'Tipo', align: 'left' },
  { key: 'category', label: 'Categoria', align: 'left' },
  { key: 'group', label: 'Gruppo', align: 'left' },
  { key: 'class', label: 'Classe', align: 'left' },
  { key: 'manufacturer', label: 'Produttore', align: 'left' },
  { key: 'distributor', label: 'Distributore', align: 'left' },
  { key: 'supplier', label: 'Fornitore', align: 'left' },
  { key: 'notes', label: 'Note', align: 'left' },
  { key: 'size', label: 'Taglia', align: 'left' },
  { key: 'color', label: 'Colore', align: 'left' },
  { key: 'purchase_price', label: 'Prezzo acquisto', align: 'right' },
  { key: 'avg_weighted_price', label: 'Costo medio', align: 'right' },
  { key: 'min_stock', label: 'Scorta min', align: 'right' },
  { key: 'rotation_index', label: 'Indice rotazione', align: 'right' },
  { key: 'last_purchase_date', label: 'Ultimo acquisto', align: 'left' },
  { key: 'lotti', label: 'Lotti', align: 'left' },
  { key: 'seriali', label: 'Seriali', align: 'left' },
  { key: 'quantity_on_hand', label: 'Giacenza', align: 'right' },
];

function numberOrNull(v: any): number | null {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}
function intOrNull(v: any): number | null {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isInteger(n) ? n : null;
}

function cellClass(key: string, align: string) {
  const base = align === 'right' ? 'text-right' : 'text-left';
  if (key === 'name') return base + ' text-slate-100';
  if (key === 'quantity_on_hand' || key.includes('price') || key.includes('stock') || key.includes('index')) return base + ' text-slate-100';
  return base + ' text-slate-300';
}

function renderCell(row: Record<string, any>, key: string) {
  const v = (row as any)[key];
  if (key === 'quantity_on_hand') return formatQty(v);
  if (typeof v === 'boolean') return v ? 'Sì' : 'No';
  if (v == null || v === '') return '-';
  if (typeof v === 'number') return v.toLocaleString();
  return String(v);
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

async function exportItems(format: 'csv'|'xlsx') {
  try {
    const res = await api.get(`/items/export`, { params: { format }, responseType: 'blob' });
    const blob = new Blob([res.data], { type: res.headers['content-type'] || (format==='xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv') });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `articoli.${format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (e: any) {
    alert(e?.response?.data?.error || e?.message || 'Errore export');
  }
}

// Modal Articolo (crea/modifica)
const itemModal = ref<{ open: boolean; mode: 'create'|'edit'; id?: number|null; saving: boolean; error: string }>({ open: false, mode: 'create', id: null, saving: false, error: '' });
const itemForm = ref<{ name: string; sku: string; type: string; category: string; supplier: string; lotti: boolean; seriali: boolean }>({
  name: '', sku: '', type: '', category: '', supplier: '', lotti: false, seriali: false
});

function openEdit(row: any) {
  itemModal.value = { open: true, mode: 'edit', id: row.id, saving: false, error: '' };
  itemForm.value = {
    name: row.name || '',
    sku: row.sku || '',
    type: row.type || '',
    category: row.category || '',
    supplier: row.supplier || '',
    lotti: !!row.lotti,
    seriali: !!row.seriali,
  };
}
function closeItemModal() { itemModal.value.open = false; }
async function saveItemModal() {
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

// Reindirizza la creazione all'uso dello stesso modal
function openCreate() {
  itemModal.value = { open: true, mode: 'create', id: null, saving: false, error: '' };
  itemForm.value = { name: '', sku: '', type: '', category: '', supplier: '', lotti: false, seriali: false };
}

// Create Item modal state + actions
const creating = ref(false);
const createError = ref('');
const createForm = ref<{ name: string; sku: string; type: string; category: string; supplier: string; lotti: boolean; seriali: boolean }>({
  name: '', sku: '', type: '', category: '', supplier: '', lotti: false, seriali: false
});

function openCreate() {
  createError.value = '';
  createForm.value = { name: '', sku: '', type: '', category: '', supplier: '', lotti: false, seriali: false };
  creating.value = true;
}
function closeCreate() { creating.value = false; }
async function saveCreate() {
  try {
    createError.value = '';
    const payload: any = { ...createForm.value };
    if (!payload.sku) delete payload.sku; // backend can auto-generate
    await api.post('/items', payload);
    creating.value = false;
    await load();
  } catch (e: any) {
    createError.value = e?.response?.data?.error || e?.message || 'Errore creazione articolo';
  }
}
</script>

<style scoped></style>
