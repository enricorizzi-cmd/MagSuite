<template>
  <section class="space-y-6">
    <header class="space-y-2">
      <h2 class="text-xl font-semibold text-slate-100">Squadra & provvigioni</h2>
      <p class="text-sm text-slate-400">Classifica pesata e riepilogo provvigioni in base ai periodi selezionati.</p>
    </header>

    <div class="grid gap-3 md:grid-cols-5 text-sm">
      <label class="space-y-1 text-slate-300">
        <span class="font-medium">Tipo periodo</span>
        <select v-model="leaderboardFilters.type" class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100">
          <option value="mensile">Mensile</option>
          <option value="settimanale">Settimanale</option>
          <option value="trimestrale">Trimestrale</option>
          <option value="annuale">Annuale</option>
        </select>
      </label>
      <label class="space-y-1 text-slate-300">
        <span class="font-medium">Modalità</span>
        <select v-model="leaderboardFilters.mode" class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100">
          <option value="consuntivo">Consuntivo</option>
          <option value="previsionale">Previsionale</option>
        </select>
      </label>
      <label class="space-y-1 text-slate-300">
        <span class="font-medium">Dal</span>
        <input v-model="leaderboardFilters.from" type="date" class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100" />
      </label>
      <label class="space-y-1 text-slate-300">
        <span class="font-medium">Al</span>
        <input v-model="leaderboardFilters.to" type="date" class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100" />
      </label>
      <label class="space-y-1 text-slate-300">
        <span class="font-medium">Consulenti</span>
        <select v-model="selectedUsers" multiple class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 h-24">
          <option v-for="item in consultants" :key="item.user_id" :value="item.user_id">Utente #{{ item.user_id }}</option>
        </select>
      </label>
    </div>
    <div class="flex justify-end">
      <button class="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 hover:bg-white/10" @click="reloadLeaderboard">Aggiorna classifica</button>
    </div>

    <div class="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <h3 class="text-base font-semibold text-slate-100">Leaderboard</h3>
      <div v-if="leaderboard.loading" class="mt-3 text-sm text-slate-300">Calcolo classifica...</div>
      <div v-else-if="leaderboard.error" class="mt-3 rounded border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{{ leaderboard.error }}</div>
      <div v-else>
        <table class="mt-3 min-w-full divide-y divide-white/10 text-sm">
          <thead class="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th class="px-3 py-2 text-left">#</th>
              <th class="px-3 py-2 text-left">Consulente</th>
              <th class="px-3 py-2 text-left">Prev</th>
              <th class="px-3 py-2 text-left">Cons</th>
              <th class="px-3 py-2 text-left">Totali</th>
              <th class="px-3 py-2 text-right">Score</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5 text-slate-200">
            <tr v-if="!leaderboard.data?.entries.length">
              <td class="px-3 py-4 text-center text-sm text-slate-400" colspan="6">Nessun dato disponibile.</td>
            </tr>
            <tr v-for="(entry, index) in leaderboard.data?.entries || []" :key="entry.userId">
              <td class="px-3 py-3 text-xs text-slate-400">{{ index + 1 }}</td>
              <td class="px-3 py-3">Utente #{{ entry.userId }}</td>
              <td class="px-3 py-3 text-xs text-slate-300">{{ stringify(entry.prev) }}</td>
              <td class="px-3 py-3 text-xs text-slate-300">{{ stringify(entry.cons) }}</td>
              <td class="px-3 py-3 text-xs text-slate-300">{{ stringify(entry.totals) }}</td>
              <td class="px-3 py-3 text-right font-semibold">{{ formatNumber(entry.score) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <div class="flex items-center justify-between">
        <h3 class="text-base font-semibold text-slate-100">Provvigioni</h3>
        <div class="flex gap-2 text-sm">
          <input v-model="commissionsFilters.from" type="date" class="rounded border border-white/10 bg-white/5 px-2 py-1 text-slate-100" />
          <input v-model="commissionsFilters.to" type="date" class="rounded border border-white/10 bg-white/5 px-2 py-1 text-slate-100" />
          <select v-model="commissionsFilters.mode" class="rounded border border-white/10 bg-white/5 px-2 py-1 text-slate-100">
            <option value="consuntivo">Consuntivo</option>
            <option value="previsionale">Previsionale</option>
          </select>
          <button class="rounded border border-white/10 px-2 py-1 text-sm text-slate-200 hover:bg-white/10" @click="reloadCommissions">Aggiorna</button>
        </div>
      </div>
      <div v-if="commissions.loading" class="mt-3 text-sm text-slate-300">Caricamento provvigioni...</div>
      <div v-else-if="commissions.error" class="mt-3 rounded border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{{ commissions.error }}</div>
      <div v-else>
        <table class="mt-3 min-w-full divide-y divide-white/10 text-sm">
          <thead class="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th class="px-3 py-2 text-left">Consulente</th>
              <th class="px-3 py-2 text-right">Provv. GI</th>
              <th class="px-3 py-2 text-right">Provv. VSD</th>
              <th class="px-3 py-2 text-right">Totale</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5 text-slate-200">
            <tr v-if="!commissions.rows.length">
              <td class="px-3 py-4 text-center text-sm text-slate-400" colspan="4">Nessun risultato.</td>
            </tr>
            <tr v-for="row in commissions.rows" :key="row.id">
              <td class="px-3 py-3">Utente #{{ row.id }} - {{ row.name }}</td>
              <td class="px-3 py-3 text-right">{{ formatCurrency(row.provvGi) }}</td>
              <td class="px-3 py-3 text-right">{{ formatCurrency(row.provvVsd) }}</td>
              <td class="px-3 py-3 text-right font-semibold">{{ formatCurrency(row.provvTot) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useBpStore } from '../../../stores/bp';

const store = useBpStore();
const { consultants, leaderboard, commissions } = storeToRefs(store);

const leaderboardFilters = reactive({
  type: 'mensile',
  mode: 'consuntivo',
  from: defaultFrom(),
  to: defaultTo()
});
const selectedUsers = ref<number[]>([]);

const commissionsFilters = reactive({
  from: defaultFrom(),
  to: defaultTo(),
  mode: 'consuntivo'
});

function defaultFrom() {
  const now = new Date();
  now.setDate(1);
  return now.toISOString().slice(0, 10);
}

function defaultTo() {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

async function reloadLeaderboard() {
  const params: any = {
    type: leaderboardFilters.type,
    mode: leaderboardFilters.mode,
    from: leaderboardFilters.from,
    to: leaderboardFilters.to
  };
  if (selectedUsers.value.length) {
    params.userIds = selectedUsers.value.join(',');
  }
  await store.loadLeaderboard(params);
}

async function reloadCommissions() {
  if (!commissionsFilters.from || !commissionsFilters.to) return;
  await store.loadCommissionSummary({
    from: commissionsFilters.from,
    to: commissionsFilters.to,
    mode: commissionsFilters.mode
  });
}

onMounted(async () => {
  await store.loadConsultants().catch(() => undefined);
  await reloadLeaderboard();
  await reloadCommissions();
});

function stringify(obj: Record<string, number>) {
  if (!obj || !Object.keys(obj).length) return '-';
  return JSON.stringify(obj, null, 2);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 }).format(Number(value) || 0);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(Number(value) || 0);
}
</script>

