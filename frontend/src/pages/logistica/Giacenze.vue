<template>
  <div>
    <Topbar />
    <main class="max-w-7xl mx-auto px-4 py-6">
      <h1 class="text-xl font-semibold mb-2">Giacenze</h1>
      <p class="text-slate-400 mb-4">Quantità disponibili per articolo (fino a 100 risultati).</p>

      <div v-if="loading" class="text-slate-400">Caricamento…</div>
      <div v-else-if="error" class="text-rose-400">{{ error }}</div>
      <div v-else>
        <ListFilters
          :items="rows"
          :fields="[
            { key: 'sku', label: 'SKU', type: 'string' },
            { key: 'name', label: 'Nome', type: 'string' },
            { key: 'category', label: 'Categoria', type: 'string' },
            { key: 'quantity_on_hand', label: 'Q.tà', type: 'number' }
          ]"
          v-slot="{ filtered }"
        >
          <div v-if="filtered.length === 0" class="text-slate-400">Nessun risultato.</div>
          <div v-else class="overflow-x-auto border border-white/10 rounded-lg">
            <table class="min-w-full text-sm">
              <thead class="bg-white/5 text-slate-300">
                <tr>
                  <th class="text-left px-3 py-2">SKU</th>
                  <th class="text-left px-3 py-2">Nome</th>
                  <th class="text-left px-3 py-2">Categoria</th>
                  <th class="text-right px-3 py-2">Giacenza</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in filtered" :key="r.id" class="border-t border-white/10">
                  <td class="px-3 py-2 text-slate-300">{{ r.sku }}</td>
                  <td class="px-3 py-2 text-slate-100">{{ r.name }}</td>
                  <td class="px-3 py-2 text-slate-300">{{ r.category || '-' }}</td>
                  <td class="px-3 py-2 text-right text-slate-100">{{ formatQty(r.quantity_on_hand) }}</td>
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

type ItemRow = { id: number; sku: string; name: string; category?: string; quantity_on_hand?: number };

const rows = ref<ItemRow[]>([]);
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
    const { data } = await api.get('/items', { params: { page: page.value, limit: limit.value } });
    const items: any[] = data?.items || [];
    rows.value = items.map(i => ({
      id: i.id,
      sku: i.sku,
      name: i.name,
      category: i.category,
      quantity_on_hand: typeof i.quantity_on_hand === 'number' ? i.quantity_on_hand : 0
    }));
    total.value = typeof data?.total === 'number' ? data.total : 0;
  } catch (e: any) {
    error.value = e?.response?.data?.error || e?.message || 'Errore caricamento';
  } finally {
    loading.value = false;
  }
}

function formatQty(n?: number) {
  try { return (n ?? 0).toLocaleString(); } catch { return String(n ?? 0); }
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
</script>

<style scoped></style>
