<template>
  <div class="item-detail">
    <h2>Item Detail</h2>
    <div class="tabs">
      <button
        v-for="t in tabs"
        :key="t"
        @click="activeTab = t"
        :class="{ active: activeTab === t }"
      >
        {{ t }}
      </button>
    </div>

    <div v-if="activeTab === 'Dati base'" class="tab-content">
      <label>
        Name
        <input v-model="item.name" />
      </label>
      <label>
        SKU
        <input v-model="item.sku" />
      </label>
      <div class="error" v-if="errors.sku">{{ errors.sku }}</div>
    </div>

    <div v-if="activeTab === 'Tracciabilità'" class="tab-content">
      <label>
        <input type="checkbox" v-model="item.lotti" /> Lotti
      </label>
      <label>
        <input type="checkbox" v-model="item.seriali" /> Seriali
      </label>
      <div class="error" v-if="errors.tracciabilita">{{ errors.tracciabilita }}</div>
    </div>

    <div v-if="activeTab === 'Barcode'" class="tab-content">
      <ul>
        <li v-for="code in barcodes" :key="code">{{ code }}</li>
      </ul>
      <input v-model="newBarcode" placeholder="Add barcode" />
      <button @click="addBarcode">Add</button>
      <div class="error" v-if="errors.barcodes">{{ errors.barcodes }}</div>
    </div>

    <div v-if="activeTab === 'UoM'" class="tab-content">
      <label>
        Unit of Measure
        <input v-model="item.uom" />
      </label>
    </div>

    <div v-if="activeTab === 'Fornitori'" class="tab-content">
      <ul>
        <li v-for="s in suppliers" :key="s">{{ s }}</li>
      </ul>
      <input v-model="newSupplier" placeholder="Add supplier" />
      <button @click="addSupplier">Add</button>
    </div>

    <div v-if="activeTab === 'MRP'" class="tab-content">
      <label>
        MRP
        <input v-model.number="item.mrp" type="number" />
      </label>
    </div>

    <div v-if="activeTab === 'Lotti/Seriali'" class="tab-content">
      <p>Configurazione lotti e seriali.</p>
    </div>

    <div v-if="activeTab === 'Giacenze'" class="tab-content">
      <h3>Stock per magazzino</h3>
      <table>
        <thead>
          <tr>
            <th>Magazzino</th>
            <th>Quantità</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in stocks" :key="s.warehouse">
            <td>{{ s.warehouse }}</td>
            <td>{{ s.quantity }}</td>
          </tr>
        </tbody>
      </table>

      <h3>Storico movimenti</h3>
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Magazzino</th>
            <th>Quantità</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in movements" :key="m.id">
            <td>{{ m.date }}</td>
            <td>{{ m.warehouse }}</td>
            <td>{{ m.quantity }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="actions">
      <button @click="save">Save</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

interface Item {
  id?: string | number;
  name: string;
  sku: string;
  lotti: boolean;
  seriali: boolean;
  uom?: string;
  mrp?: number;
}

interface Stock { warehouse: string; quantity: number }
interface Movement { id: string|number; date: string; warehouse: string; quantity: number }

const route = useRoute();
const router = useRouter();
const id = route.params.id as string;

const tabs = [
  'Dati base',
  'Tracciabilità',
  'Barcode',
  'UoM',
  'Fornitori',
  'MRP',
  'Lotti/Seriali',
  'Giacenze'
];
const activeTab = ref('Dati base');

const item = ref<Item>({
  name: '',
  sku: '',
  lotti: false,
  seriali: false
});
const barcodes = ref<string[]>([]);
const suppliers = ref<string[]>([]);
const newBarcode = ref('');
const newSupplier = ref('');
const stocks = ref<Stock[]>([]);
const movements = ref<Movement[]>([]);
const errors = ref<Record<string, string>>({});

onMounted(async () => {
  if (id && id !== 'new') {
    await Promise.all([loadItem(), loadBarcodes(), loadSuppliers(), loadStock()]);
  }
});

async function loadItem() {
  const res = await fetch(`/items/${id}`);
  if (res.ok) {
    Object.assign(item.value, await res.json());
  }
}
async function loadBarcodes() {
  const res = await fetch(`/items/${id}/barcodes`);
  if (res.ok) {
    barcodes.value = await res.json();
  }
}
async function loadSuppliers() {
  const res = await fetch(`/items/${id}/suppliers`);
  if (res.ok) {
    suppliers.value = await res.json();
  }
}
async function loadStock() {
  const res = await fetch(`/items/${id}/stock`);
  if (res.ok) {
    const data = await res.json();
    stocks.value = data.stocks || [];
    movements.value = data.movements || [];
  }
}

function addBarcode() {
  if (newBarcode.value) {
    barcodes.value.push(newBarcode.value);
    newBarcode.value = '';
  }
}
function addSupplier() {
  if (newSupplier.value) {
    suppliers.value.push(newSupplier.value);
    newSupplier.value = '';
  }
}

async function validate() {
  errors.value = {};

  if (item.value.sku) {
    const res = await fetch(`/items?sku=${encodeURIComponent(item.value.sku)}`);
    if (res.ok) {
      const data = await res.json();
      const conflict = (data.items || []).find((i: any) => String(i.id) !== String(id));
      if (conflict) errors.value.sku = 'SKU already in use';
    }
  }
  const barcodeSet = new Set(barcodes.value);
  if (barcodeSet.size !== barcodes.value.length) {
    errors.value.barcodes = 'Duplicate barcodes found';
  }
  if (item.value.lotti && item.value.seriali) {
    errors.value.tracciabilita = 'Select only lotti or seriali';
  }

  return Object.keys(errors.value).length === 0;
}

async function save() {
  if (!(await validate())) return;

  const method = id && id !== 'new' ? 'PUT' : 'POST';
  const url = id && id !== 'new' ? `/items/${id}` : '/items';
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item.value)
  });
  if (res.ok) {
    const itemId = id && id !== 'new' ? id : (await res.json()).id;
    await Promise.all([
      saveBarcodes(itemId),
      saveSuppliers(itemId)
    ]);
    router.push('/items');
  }
}

async function saveBarcodes(itemId: string | number) {
  await fetch(`/items/${itemId}/barcodes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(barcodes.value)
  });
}
async function saveSuppliers(itemId: string | number) {
  await fetch(`/items/${itemId}/suppliers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(suppliers.value)
  });
}
</script>

<style scoped>
.tabs {
  margin-bottom: 1rem;
}
.tabs button {
  margin-right: 0.5rem;
}
.tabs button.active {
  font-weight: bold;
}
.error {
  color: red;
}
</style>
