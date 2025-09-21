<template>
  <div>
    <Topbar />
    <main class="max-w-7xl mx-auto px-4 py-6">
      <h1 class="text-xl font-semibold mb-2">Movimenti</h1>
      <p class="text-slate-400 mb-4">Documenti che generano movimenti di magazzino.</p>

      <div v-if="loading" class="text-slate-400">Caricamento…</div>
      <div v-else-if="error" class="text-rose-400">{{ error }}</div>
      <div v-else>
        <ListFiltersTable
          :items="rows"
          :fields="docFields"
          new-label="Nuovo documento"
          @new="openDocCreate"
          @edit="openDocEdit"
        />

        <!-- Server-side filters (type, from, to, item) -->
        <div class="mt-3 flex flex-wrap items-end gap-3 mb-3">
          <div>
            <label class="block text-xs text-slate-400 mb-1">Tipo</label>
            <select v-model="filters.type" class="bg-white/10 border border-white/10 rounded px-2 py-1 text-sm text-slate-200 min-w-[10rem]">
              <option value="">Tutti</option>
              <option value="purchase">Acquisto</option>
              <option value="sale">Vendita</option>
              <option value="transfer">Trasferimento</option>
              <option value="adjustment">Rettifica</option>
            </select>
          </div>
          <div>
            <label class="block text-xs text-slate-400 mb-1">Dal</label>
            <input v-model="filters.from" type="date" class="bg-white/10 border border-white/10 rounded px-2 py-1 text-sm text-slate-200" />
          </div>
          <div>
            <label class="block text-xs text-slate-400 mb-1">Al</label>
            <input v-model="filters.to" type="date" class="bg-white/10 border border-white/10 rounded px-2 py-1 text-sm text-slate-200" />
          </div>
          <div class="flex-1 min-w-[12rem]">
            <label class="block text-xs text-slate-400 mb-1">Articolo (testo)</label>
            <input v-model="filters.item" type="text" placeholder="SKU/nome nel documento" class="w-full bg-white/10 border border-white/10 rounded px-2 py-1 text-sm text-slate-200" />
          </div>
          <button class="ml-auto px-3 py-1.5 rounded-lg text-sm bg-white/10 hover:bg-white/20 text-slate-200" @click="load">Applica</button>
        </div>

        <!-- Pagination (no total; next enabled if page full) -->
        <div class="mt-3 flex items-center gap-3">
          <div class="text-slate-400 text-sm">Pagina {{ page }}</div>
          <div class="ml-auto flex gap-2">
            <button class="px-2 py-1 rounded border border-white/10 text-sm" :disabled="page<=1" @click="prevPage">Indietro</button>
            <button class="px-2 py-1 rounded border border-white/10 text-sm" :disabled="!canNext" @click="nextPage">Avanti</button>
            <select v-model.number="limit" class="px-2 py-1 rounded bg-white/10 border border-white/10 text-sm text-slate-200" @change="changeLimit">
              <option :value="20">20</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>
          </div>
        </div>

        <!-- Modale creazione documento -->
        <transition name="fade">
          <div v-if="docCreate.open" class="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div class="w-full max-w-md bg-[#0b1020] border border-white/10 rounded-xl p-4">
              <div class="flex items-center mb-3">
                <h2 class="text-lg font-semibold">Nuovo documento</h2>
                <button class="ml-auto p-2 rounded hover:bg-white/10" @click="docCreate.open=false" aria-label="Chiudi">✕</button>
              </div>
              <div class="grid gap-3">
                <label class="text-sm text-slate-300">Tipo
                  <select v-model="docCreate.type" class="mt-1 w-full bg-white/10 border border-white/10 rounded px-2 py-1.5 text-sm text-slate-200">
                    <option value="">Seleziona…</option>
                    <option value="purchase">Acquisto</option>
                    <option value="sale">Vendita</option>
                    <option value="transfer">Trasferimento</option>
                    <option value="adjustment">Rettifica</option>
                  </select>
                </label>
                <label class="text-sm text-slate-300">Causale
                  <input v-model="docCreate.causal" type="text" class="mt-1 w-full bg-white/10 border border-white/10 rounded px-2 py-1.5 text-sm text-slate-200" />
                </label>
              </div>
              <div v-if="docCreate.error" class="mt-2 text-sm text-rose-400">{{ docCreate.error }}</div>
              <div class="mt-4 flex items-center gap-2">
                <button class="px-3 py-1.5 rounded-lg text-sm bg-white/10 hover:bg-white/20 text-slate-200" @click="docCreate.open=false">Annulla</button>
                <button class="ml-auto px-3 py-1.5 rounded-lg text-sm bg-fuchsia-600 hover:bg-fuchsia-500 text-white" :disabled="docCreate.saving || !docCreate.type" @click="saveDocCreate">
                  <span v-if="docCreate.saving">Creazione…</span>
                  <span v-else>Crea</span>
                </button>
              </div>
            </div>
          </div>
        </transition>

        <!-- Modale modifica documento -->
        <transition name="fade">
          <div v-if="docModal.open" class="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div class="w-full max-w-md bg-[#0b1020] border border-white/10 rounded-xl p-4">
              <div class="flex items-center mb-3">
                <h2 class="text-lg font-semibold">Documento #{{ docModal.id }}</h2>
                <button class="ml-auto p-2 rounded hover:bg-white/10" @click="docModal.open=false" aria-label="Chiudi">✕</button>
              </div>
              <div class="text-sm text-slate-300">Stato: <span :class="statusClass(docModal.status)" class="px-2 py-0.5 rounded text-xs">{{ docModal.status }}</span></div>
              <div v-if="docModal.error" class="mt-2 text-sm text-rose-400">{{ docModal.error }}</div>
              <div class="mt-4 flex flex-wrap items-center gap-2">
                <button
                  class="px-3 py-1.5 rounded-lg text-sm bg-white/10 hover:bg-white/20 text-slate-200 disabled:opacity-60"
                  :disabled="docModal.busy || docModal.deleting"
                  @click="docModal.open=false"
                >Chiudi</button>
                <button
                  v-if="docModal.id"
                  type="button"
                  class="ml-auto px-3 py-1.5 rounded-lg text-sm border border-rose-500/40 text-rose-300 hover:bg-rose-500/10 disabled:opacity-60"
                  :disabled="docModal.busy || docModal.deleting"
                  @click="deleteDoc"
                >
                  <span v-if="docModal.deleting">Eliminazione…</span>
                  <span v-else>Elimina documento</span>
                </button>
                <button
                  v-if="docModal.status!=='cancelled'"
                  class="px-3 py-1.5 rounded-lg text-sm bg-white/10 hover:bg-white/20 text-slate-200 disabled:opacity-60"
                  :disabled="docModal.busy || docModal.deleting"
                  @click="cancelDoc"
                >
                  <span v-if="docModal.busy">Annullamento…</span>
                  <span v-else>Annulla documento</span>
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

type Doc = { id: number; type: string; status: string; created_at?: string; causal?: string };

const rows = ref<Doc[]>([]);
const loading = ref(false);
const error = ref('');
const filters = ref<{ type: string; from: string; to: string; item: string }>({ type: '', from: '', to: '', item: '' });
const page = ref(1);
const limit = ref(20);
const canNext = computed(() => rows.value.length === limit.value);
const docFields = [
  { key: 'id', label: 'ID', type: 'number' },
  { key: 'type', label: 'Tipo', type: 'enum', options: ['purchase','sale','transfer','adjustment'] },
  { key: 'causal', label: 'Causale', type: 'string' },
  { key: 'status', label: 'Stato', type: 'enum', options: ['draft','confirmed','cancelled'] },
  { key: 'created_at', label: 'Data', type: 'string' },
];

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const params: Record<string, any> = { limit: limit.value, offset: (page.value - 1) * limit.value };
    if (filters.value.type) params.type = filters.value.type;
    if (filters.value.from) params.from = filters.value.from;
    if (filters.value.to) params.to = filters.value.to;
    if (filters.value.item) params.item = filters.value.item;
    const { data } = await api.get('/documents', { params });
    rows.value = data?.items || [];
  } catch (e: any) {
    error.value = e?.response?.data?.error || e?.message || 'Errore caricamento';
  } finally {
    loading.value = false;
  }
}

