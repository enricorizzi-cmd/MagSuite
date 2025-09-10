<template>
  <div class="settings-items-table">
    <h3>Colonne tabella articoli</h3>
    <div class="columns">
      <label v-for="col in allColumns" :key="col" class="col-item">
        <input type="checkbox" :value="col" v-model="columns" />
        <span>{{ col }}</span>
        <input v-model="aliases[col]" placeholder="Alias (opzionale)" />
      </label>
    </div>
    <div class="actions">
      <button @click="save">Salva</button>
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

<style scoped>
.columns { display: grid; grid-template-columns: repeat(2, 1fr); gap: .5rem; }
.col-item { display: flex; gap: .5rem; align-items: center; }
.actions { margin-top: 1rem; }
</style>

