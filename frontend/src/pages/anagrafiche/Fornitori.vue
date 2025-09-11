<template>
  <div>
    <Topbar />
    <main class="max-w-6xl mx-auto px-4 py-6">
      <h1 class="text-xl font-semibold mb-2">Fornitori</h1>
      <p class="text-slate-400 mb-4">Anagrafica fornitori (fino a 100 risultati).</p>

      <div v-if="loading" class="text-slate-400">Caricamento…</div>
      <div v-else-if="error" class="text-rose-400">{{ error }}</div>
      <div v-else>
        <div class="flex items-center mb-3">
          <div class="text-slate-400 text-sm">Totale: {{ total }}</div>
          <div class="ml-auto flex gap-2">
            <button class="px-3 py-1.5 rounded-lg text-sm bg-white/10 hover:bg-white/20 text-slate-200" @click="exportSuppliers('csv')">Export CSV</button>
            <button class="px-3 py-1.5 rounded-lg text-sm bg-white/10 hover:bg-white/20 text-slate-200" @click="exportSuppliers('xlsx')">Export XLSX</button>
          </div>
        </div>
        <ListFilters
          :items="items"
          :fields="[
            { key: 'id', label: 'ID', type: 'number' },
            { key: 'name', label: 'Nome', type: 'string' }
          ]"
          v-slot="{ filtered }"
        >
          <div v-if="filtered.length === 0" class="text-slate-400">Nessun risultato.</div>
          <div v-else class="overflow-x-auto border border-white/10 rounded-lg">
            <table class="min-w-full text-sm">
              <thead class="bg-white/5 text-slate-300">
                <tr>
                  <th class="text-left px-3 py-2">ID</th>
                  <th class="text-left px-3 py-2">Nome</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="s in filtered" :key="s.id" class="border-t border-white/10">
                  <td class="px-3 py-2 text-slate-300">{{ s.id }}</td>
                  <td class="px-3 py-2 text-slate-100">{{ s.name }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div class="mt-3 flex items-center gap-3">
            <div class="text-slate-400 text-sm">Pagina {{ page }} di {{ totalPages }}</div>
            <div class="ml-auto flex gap-2">
              <button class="px-2 py-1 rounded border border-white/10 text-sm" :disabled="page<=1" @click="prevPage">Indietro</button>
              <button class="px-2 py-1 rounded border border-white/10 text-sm" :disabled="page>=totalPages" @click="nextPage">Avanti</button>
              <select v-model.number="limit" class="px-2 py-1 rounded bg-white/10 border border-white/10 text-sm text-slate-200" @change="changeLimit">
                <option :value="20">20</option>
                <option :value="50">50</option>
                <option :value="100">100</option>
              </select>
            </div>
          </div>
        </ListFilters>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import Topbar from '../../components/Topbar.vue';
import ListFilters from '../../components/ListFilters.vue';
import api from '../../services/api';

type Supplier = { id: number; name: string };

const items = ref<Supplier[]>([]);
const loading = ref(false);
const error = ref('');
const page = ref(1);
const limit = ref(20);
const total = ref(0);
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit.value)));

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const { data } = await api.get('/suppliers', { params: { page: page.value, limit: limit.value } });
    items.value = data?.items || [];
    total.value = typeof data?.total === 'number' ? data.total : 0;
  } catch (e: any) {
    error.value = e?.response?.data?.error || e?.message || 'Errore caricamento';
  } finally {
    loading.value = false;
  }
}

onMounted(load);

function prevPage() {
  if (page.value <= 1) return;
  page.value -= 1;
  load();
}
function nextPage() {
  if (page.value >= totalPages.value) return;
  page.value += 1;
  load();
}
function changeLimit() {
  page.value = 1;
  load();
}

async function exportSuppliers(format: 'csv'|'xlsx') {
  try {
    const res = await api.get(`/suppliers/export`, { params: { format }, responseType: 'blob' });
    const blob = new Blob([res.data], { type: res.headers['content-type'] || (format==='xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv') });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fornitori.${format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (e: any) {
    alert(e?.response?.data?.error || e?.message || 'Errore export');
  }
}
</script>

<style scoped></style>
