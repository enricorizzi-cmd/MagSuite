<template>
  <div class="item-list">
    <section class="filters">
      <input v-model="filters.text" placeholder="Search..." @input="fetchItems" />
      <select v-model="filters.category" @change="fetchItems">
        <option value="">All Categories</option>
        <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
      </select>
      <select v-model="filters.brand" @change="fetchItems">
        <option value="">All Brands</option>
        <option v-for="b in brands" :key="b" :value="b">{{ b }}</option>
      </select>
      <label>
        <input type="checkbox" v-model="filters.lotti" @change="fetchItems" />
        Lotti
      </label>
      <label>
        <input type="checkbox" v-model="filters.seriali" @change="fetchItems" />
        Seriali
      </label>
      <button @click="fetchItems">Filter</button>
      <button @click="createItem">Create</button>
      <button @click="exportCSV">Export CSV</button>
      <label class="import-csv">
        Import CSV
        <input type="file" accept=".csv" @change="importCSV" hidden />
      </label>
    </section>

    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Category</th>
          <th>Brand</th>
          <th>Lotti</th>
          <th>Seriali</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in items" :key="item.id">
          <td>{{ item.name }}</td>
          <td>{{ item.category }}</td>
          <td>{{ item.brand }}</td>
          <td>{{ item.lotti ? 'Yes' : 'No' }}</td>
          <td>{{ item.seriali ? 'Yes' : 'No' }}</td>
          <td>
            <button @click="editItem(item)">Edit</button>
            <button @click="archiveItem(item)">Archive</button>
          </td>
        </tr>
      </tbody>
    </table>

    <div class="pagination">
      <button :disabled="page <= 1" @click="changePage(page - 1)">Prev</button>
      <span>Page {{ page }} / {{ totalPages }}</span>
      <button :disabled="page >= totalPages" @click="changePage(page + 1)">Next</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useRouter } from 'vue-router';

interface Item {
  id: number | string;
  name: string;
  category?: string;
  brand?: string;
  lotti?: boolean;
  seriali?: boolean;
  [key: string]: any;
}

const items = ref<Item[]>([]);
const router = useRouter();
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);

const filters = ref({
  text: '',
  category: '',
  brand: '',
  lotti: false,
  seriali: false
});

const categories = ref<string[]>([]);
const brands = ref<string[]>([]);

const totalPages = computed(() =>
  Math.max(1, Math.ceil(total.value / pageSize.value))
);

async function fetchItems() {
  const params = new URLSearchParams();
  params.set('page', String(page.value));
  params.set('limit', String(pageSize.value));
  if (filters.value.text) params.set('text', filters.value.text);
  if (filters.value.category) params.set('category', filters.value.category);
  if (filters.value.brand) params.set('brand', filters.value.brand);
  if (filters.value.lotti) params.set('lotti', 'true');
  if (filters.value.seriali) params.set('seriali', 'true');

  try {
    const res = await fetch(`/items?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      items.value = data.items || [];
      total.value = data.total || items.value.length;
      if (!categories.value.length) {
        const cats = Array.from(new Set(items.value.map(i => i.category).filter(Boolean)));
        categories.value = cats as string[];
      }
      if (!brands.value.length) {
        const brs = Array.from(new Set(items.value.map(i => i.brand).filter(Boolean)));
        brands.value = brs as string[];
      }
    }
  } catch (err) {
    console.error('Failed to load items', err);
  }
}

function changePage(newPage: number) {
  page.value = newPage;
  fetchItems();
}

function createItem() {
  router.push('/items/new');
}

function editItem(item: Item) {
  router.push(`/items/${item.id}`);
}

async function archiveItem(item: Item) {
  try {
    const res = await fetch(`/items/${item.id}/archive`, { method: 'POST' });
    if (res.ok) {
      fetchItems();
    }
  } catch (err) {
    console.error('Failed to archive item', err);
  }
}

async function importCSV(e: Event) {
  const input = e.target as HTMLInputElement;
  if (!input.files?.length) return;
  const form = new FormData();
  form.append('file', input.files[0]);
  try {
    const res = await fetch('/items/import', { method: 'POST', body: form });
    if (res.ok) {
      fetchItems();
    }
  } catch (err) {
    console.error('Import failed', err);
  } finally {
    input.value = '';
  }
}

function exportCSV() {
  const params = new URLSearchParams();
  if (filters.value.text) params.set('text', filters.value.text);
  if (filters.value.category) params.set('category', filters.value.category);
  if (filters.value.brand) params.set('brand', filters.value.brand);
  if (filters.value.lotti) params.set('lotti', 'true');
  if (filters.value.seriali) params.set('seriali', 'true');
  window.open(`/items/export?${params.toString()}`, '_blank');
}

onMounted(() => {
  fetchItems();
});
</script>

<style scoped>
.item-list {
  padding: 1rem;
}
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
.filters input[type='text'],
.filters select {
  padding: 0.25rem;
}
.import-csv {
  display: inline-block;
  cursor: pointer;
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
.pagination {
  margin-top: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}
</style>
