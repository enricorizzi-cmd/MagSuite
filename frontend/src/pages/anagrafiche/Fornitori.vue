<template>
  <div>
    <Topbar />
    <main class="max-w-6xl mx-auto px-4 py-6">
      <h1 class="text-xl font-semibold mb-2">Fornitori</h1>
      <p class="text-slate-400 mb-4">Anagrafica fornitori (fino a 100 risultati).</p>

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
                <tr v-for="s in filtered" :key="s.id" class="border-t border-white/10">
                  <td class="px-3 py-2 text-slate-300">{{ s.id }}</td>
                  <td class="px-3 py-2 text-slate-100">{{ s.name }}</td>
                </tr>
              </tbody>
            </table>
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

type Supplier = { id: number; name: string };

const items = ref<Supplier[]>([]);
const loading = ref(false);
const error = ref('');

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const { data } = await api.get('/suppliers', { params: { page: 1, limit: 100 } });
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
