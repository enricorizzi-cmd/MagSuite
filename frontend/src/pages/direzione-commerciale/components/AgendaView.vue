<template>
  <section class="space-y-6">
    <header class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 class="text-xl font-semibold text-slate-100">Agenda commerciale</h2>
        <p class="text-sm text-slate-400">Appuntamenti, attività sul campo e indicatori operativi.</p>
      </div>
      <button
        class="self-start rounded-lg border border-cyan-400/60 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-100 shadow hover:bg-cyan-400/20"
        @click="openModal"
      >Nuovo appuntamento</button>
    </header>

    <div class="grid gap-3 md:grid-cols-5 text-sm">
      <label class="space-y-1 text-slate-300">
        <span class="font-medium">Consulente</span>
        <select
          v-model.number="selectedUserId"
          class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
        >
          <option :value="0">Solo miei</option>
          <option value="-1">Tutti</option>
          <option
            v-for="consultant in consultants"
            :key="consultant.user_id"
            :value="consultant.user_id"
          >
            Utente #{{ consultant.user_id }}
          </option>
        </select>
      </label>

      <label class="space-y-1 text-slate-300">
        <span class="font-medium">Dal</span>
        <input
          v-model="fromDate"
          type="date"
          class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
        />
      </label>

      <label class="space-y-1 text-slate-300">
        <span class="font-medium">Al</span>
        <input
          v-model="toDate"
          type="date"
          class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
        />
      </label>

      <CustomerPicker
        v-model="selectedCustomerId"
        label="Cliente"
        placeholder="Filtra cliente"
        helper="Ricerca nella base anagrafica"
      />

      <div class="flex items-end gap-2">
        <label class="flex items-center gap-2 text-slate-200">
          <input type="checkbox" v-model="globalView" class="h-4 w-4 rounded border-white/10 bg-white/5" />
          <span class="text-sm">Mostra agenda globale</span>
        </label>
        <button
          class="ml-auto rounded-lg border border-white/10 px-3 py-1.5 text-sm text-slate-200 hover:bg-white/10"
          @click="reload"
        >Aggiorna</button>
      </div>
    </div>

    <div v-if="appointments.loading" class="rounded-lg border border-white/10 bg-slate-900/60 p-6 text-center text-sm text-slate-300">
      Caricamento appuntamenti...
    </div>
    <div v-else-if="appointments.error" class="rounded-lg border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
      {{ appointments.error }}
    </div>
    <div v-else>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-white/10 text-sm">
          <thead class="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th class="px-3 py-2 text-left">Data</th>
              <th class="px-3 py-2 text-left">Cliente</th>
              <th class="px-3 py-2 text-left">Tipo</th>
              <th class="px-3 py-2 text-center">Durata</th>
              <th class="px-3 py-2 text-right">VSS</th>
              <th class="px-3 py-2 text-right">VSD</th>
              <th class="px-3 py-2 text-center">Telefonate</th>
              <th class="px-3 py-2 text-center">App fissati</th>
              <th class="px-3 py-2 text-right">Azioni</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5 text-slate-200">
            <tr v-if="!appointments.items.length">
              <td class="px-3 py-4 text-center text-sm text-slate-400" colspan="9">Nessun appuntamento trovato.</td>
            </tr>
            <tr v-for="item in appointments.items" :key="item.id">
              <td class="px-3 py-2 align-top text-slate-100">
                <div>{{ formatDate(item.start_at) }}</div>
                <div class="text-xs text-slate-400">{{ formatTimeRange(item.start_at, item.end_at) }}</div>
              </td>
              <td class="px-3 py-2 align-top">
                <div class="font-medium">{{ item.client_name }}</div>
                <RouterLink
                  v-if="item.customer_id"
                  class="text-xs text-cyan-300 hover:text-cyan-200"
                  :to="{ path: '/anagrafiche/clienti', query: { focus: item.customer_id } }"
                >Apri scheda</RouterLink>
              </td>
              <td class="px-3 py-2 align-top capitalize">{{ labels[item.appointment_type] || item.appointment_type }}</td>
              <td class="px-3 py-2 align-top text-center">{{ item.duration_minutes }}'</td>
              <td class="px-3 py-2 align-top text-right">{{ formatNumber(item.vss) }}</td>
              <td class="px-3 py-2 align-top text-right">
                <div>{{ formatNumber(item.vsd_personal + item.vsd_indiretto) }}</div>
                <div class="text-xs text-slate-400">Pers {{ formatNumber(item.vsd_personal) }} / Ind {{ formatNumber(item.vsd_indiretto) }}</div>
              </td>
              <td class="px-3 py-2 align-top text-center">{{ item.telefonate }}</td>
              <td class="px-3 py-2 align-top text-center">{{ item.app_fissati }}</td>
              <td class="px-3 py-2 align-top text-right space-y-1">
                <button
                  class="rounded border border-white/10 px-2 py-1 text-xs text-slate-200 hover:bg-white/10"
                  @click="remove(item.id)"
                >Elimina</button>
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
            <h3 class="text-lg font-semibold text-slate-100">Nuovo appuntamento</h3>
            <button class="ml-auto text-slate-400 hover:text-slate-100" @click="closeModal">✕</button>
          </div>
          <form class="mt-4 grid gap-4" @submit.prevent="saveModal">
            <div class="grid gap-4 md:grid-cols-2">
              <label class="space-y-1">
                <span class="text-slate-300">Data e ora</span>
                <input v-model="modal.data.start_at" type="datetime-local" required class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100" />
              </label>
              <label class="space-y-1">
                <span class="text-slate-300">Durata (minuti)</span>
                <input v-model.number="modal.data.duration_minutes" type="number" min="15" step="15" class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100" />
              </label>
              <label class="space-y-1">
                <span class="text-slate-300">Tipo appuntamento</span>
                <select v-model="modal.data.appointment_type" class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100">
                  <option value="manuale">Manuale</option>
                  <option value="telefonata">Telefonata</option>
                  <option value="incontro">Incontro</option>
                  <option value="vendita">Vendita</option>
                  <option value="mezza">Mezza giornata</option>
                  <option value="giornata">Giornata</option>
                  <option value="formazione">Formazione</option>
                  <option value="mbs">MBS</option>
                  <option value="sottoprodotti">Sottoprodotti</option>
                </select>
              </label>
              <CustomerPicker
                v-model="modal.data.customer_id"
                label="Cliente"
                placeholder="Seleziona cliente"
                helper="Deriva dall'anagrafica clienti"
                :disabled="modal.saving"
              />
            </div>

            <div class="grid gap-4 md:grid-cols-3">
              <label class="space-y-1">
                <span class="text-slate-300">VSS</span>
                <input v-model.number="modal.data.vss" type="number" step="0.1" class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100" />
              </label>
              <label class="space-y-1">
                <span class="text-slate-300">VSD personale</span>
                <input v-model.number="modal.data.vsd_personal" type="number" step="0.1" class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100" />
              </label>
              <label class="space-y-1">
                <span class="text-slate-300">VSD indiretto</span>
                <input v-model.number="modal.data.vsd_indiretto" type="number" step="0.1" class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100" />
              </label>
            </div>

            <div class="grid gap-4 md:grid-cols-3">
              <label class="space-y-1">
                <span class="text-slate-300">Telefonate</span>
                <input v-model.number="modal.data.telefonate" type="number" min="0" class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100" />
              </label>
              <label class="space-y-1">
                <span class="text-slate-300">Appuntamenti fissati</span>
                <input v-model.number="modal.data.app_fissati" type="number" min="0" class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100" />
              </label>
              <label class="space-y-1 flex items-center gap-2 text-slate-300">
                <input v-model="modal.data.nncf" type="checkbox" class="h-4 w-4 rounded border-white/10 bg-white/5" />
                <span>NNCF</span>
              </label>
            </div>

            <label class="space-y-1">
              <span class="text-slate-300">Note</span>
              <textarea v-model="modal.data.notes" rows="3" class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"></textarea>
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
import CustomerPicker from './CustomerPicker.vue';
import { RouterLink } from 'vue-router';