function statusClass(s: string) {
  if (s === 'confirmed') return 'bg-emerald-500/20 text-emerald-200';
  if (s === 'draft') return 'bg-slate-500/20 text-slate-200';
  if (s === 'cancelled') return 'bg-rose-500/20 text-rose-200';
  return 'bg-white/10 text-slate-200';
}

onMounted(load);

function prevPage() {
  if (page.value <= 1) return;
  page.value -= 1;
  load();
}
function nextPage() {
  if (!canNext.value) return;
  page.value += 1;
  load();
}
function changeLimit() {
  page.value = 1;
  load();
}

// Modale creazione documento
const docCreate = ref<{ open: boolean; saving: boolean; error: string; type: string; causal: string }>({ open: false, saving: false, error: '', type: '', causal: '' });
function openDocCreate() {
  docCreate.value = { open: true, saving: false, error: '', type: '', causal: '' };
}
async function saveDocCreate() {
  try {
    docCreate.value.saving = true; docCreate.value.error = '';
    await api.post('/documents', { type: docCreate.value.type, causal: docCreate.value.causal || null });
    docCreate.value.open = false;
    await load();
  } catch (e: any) {
    docCreate.value.error = e?.response?.data?.error || e?.message || 'Errore creazione documento';
  } finally { docCreate.value.saving = false; }
}

// Modale modifica documento (azioni minime)
const docModal = ref<{ open: boolean; id: number|null; status: string; busy: boolean; deleting: boolean; error: string }>({ open: false, id: null, status: 'draft', busy: false, deleting: false, error: '' });
async function openDocEdit(row: Doc) {
  try {
    docModal.value = { open: true, id: row.id, status: row.status, busy: false, deleting: false, error: '' };
    const { data } = await api.get(`/documents/${row.id}`);
    docModal.value.status = data?.status || row.status;
  } catch {}
}
async function cancelDoc() {
  if (!docModal.value.id || docModal.value.deleting) return;
  docModal.value.busy = true; docModal.value.error = '';
  try {
    await api.post(`/documents/${docModal.value.id}/cancel`);
    await load();
    docModal.value.status = 'cancelled';
  } catch (e: any) {
    docModal.value.error = e?.response?.data?.error || e?.message || 'Errore annullamento';
  } finally { docModal.value.busy = false; }
}

async function deleteDoc() {
  if (!docModal.value.id || docModal.value.deleting) return;
  if (!confirm('Eliminare definitivamente questo documento?')) return;
  docModal.value.deleting = true;
  docModal.value.error = '';
  try {
    await api.delete(`/documents/${docModal.value.id}`);
    docModal.value.open = false;
    await load();
  } catch (e: any) {
    docModal.value.error = e?.response?.data?.error || e?.message || 'Errore eliminazione documento';
  } finally {
    docModal.value.deleting = false;
  }
}

</script>

<style scoped></style>

