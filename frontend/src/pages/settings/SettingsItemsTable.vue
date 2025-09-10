<template>
  <div class="space-y-3">
    <h3 class="text-lg font-semibold">Colonne tabella articoli</h3>
    <div class="card p-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
        <label v-for="col in allColumns" :key="col" class="flex items-center gap-2">
          <input type="checkbox" :value="col" v-model="columns" />
          <span class="w-48 text-sm">{{ col }}</span>
          <input class="flex-1 px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" v-model="aliases[col]" placeholder="Alias (opzionale)" />
        </label>
      </div>
      <div class="mt-3">
        <button class="btn-primary" @click="save">Salva</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const allColumns = [
  'name','sku','code','description','barcode',
  'type','category','group','class',
  'manufacturer','distributor','supplier','notes',
  'size','color','purchase_price','avg_weighted_price','min_stock','rotation_index',
  'quantity_on_hand','last_purchase_date'
];

const columns = ref<string[]>([]);
const aliases = ref<Record<string,string>>({});

onMounted(async () => {
  const res = await fetch('/settings');
  const data = await res.json();
  columns.value = data.itemsTable?.columns || [];
  aliases.value = data.itemsTable?.aliases || {};
});

async function save() {
  await fetch('/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemsTable: { columns: columns.value, aliases: aliases.value } })
  });
}
</script>

<style scoped></style>
