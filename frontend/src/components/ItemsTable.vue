<template>
  <div class="container-page">
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <input v-model.trim="q" placeholder="Cerca..." class="px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" />
        <button class="btn-secondary" @click="fetchFiltered">Filtra</button>
      </div>
      <div class="text-sm text-slate-500" v-if="rows.length">{{ rows.length }} risultati</div>
    </div>
    <div class="card overflow-auto max-h-[70vh]">
      <table v-if="rows.length" class="table-base">
        <thead>
          <tr>
            <th v-for="col in columns" :key="col">{{ header(col) }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, idx) in rows" :key="idx" class="odd:bg-white even:bg-slate-50/50 dark:odd:bg-slate-800 dark:even:bg-slate-800/60">
            <td v-for="col in columns" :key="col">
              <span v-if="isMoney(col)">{{ formatMoney(r[col]) }}</span>
              <span v-else-if="isDate(col)">{{ formatDate(r[col]) }}</span>
              <span v-else>{{ r[col] }}</span>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="p-6 text-slate-500">Nessun articolo trovato.</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

interface Settings {
  itemsTable?: { columns?: string[]; aliases?: Record<string,string> };
}

const columns = ref<string[]>([]);
const aliases = ref<Record<string,string>>({});
const rows = ref<any[]>([]);
const allRows = ref<any[]>([]);
const q = ref('');

function header(col: string) {
  return aliases.value[col] || col;
}

function isMoney(col: string) {
  return ['purchase_price','avg_weighted_price'].includes(col);
}

function isDate(col: string) {
  return ['last_purchase_date'].includes(col);
}

function formatMoney(v: any) {
  const n = Number(v || 0);
  return isNaN(n) ? '' : n.toFixed(2);
}

function formatDate(v: any) {
  if (!v) return '';
  try { return new Date(v).toISOString().slice(0,10); } catch { return String(v); }
}

async function loadSettings() {
  try {
    const { default: api } = await import('../services/api');
    const { data } = await api.get('/settings');
    columns.value = data.itemsTable?.columns || [];
    aliases.value = data.itemsTable?.aliases || {};
  } catch (e) {
    columns.value = [];
    aliases.value = {};
  }
}

async function loadItems() {
  try {
    const { default: api } = await import('../services/api');
    const { data } = await api.get('/items', { params: { limit: 100 } });
    rows.value = data.items || [];
    allRows.value = rows.value;
  } catch (e) {
    rows.value = [];
  }
}

function fetchFiltered() {
  const term = q.value.toLowerCase();
  if (!term) { rows.value = allRows.value; return; }
  rows.value = allRows.value.filter((r:any) => {
    return columns.value.some((c) => String(r[c] ?? '').toLowerCase().includes(term));
  });
}

onMounted(async () => {
  await loadSettings();
  await loadItems();
});
</script>

<style scoped>
.items-table { padding: .5rem 0; }
table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #ddd; padding: .4rem; text-align: left; }
thead { background: #f7f7f7; }
</style>
