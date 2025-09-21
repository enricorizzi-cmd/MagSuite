<template>
  <div>
    <Topbar />
    <main class="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <header class="flex flex-wrap items-start gap-3">
        <div class="flex-1 min-w-[16rem]">
          <h1 class="text-2xl font-semibold text-slate-100">Gestionale</h1>
          <p class="text-sm text-slate-400 mt-1">Riepilogo operativo di ordini, portafoglio e iniziative commerciali.</p>
        </div>
        <button
          class="px-3 py-1.5 rounded-lg text-sm border border-white/10 text-slate-200 hover:bg-white/10 disabled:opacity-50"
          :disabled="loading"
          @click="load"
        >{{ loading ? 'Aggiornamento…' : 'Aggiorna' }}</button>
      </header>

      <div v-if="error" class="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 flex items-start gap-3">
        <span>{{ error }}</span>
        <button class="ml-auto text-xs underline hover:text-rose-50" @click="load">Riprova</button>
      </div>

      <section class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div class="rounded-xl border border-white/10 bg-white/5 p-5">
          <div class="text-sm text-slate-400">Ordini totali</div>
          <div class="mt-2 text-3xl font-semibold text-white">{{ summary.total_orders }}</div>
        </div>
        <div class="rounded-xl border border-white/10 bg-white/5 p-5">
          <div class="text-sm text-slate-400">Valore maturato</div>
          <div class="mt-2 text-3xl font-semibold text-white">{{ formatCurrency(summary.total_revenue) }}</div>
        </div>
        <div class="rounded-xl border border-white/10 bg-white/5 p-5">
          <div class="text-sm text-slate-400">Portafoglio in sospeso</div>
          <div class="mt-2 text-3xl font-semibold text-white">{{ formatCurrency(summary.backlog_value) }}</div>
        </div>
      </section>

      <section class="rounded-xl border border-white/10 bg-white/5 p-5">
        <h2 class="text-lg font-semibold text-slate-100">Prossime erogazioni</h2>
        <p class="text-sm text-slate-400 mb-3">Consegne pianificate nei prossimi giorni.</p>
        <div v-if="!summary.upcoming_deliveries.length" class="text-sm text-slate-400">Nessuna erogazione programmata.</div>
        <ul v-else class="space-y-2">
          <li v-for="delivery in summary.upcoming_deliveries" :key="delivery.id" class="flex items-center gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
            <div class="text-sm text-white">{{ delivery.customer_name }}</div>
            <div class="ml-auto text-xs text-slate-400">{{ formatDate(delivery.delivery_date) }}</div>
          </li>
        </ul>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import Topbar from '../../components/Topbar.vue';
import api from '../../services/api';

type Delivery = { id: number; customer_name: string; delivery_date: string };

type Summary = {
  total_orders: number;
  total_revenue: number;
  backlog_value: number;
  upcoming_deliveries: Delivery[];
};

const loading = ref(false);
const error = ref('');
const summary = ref<Summary>({ total_orders: 0, total_revenue: 0, backlog_value: 0, upcoming_deliveries: [] });

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const { data } = await api.get('/gestionale/summary');
    summary.value = {
      total_orders: Number(data?.total_orders || 0),
      total_revenue: Number(data?.total_revenue || 0),
      backlog_value: Number(data?.backlog_value || 0),
      upcoming_deliveries: Array.isArray(data?.upcoming_deliveries) ? data.upcoming_deliveries : []
    };
  } catch (e: any) {
    error.value = e?.response?.data?.error || e?.message || 'Errore nel caricamento del riepilogo';
  } finally {
    loading.value = false;
  }
}

onMounted(load);

function formatCurrency(value: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value || 0);
}

function formatDate(value: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}
</script>
