<template>
  <section class="space-y-6">
    <header class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 class="text-xl font-semibold text-slate-100">Periodi & KPI</h2>
        <p class="text-sm text-slate-400">Confronto previsionale/consuntivo per consulente e periodo.</p>
      </div>
      <button
        class="self-start rounded-lg border border-cyan-400/60 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-100 shadow hover:bg-cyan-400/20"
        @click="openModal"
      >Nuovo periodo</button>
    </header>

    <div class="flex flex-wrap items-end gap-3 text-sm">
      <label class="flex flex-col gap-1 text-slate-300">
        <span class="font-medium">Tipo</span>
        <select v-model="selectedType" class="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100">
          <option value="">Tutti</option>
          <option value="settimanale">Settimanale</option>
          <option value="mensile">Mensile</option>
          <option value="trimestrale">Trimestrale</option>
          <option value="semestrale">Semestrale</option>
          <option value="annuale">Annuale</option>
          <option value="ytd">YTD</option>
          <option value="ltm">LTM</option>
        </select>
      </label>
      <label class="flex flex-col gap-1 text-slate-300">
        <span class="font-medium">Consulente</span>
        <select v-model.number="selectedUserId" class="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100">
          <option :value="0">Tutti</option>
          <option v-for="item in consultants" :key="item.user_id" :value="item.user_id">Utente #{{ item.user_id }}</option>
        </select>
      </label>
      <label class="flex flex-col gap-1 text-slate-300">
        <span class="font-medium">Dal</span>
        <input v-model="fromDate" type="date" class="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100" />
      </label>
      <label class="flex flex-col gap-1 text-slate-300">
        <span class="font-medium">Al</span>
        <input v-model="toDate" type="date" class="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100" />
      </label>
      <button class="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 hover:bg-white/10" @click="reload">Aggiorna</button>
    </div>

    <div v-if="periods.loading" class="rounded-lg border border-white/10 bg-slate-900/60 p-6 text-center text-sm text-slate-300">
      Caricamento periodi...
    </div>
    <div v-else-if="periods.error" class="rounded-lg border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
      {{ periods.error }}
    </div>
    <div v-else>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-white/10 text-sm">
          <thead class="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th class="px-3 py-2 text-left">Periodo</th>
              <th class="px-3 py-2 text-left">Consulente</th>
              <th class="px-3 py-2 text-left">Modalità</th>
              <th class="px-3 py-2 text-left">Indicatori prev.</th>
              <th class="px-3 py-2 text-left">Indicatori cons.</th>
              <th class="px-3 py-2 text-left">Totali</th>
              <th class="px-3 py-2 text-right">Azioni</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5 text-slate-200">
            <tr v-if="!periods.items.length">
              <td class="px-3 py-4 text-center text-sm text-slate-400" colspan="7">Nessun periodo registrato.</td>
            </tr>
            <tr v-for="item in periods.items" :key="item.id">
              <td class="px-3 py-3">
                <div class="font-medium capitalize">{{ item.period_type }}</div>
                <div class="text-xs text-slate-400">{{ formatRange(item.start_date, item.end_date) }}</div>
              </td>
              <td class="px-3 py-3 text-sm">Utente #{{ item.user_id }}</td>
              <td class="px-3 py-3 text-sm capitalize">{{ item.mode }}</td>
              <td class="px-3 py-3 text-xs">
                <pre class="whitespace-pre-wrap break-words text-slate-300">{{ stringify(item.indicators_prev) }}</pre>
              </td>
              <td class="px-3 py-3 text-xs">
                <pre class="whitespace-pre-wrap break-words text-slate-300">{{ stringify(item.indicators_cons) }}</pre>
              </td>
              <td class="px-3 py-3 text-xs">
                <pre class="whitespace-pre-wrap break-words text-slate-300">{{ stringify(item.totals) }}</pre>
              </td>
              <td class="px-3 py-3 text-right">
                <button class="rounded border border-white/10 px-2 py-1 text-xs text-rose-200 hover:bg-rose-500/20" @click="remove(item.id)">Elimina</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <transition name="fade">
      <div v-if="modal.open" class="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-4">
        <div class="w-full max-w-3xl rounded-2xl border border-white/10 bg-slate-950/95 p-6 text-sm text-slate-200">
          <div class="flex items-center gap-3">
            <h3 class="text-lg font-semibold text-slate-100">Nuovo periodo</h3>
            <button class="ml-auto text-slate-400 hover:text-slate-100" @click="closeModal">✕</button>
          </div>
          <form class="mt-4 space-y-4" @submit.prevent="saveModal">
            <div class="grid gap-4 md:grid-cols-2">
              <label class="space-y-1">
                <span class="text-slate-300">Tipo</span>
                <select v-model="modal.data.period_type" required class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100">
                  <option value="mensile">Mensile</option>
                  <option value="settimanale">Settimanale</option>
                  <option value="trimestrale">Trimestrale</option>
                  <option value="semestrale">Semestrale</option>
                  <option value="annuale">Annuale</option>
                  <option value="ytd">YTD</option>
                  <option value="ltm">LTM</option>
                </select>
              </label>
              <label class="space-y-1">
                <span class="text-slate-300">Modalità</span>
                <select v-model="modal.data.mode" class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100">
                  <option value="consuntivo">Consuntivo</option>
                  <option value="previsionale">Previsionale</option>
                </select>
              </label>
            </div>

            <div class="grid gap-4 md:grid-cols-2">
              <label class="space-y-1">
                <span class="text-slate-300">Inizio</span>
                <input v-model="modal.data.start_date" type="date" required class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100" />
              </label>
              <label class="space-y-1">
                <span class="text-slate-300">Fine</span>
                <input v-model="modal.data.end_date" type="date" required class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100" />
              </label>
            </div>

            <label class="space-y-1">
              <span class="text-slate-300">Indicatori previsionali (JSON)</span>
              <textarea v-model="modal.data.indicators_prev" rows="3" class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-100" placeholder='{"VSS": 10, "Telefonate": 20}'></textarea>
            </label>

            <label class="space-y-1">
              <span class="text-slate-300">Indicatori consuntivi (JSON)</span>
              <textarea v-model="modal.data.indicators_cons" rows="3" class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-100" placeholder='{"VSS": 8, "Telefonate": 18}'></textarea>
            </label>

            <label class="space-y-1">
              <span class="text-slate-300">Totali (JSON)</span>
              <textarea v-model="modal.data.totals" rows="3" class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-100" placeholder='{"ProvvGI": 1500, "ProvvVSD": 900}'></textarea>
            </label>

            <div v-if="modal.error" class="rounded border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{{ modal.error }}</div>

            <div class="flex justify-end gap-2">
              <button type="button" class="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 hover:bg-white/10" @click="closeModal">Annulla</button>
              <button
                type="submit"
                class="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-900 shadow hover:bg-cyan-400 disabled:opacity-60"
                :disabled="modal.saving"
              >{{ modal.saving ? 'Salvataggio...' : 'Salva' }}</button>
            </div>
          </form>
        </div>
      </div>
    </transition>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useBpStore } from '../../../stores/bp';

