<template>
  <section class="space-y-6">
    <header class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 class="text-xl font-semibold text-slate-100">Vendite & GI</h2>
        <p class="text-sm text-slate-400">Registrazione risultati economici collegati agli appuntamenti.</p>
      </div>
      <button
        class="self-start rounded-lg border border-cyan-400/60 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-100 shadow hover:bg-cyan-400/20"
        @click="openModal"
      >Nuova vendita</button>
    </header>

    <div class="grid gap-3 md:grid-cols-5 text-sm">
      <label class="space-y-1 text-slate-300">
        <span class="font-medium">Consulente</span>
        <select v-model.number="selectedConsultant" class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100">
          <option :value="0">Tutti</option>
          <option v-for="item in consultants" :key="item.user_id" :value="item.user_id">Utente #{{ item.user_id }}</option>
        </select>
      </label>
      <label class="space-y-1 text-slate-300">
        <span class="font-medium">Dal</span>
        <input v-model="fromDate" type="date" class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100" />
      </label>
      <label class="space-y-1 text-slate-300">
        <span class="font-medium">Al</span>
        <input v-model="toDate" type="date" class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100" />
      </label>
      <CustomerPicker
        v-model="selectedCustomer"
        label="Cliente"
        placeholder="Filtra cliente"
      />
      <div class="flex items-end">
        <button class="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 hover:bg-white/10" @click="reload">Aggiorna</button>
      </div>
    </div>

    <div v-if="sales.loading" class="rounded-lg border border-white/10 bg-slate-900/60 p-6 text-center text-sm text-slate-300">
      Caricamento vendite...
    </div>
    <div v-else-if="sales.error" class="rounded-lg border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
      {{ sales.error }}
    </div>
    <div v-else>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-white/10 text-sm">
          <thead class="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th class="px-3 py-2 text-left">Data</th>
              <th class="px-3 py-2 text-left">Cliente</th>
              <th class="px-3 py-2 text-left">Servizi</th>
              <th class="px-3 py-2 text-right">VSS totale</th>
              <th class="px-3 py-2 text-left">Schedule</th>
              <th class="px-3 py-2 text-right">Azioni</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5 text-slate-200">
            <tr v-if="!sales.items.length">
              <td class="px-3 py-4 text-center text-sm text-slate-400" colspan="6">Nessuna vendita registrata.</td>
            </tr>
            <tr v-for="item in sales.items" :key="item.id">
              <td class="px-3 py-3">{{ formatDate(item.sale_date) }}</td>
              <td class="px-3 py-3">
                <div class="font-medium">{{ item.client_name || '-' }}</div>
                <RouterLink
                  v-if="item.customer_id"
                  class="text-xs text-cyan-200 hover:text-cyan-100"
                  :to="{ path: '/anagrafiche/clienti', query: { focus: item.customer_id } }"
                >Apri scheda</RouterLink>
              </td>
              <td class="px-3 py-3 text-sm text-slate-300">
                <pre class="whitespace-pre-wrap break-words">{{ item.services || '-' }}</pre>
              </td>
              <td class="px-3 py-3 text-right font-semibold">{{ formatCurrency(item.vss_total) }}</td>
              <td class="px-3 py-3 text-xs text-slate-300">
                <ul class="space-y-1" v-if="Array.isArray(item.schedule) && item.schedule.length">
                  <li v-for="(row, idx) in item.schedule" :key="idx" class="flex justify-between gap-3">
                    <span>{{ row.dueDate ? formatDate(row.dueDate) : '-' }}</span>
                    <span>{{ formatCurrency(row.amount) }}</span>
                  </li>
                </ul>
                <span v-else>-</span>
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
            <h3 class="text-lg font-semibold text-slate-100">Registra vendita</h3>
            <button class="ml-auto text-slate-400 hover:text-slate-100" @click="closeModal">✕</button>
          </div>
          <form class="mt-4 space-y-4" @submit.prevent="saveModal">
            <div class="grid gap-4 md:grid-cols-2">
              <label class="space-y-1">
                <span class="text-slate-300">Data vendita</span>
                <input v-model="modal.data.sale_date" type="date" required class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100" />
              </label>
              <label class="space-y-1">
                <span class="text-slate-300">VSS totale</span>
                <input v-model.number="modal.data.vss_total" type="number" step="0.1" min="0" class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100" />
              </label>
            </div>

            <CustomerPicker
              v-model="modal.data.customer_id"
              label="Cliente"
              helper="Obbligatorio: seleziona dalla base clienti"
              :disabled="modal.saving"
            />

            <label class="space-y-1">
              <span class="text-slate-300">Servizi / note</span>
              <textarea v-model="modal.data.services" rows="3" class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"></textarea>
            </label>

            <label class="space-y-1">
              <span class="text-slate-300">Schedule pagamenti (JSON)</span>
              <textarea v-model="modal.data.schedule" rows="4" class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-100" placeholder='[{"dueDate": "2025-01-15", "amount": 1200}]'></textarea>
            </label>

            <div v-if="modal.error" class="rounded border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{{ modal.error }}</div>

            <div class="flex justify-end gap-2">
              <button type="button" class="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 hover:bg-white/10" @click="closeModal">Annulla</button>
              <button
                type="submit"
                class="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-900 shadow hover:bg-cyan-400 disabled:opacity-60"
                :disabled="modal.saving"
              >{{ modal.saving ? 'Registrazione...' : 'Salva' }}</button>
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
import { RouterLink } from 'vue-router';
import { useBpStore } from '../../../stores/bp';
import CustomerPicker from './CustomerPicker.vue';