const store = useBpStore();
const { appointments, consultants } = storeToRefs(store);

const selectedUserId = ref(0);
const globalView = ref(false);
const fromDate = ref('');
const toDate = ref('');
const selectedCustomerId = ref<number | null>(null);

const modal = reactive({
  open: false,
  saving: false,
  error: '',
  data: {
    start_at: defaultStart(),
    duration_minutes: 90,
    appointment_type: 'manuale',
    customer_id: null as number | null,
    notes: '',
    vss: 0,
    vsd_personal: 0,
    vsd_indiretto: 0,
    telefonate: 0,
    app_fissati: 0,
    nncf: false
  }
});

function defaultStart() {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  return now.toISOString().slice(0, 16);
}

function openModal() {
  modal.open = true;
  modal.error = '';
  modal.data = {
    start_at: defaultStart(),
    duration_minutes: 90,
    appointment_type: 'manuale',
    customer_id: selectedCustomerId.value,
    notes: '',
    vss: 0,
    vsd_personal: 0,
    vsd_indiretto: 0,
    telefonate: 0,
    app_fissati: 0,
    nncf: false
  };
}

function closeModal() {
  modal.open = false;
  modal.error = '';
}

async function saveModal() {
  if (!modal.data.customer_id) {
    modal.error = 'Seleziona un cliente esistente dalle anagrafiche';
    return;
  }
  modal.saving = true;
  modal.error = '';
  try {
    await store.createAppointment({
      start_at: modal.data.start_at,
      duration_minutes: modal.data.duration_minutes,
      appointment_type: modal.data.appointment_type,
      customer_id: modal.data.customer_id,
      notes: modal.data.notes,
      vss: modal.data.vss,
      vsd_personal: modal.data.vsd_personal,
      vsd_indiretto: modal.data.vsd_indiretto,
      telefonate: modal.data.telefonate,
      app_fissati: modal.data.app_fissati,
      nncf: modal.data.nncf
    });
    closeModal();
  } catch (error: any) {
    modal.error = error?.response?.data?.error || error?.message || 'Errore salvataggio appuntamento';
  } finally {
    modal.saving = false;
  }
}