const store = useBpStore();
const { periods, consultants } = storeToRefs(store);

const selectedType = ref('');
const selectedUserId = ref(0);
const fromDate = ref('');
const toDate = ref('');

const modal = reactive({
  open: false,
  saving: false,
  error: '',
  data: {
    period_type: 'mensile',
    mode: 'consuntivo',
    start_date: '',
    end_date: '',
    indicators_prev: '',
    indicators_cons: '',
    totals: ''
  }
});

function openModal() {
  modal.open = true;
  modal.error = '';
  modal.data = {
    period_type: selectedType.value || 'mensile',
    mode: 'consuntivo',
    start_date: fromDate.value || new Date().toISOString().slice(0, 10),
    end_date: toDate.value || new Date().toISOString().slice(0, 10),
    indicators_prev: '',
    indicators_cons: '',
    totals: ''
  };
}

function closeModal() {
  modal.open = false;
  modal.error = '';
}

function parseJson(value: string) {
  if (!value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === 'object' && parsed ? parsed : {};
  } catch (error) {
    throw new Error('Formato JSON non valido');
  }
}

async function saveModal() {
  modal.saving = true;
  modal.error = '';
  try {
    const payload = {
      period_type: modal.data.period_type,
      mode: modal.data.mode,
      start_date: modal.data.start_date,
      end_date: modal.data.end_date,
      indicators_prev: parseJson(modal.data.indicators_prev),
      indicators_cons: parseJson(modal.data.indicators_cons),
      totals: parseJson(modal.data.totals)
    };
    if (selectedUserId.value > 0) {
      Object.assign(payload, { user_id: selectedUserId.value });
    }
    await store.createPeriod(payload);
    closeModal();
  } catch (error: any) {
    modal.error = error?.message || 'Errore salvataggio periodo';
  } finally {
    modal.saving = false;
  }
}

async function remove(id: string) {
  if (!confirm('Eliminare definitivamente il periodo?')) return;
  await store.removePeriod(id);
}

function reload() {
  store.loadPeriods({
    type: selectedType.value || undefined,
    userId: selectedUserId.value || undefined,
    from: fromDate.value || undefined,
    to: toDate.value || undefined,
    offset: 0
  });
}

watch(selectedType, () => reload());
watch(selectedUserId, () => reload());
watch([fromDate, toDate], () => reload());

onMounted(async () => {
  await store.loadConsultants().catch(() => undefined);
  await store.loadPeriods();
});

function formatRange(start: string, end: string) {
  return `${formatDate(start)} → ${formatDate(end)}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

function stringify(obj: Record<string, number>) {
  if (!obj || !Object.keys(obj).length) return '-';
  return JSON.stringify(obj, null, 2);
}
</script>
