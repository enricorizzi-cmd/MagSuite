<template>
  <div>
    <Topbar />
    <main class="max-w-5xl mx-auto px-4 py-6">
      <h1 class="text-xl font-semibold mb-2">Magazzini</h1>
      <p class="text-slate-400 mb-4">Elenco magazzini aziendali.</p>

      <div v-if="loading" class="text-slate-400">Caricamento…</div>
      <div v-else-if="error" class="text-rose-400">{{ error }}</div>
      <div v-else>
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
                <tr v-for="w in filtered.slice((page-1)*limit, (page-1)*limit + limit)" :key="w.id" class="border-t border-white/10">
                  <td class="px-3 py-2 text-slate-300">{{ w.id }}</td>
                  <td class="px-3 py-2 text-slate-100">{{ w.name }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination (client-side) -->
          <div class="mt-3 flex items-center gap-3">
            <div class="text-slate-400 text-sm">Pagina {{ page }}</div>
            <div class="ml-auto flex gap-2">
              <button class="px-2 py-1 rounded border border-white/10 text-sm" :disabled="page<=1" @click="page = page - 1">Indietro</button>
              <button class="px-2 py-1 rounded border border-white/10 text-sm" :disabled="(page*limit) >= filtered.length" @click="page = page + 1">Avanti</button>
              <select v-model.number="limit" class="px-2 py-1 rounded bg-white/10 border border-white/10 text-sm text-slate-200">
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
import { onMounted, ref } from 'vue';
import Topbar from '../../components/Topbar.vue';
import ListFilters from '../../components/ListFilters.vue';
import api from '../../services/api';

type Warehouse = { id: number; name: string };

const items = ref<Warehouse[]>([]);
const loading = ref(false);
const error = ref('');
const page = ref(1);
const limit = ref(20);

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const { data } = await api.get('/warehouses');
    items.value = data?.items || [];
  } catch (e: any) {
    error.value = e?.response?.data?.error || e?.message || 'Errore caricamento';
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped></style>
