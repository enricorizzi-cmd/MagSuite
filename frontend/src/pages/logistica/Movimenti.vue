<template>
  <div>
    <Topbar />
    <main class="max-w-7xl mx-auto px-4 py-6">
      <h1 class="text-xl font-semibold mb-2">Movimenti</h1>
      <p class="text-slate-400 mb-4">Documenti che generano movimenti di magazzino.</p>

      <div v-if="loading" class="text-slate-400">Caricamento…</div>
      <div v-else-if="error" class="text-rose-400">{{ error }}</div>
      <div v-else>
        <!-- Filtri lato server (type, from, to, item) esposti anche nella UI -->
        <div class="flex flex-wrap items-end gap-3 mb-3">
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

        <div v-if="rows.length === 0" class="text-slate-400">Nessun risultato.</div>
        <div v-else class="overflow-x-auto border border-white/10 rounded-lg">
          <table class="min-w-full text-sm">
            <thead class="bg-white/5 text-slate-300">
              <tr>
                <th class="text-left px-3 py-2">ID</th>
                <th class="text-left px-3 py-2">Tipo</th>
                <th class="text-left px-3 py-2">Causale</th>
                <th class="text-left px-3 py-2">Stato</th>
                <th class="text-left px-3 py-2">Data</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="d in rows" :key="d.id" class="border-t border-white/10">
                <td class="px-3 py-2 text-slate-300">{{ d.id }}</td>
                <td class="px-3 py-2 text-slate-100">{{ d.type }}</td>
                <td class="px-3 py-2 text-slate-300">{{ d.causal || '-' }}</td>
                <td class="px-3 py-2"><span :class="statusClass(d.status)" class="px-2 py-0.5 rounded text-xs">{{ d.status }}</span></td>
                <td class="px-3 py-2 text-slate-400">{{ formatTime(d.created_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import Topbar from '../../components/Topbar.vue';
import api from '../../services/api';

type Doc = { id: number; type: string; status: string; created_at?: string; causal?: string };

const rows = ref<Doc[]>([]);
const loading = ref(false);
const error = ref('');
const filters = ref<{ type: string; from: string; to: string; item: string }>({ type: '', from: '', to: '', item: '' });

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const params: Record<string, any> = { limit: 100, page: 1 };
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

function formatTime(iso?: string) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

function statusClass(s: string) {
  if (s === 'confirmed') return 'bg-emerald-500/20 text-emerald-200';
  if (s === 'draft') return 'bg-slate-500/20 text-slate-200';
  if (s === 'cancelled') return 'bg-rose-500/20 text-rose-200';
  return 'bg-white/10 text-slate-200';
}

onMounted(load);
</script>

<style scoped></style>