async function remove(id: string) {
  if (!confirm('Eliminare definitivamente questo appuntamento?')) return;
  await store.removeAppointment(id);
}

function reload() {
  const overrides: any = {
    global: globalView.value,
    userId: selectedUserId.value > 0 ? selectedUserId.value : undefined,
    customerId: selectedCustomerId.value || undefined,
    from: fromDate.value || undefined,
    to: toDate.value || undefined,
    offset: 0
  };
  if (selectedUserId.value === 0 && !globalView.value) {
    overrides.userId = undefined;
  }
  store.loadAppointments(overrides);
}

watch(selectedUserId, (value) => {
  if (value === 0 && !globalView.value) {
    store.loadAppointments({ userId: undefined, offset: 0 });
  } else if (value === -1) {
    store.loadAppointments({ global: true, userId: undefined, offset: 0 });
  } else {
    store.loadAppointments({ userId: value > 0 ? value : undefined, offset: 0 });
  }
});

watch(globalView, (value) => {
  store.loadAppointments({ global: value, offset: 0 });
  if (!value && selectedUserId.value === -1) {
    selectedUserId.value = 0;
  }
});

watch([fromDate, toDate], () => {
  reload();
});

watch(selectedCustomerId, () => {
  reload();
});

onMounted(async () => {
  await store.loadConsultants().catch(() => undefined);
  await store.loadAppointments();
});

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

function formatDate(value: string) {
  return new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

function formatTimeRange(start: string, end: string) {
  const opts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
  const startFmt = new Intl.DateTimeFormat('it-IT', opts).format(new Date(start));
  const endFmt = end ? new Intl.DateTimeFormat('it-IT', opts).format(new Date(end)) : '';
  return endFmt ? ${startFmt} -  : startFmt;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 }).format(value || 0);
}
</script>