const store = useBpStore();
const { sales, consultants } = storeToRefs(store);

const selectedConsultant = ref(0);
const fromDate = ref('');
const toDate = ref('');
const selectedCustomer = ref<number | null>(null);

const modal = reactive({
  open: false,
  saving: false,
  error: '',
  data: {
    sale_date: new Date().toISOString().slice(0, 10),
    vss_total: 0,
    customer_id: null as number | null,
    services: '',
    schedule: ''
  }
});

function openModal() {
  modal.open = true;
  modal.error = '';
  modal.data = {
    sale_date: new Date().toISOString().slice(0, 10),
    vss_total: 0,
    customer_id: selectedCustomer.value,
    services: '',
    schedule: ''
  };
}

function closeModal() {
  modal.open = false;
  modal.error = '';
}

function parseSchedule(raw: string) {
  if (!raw.trim()) return [];
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error('Lo schedule deve essere una lista');
  return parsed.map((item) => ({
    dueDate: item.dueDate || item.due_date || null,
    amount: Number(item.amount) || 0,
    note: item.note || null
  }));
}

async function saveModal() {
  if (!modal.data.customer_id) {
    modal.error = 'Seleziona un cliente';
    return;
  }
  modal.saving = true;
  modal.error = '';
  try {
    const payload: any = {
      sale_date: modal.data.sale_date,
      customer_id: modal.data.customer_id,
      vss_total: modal.data.vss_total,
      services: modal.data.services,
      schedule: parseSchedule(modal.data.schedule)
    };
    if (selectedConsultant.value > 0) {
      payload.consultant_id = selectedConsultant.value;
    }
    await store.createSale(payload);
    closeModal();
  } catch (error: any) {
    modal.error = error?.message || 'Errore registrazione vendita';
  } finally {
    modal.saving = false;
  }
}

async function remove(id: string) {
  if (!confirm('Eliminare definitivamente la vendita?')) return;
  await store.removeSale(id);
}

function reload() {
  store.loadSales({
    consultantId: selectedConsultant.value || undefined,
    customerId: selectedCustomer.value || undefined,
    from: fromDate.value || undefined,
    to: toDate.value || undefined,
    offset: 0
  });
}

watch(selectedConsultant, () => reload());
watch([fromDate, toDate], () => reload());
watch(selectedCustomer, () => reload());

onMounted(async () => {
  await store.loadConsultants().catch(() => undefined);
  await store.loadSales();
});

function formatDate(value: string) {
  return new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(Number(value) || 0);
}
</script>

