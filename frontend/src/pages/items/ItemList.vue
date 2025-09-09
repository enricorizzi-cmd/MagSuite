<template>
  <div class="item-list">
    <section class="filters">
      <input v-model="filters.text" placeholder="Search..." />
      <select v-model="filters.category">
        <option value="">All Categories</option>
        <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
      </select>
      <select v-model="filters.brand">
        <option value="">All Brands</option>
        <option v-for="b in brands" :key="b" :value="b">{{ b }}</option>
      </select>
      <label>
        <input type="checkbox" v-model="filters.lotti" />
        Lotti
      </label>
      <label>
        <input type="checkbox" v-model="filters.seriali" />
        Seriali
      </label>
      <select v-model="selectedFilterSet" @change="applySavedFilters">
        <option value="">Load Filters</option>
        <option v-for="sf in savedFilterSets" :key="sf.name" :value="sf.name">{{ sf.name }}</option>
      </select>
      <button @click="saveCurrentFilters">Save Filters</button>
      <button @click="createItem">Create</button>
      <button @click="archiveSelected" :disabled="!selectedIds.length">Archive Selected</button>
      <select v-model="exportFormat">
        <option value="csv">CSV</option>
        <option value="xlsx">XLSX</option>
      </select>
      <select multiple v-model="selectedColumns">
        <option v-for="col in allColumns" :key="col" :value="col">
          {{ col }}
        </option>
      </select>
      <button @click="exportData">Export</button>
      <label class="import-csv">
        Import CSV
        <input type="file" accept=".csv" @change="importCSV" hidden />
      </label>
    </section>

    <p v-if="deadlineNotification" class="deadline-note">{{ deadlineNotification }}</p>
    <table>
      <thead>
        <tr>
          <th><input type="checkbox" :checked="allSelected" @change="toggleSelectAll" /></th>
          <th>Name</th>
          <th>Category</th>
          <th>Brand</th>
          <th>Lotti</th>
          <th>Seriali</th>
          <th>Deadline</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in items" :key="item.id">
          <td><input type="checkbox" v-model="selectedIds" :value="item.id" /></td>
          <td>{{ item.name }}</td>
          <td>{{ item.category }}</td>
          <td>{{ item.brand }}</td>
          <td>{{ item.lotti ? 'Yes' : 'No' }}</td>
          <td>{{ item.seriali ? 'Yes' : 'No' }}</td>
          <td :class="{ expired: isExpired(item), soon: isExpiringSoon(item) }">
            {{ formatDate(item.expiryDate) }}
          </td>
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
import { onMounted, ref, computed, watch } from 'vue';
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

interface FilterOptions {
  text: string;
  category: string;
  brand: string;
  lotti: boolean;
  seriali: boolean;
}

interface SavedFilterSet {
  name: string;
  filters: FilterOptions;
}

const items = ref<Item[]>([]);
const router = useRouter();
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);

const filters = ref<FilterOptions>({
  text: '',
  category: '',
  brand: '',
  lotti: false,
  seriali: false
});

const savedFilterSets = ref<SavedFilterSet[]>([]);
const selectedFilterSet = ref('');
const selectedIds = ref<(number | string)[]>([]);

const deadlineNotification = ref('');

const categories = ref<string[]>([]);
const brands = ref<string[]>([]);
const allColumns = ['id', 'name', 'category', 'brand', 'lotti', 'seriali'];
const selectedColumns = ref<string[]>([...allColumns]);
const exportFormat = ref('csv');

const allSelected = computed(() =>
  items.value.length > 0 && selectedIds.value.length === items.value.length
);

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
      const soon = items.value.filter(isExpiringSoon);
      if (soon.length) {
        deadlineNotification.value = `Items expiring soon: ${soon.map(i => i.name).join(', ')}`;
      } else {
        deadlineNotification.value = '';
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

function exportData() {
  const params = new URLSearchParams();
  if (filters.value.text) params.set('text', filters.value.text);
  if (filters.value.category) params.set('category', filters.value.category);
  if (filters.value.brand) params.set('brand', filters.value.brand);
  if (filters.value.lotti) params.set('lotti', 'true');
  if (filters.value.seriali) params.set('seriali', 'true');
  params.set('columns', selectedColumns.value.join(','));
  params.set('format', exportFormat.value);
  window.open(`/items/export?${params.toString()}`, '_blank');
}

function saveCurrentFilters() {
  const name = prompt('Filter set name?');
  if (!name) return;
  const existing = savedFilterSets.value.find(sf => sf.name === name);
  if (existing) {
    existing.filters = { ...filters.value };
  } else {
    savedFilterSets.value.push({ name, filters: { ...filters.value } });
  }
  localStorage.setItem('savedFilters', JSON.stringify(savedFilterSets.value));
}

function applySavedFilters() {
  const selected = savedFilterSets.value.find(sf => sf.name === selectedFilterSet.value);
  if (selected) {
    filters.value = { ...selected.filters };
  }
}

function loadSavedFilters() {
  const raw = localStorage.getItem('savedFilters');
  savedFilterSets.value = raw ? JSON.parse(raw) : [];
}

function toggleSelectAll(e: Event) {
  const checked = (e.target as HTMLInputElement).checked;
  selectedIds.value = checked ? items.value.map(i => i.id) : [];
}

async function archiveSelected() {
  await Promise.all(
    selectedIds.value.map(id => fetch(`/items/${id}/archive`, { method: 'POST' }))
  );
  selectedIds.value = [];
  fetchItems();
}

function formatDate(date?: string) {
  return date ? new Date(date).toLocaleDateString() : '';
}

function isExpired(item: Item) {
  if (!item.expiryDate) return false;
  return new Date(item.expiryDate) < new Date();
}

function isExpiringSoon(item: Item) {
  if (!item.expiryDate) return false;
  const dt = new Date(item.expiryDate).getTime();
  const now = Date.now();
  return dt >= now && dt <= now + 7 * 24 * 60 * 60 * 1000;
}

watch(
  filters,
  () => {
    page.value = 1;
    fetchItems();
  },
  { deep: true }
);

onMounted(() => {
  loadSavedFilters();
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
.deadline-note {
  margin-bottom: 0.5rem;
  color: #d97706;
}
.expired {
  color: red;
}
.soon {
  color: orange;
}
</style>
