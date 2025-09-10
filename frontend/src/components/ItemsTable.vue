<template>
  <div class="items-table">
    <table v-if="rows.length">
      <thead>
        <tr>
          <th v-for="col in columns" :key="col">{{ header(col) }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(r, idx) in rows" :key="idx">
          <td v-for="col in columns" :key="col">
            <span v-if="isMoney(col)">{{ formatMoney(r[col]) }}</span>
            <span v-else-if="isDate(col)">{{ formatDate(r[col]) }}</span>
            <span v-else>{{ r[col] }}</span>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-else>Nessun articolo trovato.</p>
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
    const res = await fetch('/settings');
    const data: Settings = await res.json();
    columns.value = data.itemsTable?.columns || [];
    aliases.value = data.itemsTable?.aliases || {};
  } catch (e) {
    columns.value = [];
    aliases.value = {};
  }
}

async function loadItems() {
  try {
    const res = await fetch('/items?limit=100');
    const data = await res.json();
    rows.value = data.items || [];
  } catch (e) {
    rows.value = [];
  }
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

