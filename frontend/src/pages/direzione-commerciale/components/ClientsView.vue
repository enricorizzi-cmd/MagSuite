<template>
  <section class="space-y-6">
    <header class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 class="text-xl font-semibold text-slate-100">Clienti monitorati</h2>
        <p class="text-sm text-slate-400">Stato BP collegato alle anagrafiche MagSuite.</p>
      </div>
      <button
        class="self-start rounded-lg border border-cyan-400/60 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-100 shadow hover:bg-cyan-400/20"
        @click="openModal"
      >Collega cliente anagrafiche</button>
    </header>

    <div class="flex flex-wrap items-end gap-3 text-sm">
      <label class="flex flex-col gap-1 text-slate-300">
        <span class="font-medium">Ricerca</span>
        <input v-model="search" type="text" placeholder="Nome o codice" class="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100" />
      </label>
      <label class="flex flex-col gap-1 text-slate-300">
        <span class="font-medium">Consulente</span>
        <select v-model.number="selectedConsultant" class="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100">
          <option :value="0">Tutti</option>
          <option v-for="item in consultants" :key="item.user_id" :value="item.user_id">Utente #{{ item.user_id }}</option>
        </select>
      </label>
      <button class="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 hover:bg-white/10" @click="reload">Aggiorna</button>
    </div>

    <div v-if="clients.loading" class="rounded-lg border border-white/10 bg-slate-900/60 p-6 text-center text-sm text-slate-300">
      Caricamento clienti...
    </div>
    <div v-else-if="clients.error" class="rounded-lg border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
      {{ clients.error }}
    </div>
    <div v-else>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-white/10 text-sm">
          <thead class="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th class="px-3 py-2 text-left">Cliente</th>
              <th class="px-3 py-2 text-left">Stato BP</th>
              <th class="px-3 py-2 text-left">Consulente</th>
              <th class="px-3 py-2 text-left">Ultimo appuntamento</th>
              <th class="px-3 py-2 text-right">Azioni</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5 text-slate-200">
            <tr v-if="!clients.items.length">
              <td class="px-3 py-4 text-center text-sm text-slate-400" colspan="5">Nessun cliente collegato.
              </td>
            </tr>
            <tr v-for="item in clients.items" :key="item.id">
              <td class="px-3 py-3">
                <div class="font-medium">{{ item.name }}</div>
                <div class="text-xs text-slate-400 flex gap-2">
                  <span v-if="item.customer_code">Codice {{ item.customer_code }}</span>
                  <span v-if="item.customer_email">{{ item.customer_email }}</span>
                  <span v-if="item.customer_phone">{{ item.customer_phone }}</span>
                </div>
              </td>
              <td class="px-3 py-3">
                <select
                  v-model="statusDraft[item.id]"
                  class="rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-100"
                  @change="updateStatus(item)"
                >
                  <option value="lead">Lead</option>
                  <option value="lead non chiuso">Lead non chiuso</option>
                  <option value="potenziale">Potenziale</option>
                  <option value="attivo">Attivo</option>
                  <option value="on hold">On hold</option>
                  <option value="churn">Churn</option>
                </select>
              </td>
              <td class="px-3 py-3 text-sm">
                <span v-if="item.consultant_id">Utente #{{ item.consultant_id }}</span>
                <span v-else class="text-slate-400">Non assegnato</span>
              </td>
              <td class="px-3 py-3 text-sm">{{ item.last_appointment_at ? formatDate(item.last_appointment_at) : '-' }}</td>
              <td class="px-3 py-3 text-right space-y-1">
                <RouterLink
                  class="block rounded border border-white/10 px-2 py-1 text-xs text-cyan-200 hover:bg-white/10"
                  :to="{ path: '/anagrafiche/clienti', query: { focus: item.customer_id } }"
                >Apri scheda</RouterLink>
                <button
                  class="block w-full rounded border border-white/10 px-2 py-1 text-xs text-rose-200 hover:bg-rose-500/20"
                  @click="unlink(item)"
                >Scollega</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <transition name="fade">
      <div v-if="modal.open" class="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-4">
        <div class="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-950/95 p-6 text-sm text-slate-200">
          <div class="flex items-center gap-3">
            <h3 class="text-lg font-semibold text-slate-100">Collega cliente</h3>
            <button class="ml-auto text-slate-400 hover:text-slate-100" @click="closeModal">✕</button>
          </div>
          <form class="mt-4 space-y-4" @submit.prevent="saveModal">
            <CustomerPicker
              v-model="modal.data.customer_id"
              label="Cliente anagrafiche"
              helper="La ricerca avviene sugli stessi dati di MagSuite"
              :disabled="modal.saving"
            />

            <label class="block space-y-1 text-slate-300">
              <span class="font-medium">Stato BP</span>
              <select v-model="modal.data.status" class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100">
                <option value="lead">Lead</option>
                <option value="lead non chiuso">Lead non chiuso</option>
                <option value="potenziale">Potenziale</option>
                <option value="attivo">Attivo</option>
                <option value="on hold">On hold</option>
                <option value="churn">Churn</option>
              </select>
            </label>

            <div v-if="modal.error" class="rounded border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{{ modal.error }}</div>

            <div class="flex justify-end gap-2">
              <button type="button" class="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 hover:bg-white/10" @click="closeModal">Annulla</button>
              <button
                type="submit"
                class="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-900 shadow hover:bg-cyan-400 disabled:opacity-60"
                :disabled="modal.saving"
              >{{ modal.saving ? 'Collegamento...' : 'Collega' }}</button>
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
const { clients, consultants } = storeToRefs(store);

const search = ref('');
const selectedConsultant = ref(0);
const statusDraft = reactive<Record<string, string>>({});

const modal = reactive({
  open: false,
  saving: false,
  error: '',
  data: {
    customer_id: null as number | null,
    status: 'lead'
  }
});

function openModal() {
  modal.open = true;
  modal.error = '';
  modal.data = { customer_id: null, status: 'lead' };
}

function closeModal() {
  modal.open = false;
  modal.error = '';
}

async function saveModal() {
  if (!modal.data.customer_id) {
    modal.error = 'Seleziona un cliente dalle anagrafiche';
    return;
  }
  modal.saving = true;
  modal.error = '';
  try {
    await store.createClient({ customer_id: modal.data.customer_id, status: modal.data.status });
    closeModal();
  } catch (error: any) {
    modal.error = error?.response?.data?.error || error?.message || 'Errore collegamento cliente';
  } finally {
    modal.saving = false;
  }
}

async function updateStatus(item: BPClient) {
  const status = statusDraft[item.id];
  if (status === item.status) return;
  await store.createClient({ customer_id: item.customer_id, status });
}

async function unlink(item: BPClient) {
  if (!confirm('Scollegare dal modulo BP?')) return;
  await store.removeClient(item.id);
}

function reload() {
  store.loadClients({
    search: search.value,
    consultantId: selectedConsultant.value || undefined,
    offset: 0
  });
}

watch(search, () => {
  const handler = () => reload();
  const timeout = setTimeout(handler, 250);
  return () => clearTimeout(timeout);
});

watch(selectedConsultant, () => reload());

onMounted(async () => {
  await store.loadConsultants().catch(() => undefined);
  await store.loadClients();
  clients.value.items.forEach((item) => {
    statusDraft[item.id] = item.status;
  });
});

watch(() => clients.value.items, (items) => {
  items.forEach((item) => {
    statusDraft[item.id] = item.status;
  });
});

function formatDate(value: string) {
  return new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}
</script>


