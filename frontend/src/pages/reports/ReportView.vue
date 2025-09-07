<template>
  <div class="report-view">
    <h2>Report {{ type }}</h2>
    <form @submit.prevent="loadReport">
      <label>
        Data:
        <input type="date" v-model="date" />
      </label>
      <label>
        Magazzino:
        <input type="text" v-model="warehouse" />
      </label>
      <label>
        Categoria:
        <input type="text" v-model="category" />
      </label>
      <button type="submit">Carica</button>
    </form>
    <div v-if="loading">Loading...</div>
    <div v-if="error">{{ error }}</div>
    <pre v-if="reportData">{{ reportData }}</pre>
    <div v-if="reportData" class="export-links">
      <a :href="exportLink('pdf')" target="_blank">Export PDF</a>
      <a :href="exportLink('xlsx')" target="_blank">Export XLSX</a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const type = route.params.type as string;

const date = ref('');
const warehouse = ref('');
const category = ref('');
const reportData = ref<any>(null);
const loading = ref(false);
const error = ref('');

function buildParams(includeFormat = false, format = ''): string {
  const params = new URLSearchParams();
  if (date.value) params.append('date', date.value);
  if (warehouse.value) params.append('warehouse', warehouse.value);
  if (category.value) params.append('category', category.value);
  if (includeFormat) params.append('format', format);
  const query = params.toString();
  return query ? `?${query}` : '';
}

async function loadReport() {
  loading.value = true;
  error.value = '';
  try {
    const res = await fetch(`/reports/${type}${buildParams()}`);
    if (res.ok) {
      reportData.value = await res.json();
    } else {
      error.value = 'Failed to load report';
    }
  } catch (e) {
    error.value = 'Failed to load report';
  } finally {
    loading.value = false;
  }
}

function exportLink(format: string) {
  return `/reports/${type}${buildParams(true, format)}`;
}
</script>

<style scoped>
.report-view {
  padding: 1rem;
}

form {
  margin-bottom: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

label {
  display: flex;
  flex-direction: column;
}

.export-links a {
  margin-right: 1rem;
}
</style>
