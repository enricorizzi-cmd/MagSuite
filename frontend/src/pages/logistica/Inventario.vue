<template>
  <div>
    <Topbar />
    <main class="max-w-6xl mx-auto px-4 py-6">
      <div class="flex items-center mb-3">
        <h1 class="text-xl font-semibold">Inventario</h1>
        <button class="ml-auto px-3 py-1.5 rounded-lg text-sm bg-fuchsia-600 hover:bg-fuchsia-500 text-white" @click="createInventory" :disabled="creating">
          <span v-if="creating">Creazione…</span>
          <span v-else>Nuovo inventario</span>
        </button>
      </div>
      <p class="text-slate-400 mb-4">Sessioni di inventario.</p>

      <div v-if="loading" class="text-slate-400">Caricamento…</div>
      <div v-else-if="error" class="text-rose-400">{{ error }}</div>
      <div v-else>
        <ListFilters
          :items="rows"
          :fields="[
            { key: 'id', label: 'ID', type: 'number' },
            { key: 'status', label: 'Stato', type: 'enum', options: ['open','frozen','closed'] }
          ]"
          v-slot="{ filtered }"
        >
          <div v-if="filtered.length === 0" class="text-slate-400">Nessun inventario.</div>
          <div v-else class="overflow-x-auto border border-white/10 rounded-lg">
            <table class="min-w-full text-sm">
              <thead class="bg-white/5 text-slate-300">
                <tr>
                  <th class="text-left px-3 py-2">ID</th>
                  <th class="text-left px-3 py-2">Stato</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="inv in filtered" :key="inv.id" class="border-t border-white/10">
                  <td class="px-3 py-2 text-slate-300">{{ inv.id }}</td>
                  <td class="px-3 py-2">
                    <span :class="statusClass(inv.status)" class="px-2 py-0.5 rounded text-xs">{{ inv.status }}</span>
                  </td>
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

type Inventory = { id: number; status: string };

const rows = ref<Inventory[]>([]);
const loading = ref(false);
const error = ref('');
const creating = ref(false);

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const { data } = await api.get('/inventories', { params: { limit: 100, offset: 0 } });
    rows.value = data?.items || [];
  } catch (e: any) {
    error.value = e?.response?.data?.error || e?.message || 'Errore caricamento';
  } finally {
    loading.value = false;
  }
}

async function createInventory() {
  creating.value = true;
  try {
    await api.post('/inventories', { scope: null });
    await load();
  } catch (e: any) {
    alert(e?.response?.data?.error || e?.message || 'Errore creazione inventario');
  } finally {
    creating.value = false;
  }
}

function statusClass(s: string) {
  if (s === 'open') return 'bg-sky-500/20 text-sky-200';
  if (s === 'frozen') return 'bg-yellow-500/20 text-yellow-200';
  if (s === 'closed') return 'bg-slate-500/20 text-slate-200';
  return 'bg-white/10 text-slate-200';
}

onMounted(load);
</script>

<style scoped></style>
