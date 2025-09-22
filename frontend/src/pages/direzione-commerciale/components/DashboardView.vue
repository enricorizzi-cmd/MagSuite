<template>
  <section class="space-y-6">
    <div v-if="dashboard.loading" class="rounded-xl border border-white/10 bg-slate-900/60 p-6 text-center text-slate-300">
      Caricamento.
    </div>
    <div v-else-if="dashboard.error" class="rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 text-center text-rose-200">
      {{ dashboard.error }}
    </div>
    <template v-else>
      <div class="grid gap-4 md:grid-cols-4">
        <div
          v-for="(value, key) in kpis"
          :key="key"
          class="rounded-xl border border-white/10 bg-slate-900/60 p-4 text-slate-200"
        >
          <p class="text-xs uppercase tracking-wide text-slate-400">{{ key }}</p>
          <p class="mt-2 text-2xl font-semibold">{{ formatNumber(value) }}</p>
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <div class="rounded-xl border border-white/10 bg-slate-900/60 p-4">
          <div class="flex items-center gap-2">
            <h3 class="text-base font-semibold text-slate-100">Appuntamenti imminenti</h3>
            <span class="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300">{{ agenda.length }}</span>
          </div>
          <p v-if="agenda.length === 0" class="mt-3 text-sm text-slate-400">Nessun appuntamento pianificato.</p>
          <ul v-else class="mt-3 space-y-2 text-sm text-slate-200">
            <li v-for="item in agenda" :key="item.id" class="rounded-lg border border-white/5 bg-white/5 px-3 py-2">
              <div class="flex items-center justify-between">
                <span class="font-medium">{{ item.client_name }}</span>
                <span class="text-xs text-slate-400">{{ formatDateTime(item.start_at) }}</span>
              </div>
              <div class="mt-1 flex items-center justify-between text-xs text-slate-400">
                <span>{{ labels[item.appointment_type] || item.appointment_type }}</span>
                <span>{{ item.nncf ? 'NNCF' : '' }}</span>
              </div>
            </li>
          </ul>
        </div>

        <div class="rounded-xl border border-white/10 bg-slate-900/60 p-4">
          <div class="flex items-center gap-2">
            <h3 class="text-base font-semibold text-slate-100">Clienti recenti</h3>
            <span class="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300">{{ clients.length }}</span>
          </div>
          <p v-if="clients.length === 0" class="mt-3 text-sm text-slate-400">Nessun cliente trovato.</p>
          <ul v-else class="mt-3 space-y-2 text-sm text-slate-200">
            <li v-for="client in clients" :key="client.id" class="rounded-lg border border-white/5 bg-white/5 px-3 py-2">
              <div class="flex items-center justify-between">
                <span class="font-medium">{{ client.name }}</span>
                <span class="text-xs text-slate-400 capitalize">{{ client.status }}</span>
              </div>
              <div class="mt-1 text-xs text-slate-400">
                Ultimo appuntamento: {{ client.last_appointment_at ? formatDate(client.last_appointment_at) : '-' }}
              </div>
            </li>
          </ul>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useBpStore } from '../../../stores/bp';

const store = useBpStore();
const { dashboard } = storeToRefs(store);

const labels: Record<string, string> = {
  manuale: 'Manuale',
  telefonata: 'Telefonata',
  incontro: 'Incontro',
  vendita: 'Vendita',
  mezza: 'Mezza giornata',
  giornata: 'Giornata',
  formazione: 'Formazione',
  mbs: 'MBS',
  sottoprodotti: 'Sottoprodotti'
};

const kpis = computed(() => dashboard.value.data?.kpis ?? {});
const agenda = computed(() => dashboard.value.data?.agenda.slice(0, 8) ?? []);
const clients = computed(() => dashboard.value.data?.clients.slice(0, 8) ?? []);

onMounted(() => {
  store.loadDashboard().catch(() => undefined);
});

function formatNumber(value: number) {
  return new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 }).format(value);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value));
}
</script>
