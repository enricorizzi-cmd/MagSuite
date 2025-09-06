<template>
  <div class="warehouse-stock">
    <section class="filters">
      <input
        v-model="filters.sku"
        placeholder="SKU"
        @input="fetchStock"
      />
      <input
        type="date"
        v-model="filters.expiry"
        @change="fetchStock"
      />
      <label>
        <input type="checkbox" v-model="filters.under" @change="fetchStock" />
        Sotto scorta
      </label>
      <button @click="fetchStock">Filter</button>
    </section>

    <table>
      <thead>
        <tr>
          <th>SKU</th>
          <th>Lotto</th>
          <th>Seriale</th>
          <th>Scadenza</th>
          <th>Quantità</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <template v-for="entry in stock" :key="entryKey(entry)">
          <tr>
            <td>{{ entry.sku }}</td>
            <td>{{ entry.lot || '-' }}</td>
            <td>{{ entry.serial || '-' }}</td>
            <td>{{ entry.expiry || '-' }}</td>
            <td>{{ entry.quantity }}</td>
            <td>
              <button @click="toggleMovements(entry)">
                {{ entry.showMovements ? 'Nascondi' : 'Movimenti' }}
              </button>
            </td>
          </tr>
          <tr v-if="entry.showMovements">
            <td colspan="6">
              <table class="movements">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Tipo</th>
                    <th>Quantità</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="m in entry.movements" :key="m.id">
                    <td>{{ m.date }}</td>
                    <td>{{ m.type }}</td>
                    <td>{{ m.quantity }}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

interface Movement {
  id: number | string;
  date: string;
  type?: string;
  quantity: number;
}

interface StockEntry {
  sku: string;
  lot?: string;
  serial?: string;
  expiry?: string;
  quantity: number;
  movements?: Movement[];
  showMovements?: boolean;
}

const route = useRoute();
const warehouseId = route.params.id as string;

const stock = ref<StockEntry[]>([]);
const filters = ref({ sku: '', expiry: '', under: false });

function entryKey(e: StockEntry) {
  return `${e.sku}-${e.lot || ''}-${e.serial || ''}`;
}

async function fetchStock() {
  const params = new URLSearchParams();
  if (filters.value.sku) params.set('sku', filters.value.sku);
  if (filters.value.expiry) params.set('expiry', filters.value.expiry);
  if (filters.value.under) params.set('understock', 'true');
  try {
    const res = await fetch(
      `/warehouses/${warehouseId}/stock?${params.toString()}`
    );
    if (res.ok) {
      const data = await res.json();
      stock.value = data.stock || [];
    }
  } catch (err) {
    console.error('Failed to load stock', err);
  }
}

async function toggleMovements(entry: StockEntry) {
  if (entry.showMovements) {
    entry.showMovements = false;
    return;
  }
  if (!entry.movements) {
    const params = new URLSearchParams();
    params.set('sku', entry.sku);
    if (entry.lot) params.set('lot', entry.lot);
    if (entry.serial) params.set('serial', entry.serial);
    try {
      const res = await fetch(
        `/warehouses/${warehouseId}/stock/movements?${params.toString()}`
      );
      if (res.ok) {
        const data = await res.json();
        entry.movements = data.movements || [];
      } else {
        entry.movements = [];
      }
    } catch (err) {
      console.error('Failed to load movements', err);
      entry.movements = [];
    }
  }
  entry.showMovements = true;
}

onMounted(() => {
  fetchStock();
});
</script>

<style scoped>
.warehouse-stock {
  padding: 1rem;
}
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
table {
  width: 100%;
  border-collapse: collapse;
}
th,
td {
  border: 1px solid #ccc;
  padding: 0.5rem;
  text-align: left;
}
.movements {
  margin-top: 0.5rem;
  width: 100%;
}
</style>

