<template>
  <div>
    <Topbar />
    <main class="max-w-6xl mx-auto px-4 py-6">
      <h1 class="text-xl font-semibold mb-2">Clienti</h1>
      <p class="text-slate-400 mb-4">Anagrafica clienti (fino a 100 risultati).</p>

      <div v-if="loading" class="text-slate-400">Caricamento...</div>
      <div v-else-if="error" class="text-rose-400">{{ error }}</div>
      <div v-else>
        <div class="flex items-center mb-3">
          <div class="text-slate-400 text-sm">Totale: {{ total }}</div>
          <div class="ml-auto flex gap-2">
            <button class="px-3 py-1.5 rounded-lg text-sm bg-white/10 hover:bg-white/20 text-slate-200" @click="exportCustomers('csv')">Export CSV</button>
            <button class="px-3 py-1.5 rounded-lg text-sm bg-white/10 hover:bg-white/20 text-slate-200" @click="exportCustomers('xlsx')">Export XLSX</button>
          </div>
        </div>

        <ListFiltersTable
          :items="items"
          :fields="customerFields"
          new-label="Nuovo cliente"
          @new="openCreate"
          @edit="openEdit"
        />

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

        <transition name="fade">
          <div v-if="modal.open" class="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div class="w-full max-w-3xl bg-[#0b1020] border border-white/10 rounded-xl p-4 overflow-y-auto max-h-[90vh]">
              <div class="flex items-center mb-3">
                <h2 class="text-lg font-semibold">{{ modal.mode==='create' ? 'Nuovo cliente' : 'Modifica cliente' }}</h2>
                <button class="ml-auto p-2 rounded hover:bg-white/10" @click="closeModal" aria-label="Chiudi">&times;</button>
              </div>
              <div class="grid gap-3">
                <div class="grid gap-3 sm:grid-cols-2">
                  <label class="text-sm text-slate-300">Codice
                    <input v-model="form.code" type="text" class="mt-1 w-full bg-white/10 border border-white/10 rounded px-2 py-1.5 text-sm text-slate-200" />
                  </label>
                  <label class="text-sm text-slate-300">Nome
                    <input v-model="form.name" type="text" class="mt-1 w-full bg-white/10 border border-white/10 rounded px-2 py-1.5 text-sm text-slate-200" />
                  </label>
                  <label class="text-sm text-slate-300">Partita IVA
                    <input v-model="form.vat_number" type="text" class="mt-1 w-full bg-white/10 border border-white/10 rounded px-2 py-1.5 text-sm text-slate-200" />
                  </label>
                  <label class="text-sm text-slate-300">Codice fiscale
                    <input v-model="form.tax_code" type="text" class="mt-1 w-full bg-white/10 border border-white/10 rounded px-2 py-1.5 text-sm text-slate-200" />
                  </label>
                  <label class="text-sm text-slate-300">Email
                    <input v-model="form.email" type="email" class="mt-1 w-full bg-white/10 border border-white/10 rounded px-2 py-1.5 text-sm text-slate-200" />
                  </label>
                  <label class="text-sm text-slate-300">Telefono
                    <input v-model="form.phone" type="text" class="mt-1 w-full bg-white/10 border border-white/10 rounded px-2 py-1.5 text-sm text-slate-200" />
                  </label>
                  <label class="text-sm text-slate-300">Indirizzo
                    <input v-model="form.address" type="text" class="mt-1 w-full bg-white/10 border border-white/10 rounded px-2 py-1.5 text-sm text-slate-200" />
                  </label>
                  <label class="text-sm text-slate-300">Citta
                    <input v-model="form.city" type="text" class="mt-1 w-full bg-white/10 border border-white/10 rounded px-2 py-1.5 text-sm text-slate-200" />
                  </label>
                  <label class="text-sm text-slate-300">Provincia
                    <input v-model="form.province" type="text" class="mt-1 w-full bg-white/10 border border-white/10 rounded px-2 py-1.5 text-sm text-slate-200" />
                  </label>
                  <label class="text-sm text-slate-300">CAP
                    <input v-model="form.postal_code" type="text" class="mt-1 w-full bg-white/10 border border-white/10 rounded px-2 py-1.5 text-sm text-slate-200" />
                  </label>
                  <label class="text-sm text-slate-300">Paese
                    <input v-model="form.country" type="text" class="mt-1 w-full bg-white/10 border border-white/10 rounded px-2 py-1.5 text-sm text-slate-200" />
                  </label>
                  <label class="text-sm text-slate-300">Termini di pagamento
                    <input v-model="form.payment_terms" type="text" class="mt-1 w-full bg-white/10 border border-white/10 rounded px-2 py-1.5 text-sm text-slate-200" />
                  </label>
                  <label class="text-sm text-slate-300">Listino
                    <input v-model="form.price_list" type="text" class="mt-1 w-full bg-white/10 border border-white/10 rounded px-2 py-1.5 text-sm text-slate-200" />
                  </label>
                  <label class="text-sm text-slate-300">Agente
                    <input v-model="form.agent" type="text" class="mt-1 w-full bg-white/10 border border-white/10 rounded px-2 py-1.5 text-sm text-slate-200" />
                  </label>
                  <label class="text-sm text-slate-300">Classificatore A
                    <input v-model="form.classifier_a" type="text" class="mt-1 w-full bg-white/10 border border-white/10 rounded px-2 py-1.5 text-sm text-slate-200" />
                  </label>
                  <label class="text-sm text-slate-300">Classificatore B
                    <input v-model="form.classifier_b" type="text" class="mt-1 w-full bg-white/10 border border-white/10 rounded px-2 py-1.5 text-sm text-slate-200" />
                  </label>
                  <label class="text-sm text-slate-300">Classificatore C
                    <input v-model="form.classifier_c" type="text" class="mt-1 w-full bg-white/10 border border-white/10 rounded px-2 py-1.5 text-sm text-slate-200" />
                  </label>
                </div>
                <label class="text-sm text-slate-300">Note
                  <textarea v-model="form.notes" rows="3" class="mt-1 w-full bg-white/10 border border-white/10 rounded px-2 py-1.5 text-sm text-slate-200"></textarea>
                </label>
              </div>
              <div v-if="modal.error" class="mt-2 text-sm text-rose-400">{{ modal.error }}</div>
              <div class="mt-4 flex items-center gap-2">
                <button
                  class="px-3 py-1.5 rounded-lg text-sm bg-white/10 hover:bg-white/20 text-slate-200 disabled:opacity-60"
                  :disabled="modal.saving || modal.deleting"
                  @click="closeModal"
                >Annulla</button>
                <button
                  v-if="modal.mode==='edit' && modal.id"
                  type="button"
                  class="ml-auto px-3 py-1.5 rounded-lg text-sm border border-rose-500/40 text-rose-300 hover:bg-rose-500/10 disabled:opacity-60"
                  :disabled="modal.saving || modal.deleting"
                  @click="deleteCustomer"
                >
                  <span v-if="modal.deleting">Eliminazione…</span>
                  <span v-else>Elimina cliente</span>
                </button>
                <button
                  class="px-3 py-1.5 rounded-lg text-sm bg-fuchsia-600 hover:bg-fuchsia-500 text-white disabled:opacity-60"
                  :class="modal.mode==='edit' && modal.id ? '' : 'ml-auto'"
                  :disabled="modal.saving || modal.deleting"
                  @click="saveModal"
                >
                  <span v-if="modal.saving">Salvataggio…</span>
                  <span v-else>Salva</span>
                </button>
              </div>
            </div>
          </div>
        </transition>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import Topbar from '../../components/Topbar.vue';
import ListFiltersTable from '../../components/ListFiltersTable.vue';
import api from '../../services/api';

type Customer = {
  id: number;
  code: string;
  name: string;
  vat_number: string | null;
  tax_code: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  country: string | null;
  payment_terms: string | null;
  price_list: string | null;
  agent: string | null;
  classifier_a: string | null;
  classifier_b: string | null;
  classifier_c: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type CustomerForm = {
  code: string;
  name: string;
  vat_number: string;
  tax_code: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;
  payment_terms: string;
  price_list: string;
  agent: string;
  classifier_a: string;
  classifier_b: string;
  classifier_c: string;
  notes: string;
};

const emptyForm = (): CustomerForm => ({
  code: '',
  name: '',
  vat_number: '',
  tax_code: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  province: '',
  postal_code: '',
  country: '',
  payment_terms: '',
  price_list: '',
  agent: '',
  classifier_a: '',
  classifier_b: '',
  classifier_c: '',
  notes: '',
});

const items = ref<Customer[]>([]);
const loading = ref(false);
const error = ref('');
const page = ref(1);
const limit = ref(20);
const total = ref(0);
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit.value)));

const customerFields = [
  { key: 'id', label: 'ID', type: 'number' },
  { key: 'code', label: 'Codice', type: 'string' },
  { key: 'name', label: 'Nome', type: 'string' },
  { key: 'vat_number', label: 'Partita IVA', type: 'string' },
  { key: 'tax_code', label: 'Codice fiscale', type: 'string' },
  { key: 'email', label: 'Email', type: 'string' },
  { key: 'phone', label: 'Telefono', type: 'string' },
  { key: 'address', label: 'Indirizzo', type: 'string' },
  { key: 'city', label: 'Citta', type: 'string' },
  { key: 'province', label: 'Provincia', type: 'string' },
  { key: 'postal_code', label: 'CAP', type: 'string' },
  { key: 'country', label: 'Paese', type: 'string' },
  { key: 'payment_terms', label: 'Termini di pagamento', type: 'string' },
  { key: 'price_list', label: 'Listino', type: 'string' },
  { key: 'agent', label: 'Agente', type: 'string' },
  { key: 'classifier_a', label: 'Classificatore A', type: 'string' },
  { key: 'classifier_b', label: 'Classificatore B', type: 'string' },
  { key: 'classifier_c', label: 'Classificatore C', type: 'string' },
  { key: 'notes', label: 'Note', type: 'string' },
  { key: 'created_at', label: 'Creato il', type: 'string' },
  { key: 'updated_at', label: 'Aggiornato il', type: 'string' },
];

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const { data } = await api.get('/customers', { params: { page: page.value, limit: limit.value } });
    items.value = data?.items || [];
    total.value = typeof data?.total === 'number' ? data.total : 0;
  } catch (e: any) {
    error.value = e?.response?.data?.error || e?.message || 'Errore caricamento';
  } finally {
    loading.value = false;
  }
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

async function exportCustomers(format: 'csv'|'xlsx') {
  try {
    const res = await api.get(`/customers/export`, { params: { format }, responseType: 'blob' });
    const blob = new Blob([res.data], { type: res.headers['content-type'] || (format==='xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv') });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clienti.${format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (e: any) {
    alert(e?.response?.data?.error || e?.message || 'Errore export');
  }
}

const modal = ref<{ open: boolean; mode: 'create'|'edit'; id?: number|null; saving: boolean; deleting: boolean; error: string }>({ open: false, mode: 'create', id: null, saving: false, deleting: false, error: '' });
const form = ref<CustomerForm>(emptyForm());

function openCreate() {
  modal.value = { open: true, mode: 'create', id: null, saving: false, deleting: false, error: '' };
  form.value = emptyForm();
}
function openEdit(row: Customer) {
  modal.value = { open: true, mode: 'edit', id: row.id, saving: false, deleting: false, error: '' };
  form.value = {
    code: row.code || '',
    name: row.name || '',
    vat_number: row.vat_number || '',
    tax_code: row.tax_code || '',
    email: row.email || '',
    phone: row.phone || '',
    address: row.address || '',
    city: row.city || '',
    province: row.province || '',
    postal_code: row.postal_code || '',
    country: row.country || '',
    payment_terms: row.payment_terms || '',
    price_list: row.price_list || '',
    agent: row.agent || '',
    classifier_a: row.classifier_a || '',
    classifier_b: row.classifier_b || '',
    classifier_c: row.classifier_c || '',
    notes: row.notes || '',
  };
}
function closeModal() {
  modal.value.open = false;
}

function trimmedPayload() {
  const payload: Record<string, string> = {};
  (Object.keys(form.value) as Array<keyof CustomerForm>).forEach((key) => {
    const raw = form.value[key];
    payload[key] = typeof raw === 'string' ? raw.trim() : '';
  });
  return payload;
}

async function saveModal() {
  if (modal.value.deleting) return;
  try {
    modal.value.saving = true;
    modal.value.error = '';
    const payload = trimmedPayload();
    if (!payload.code) {
      modal.value.error = 'Codice obbligatorio';
      modal.value.saving = false;
      return;
    }
    if (!payload.name) {
      modal.value.error = 'Nome obbligatorio';
      modal.value.saving = false;
      return;
    }
    if (modal.value.mode === 'create') {
      await api.post('/customers', payload);
    } else if (modal.value.mode === 'edit' && modal.value.id) {
      await api.put(`/customers/${modal.value.id}`, payload);
    }
    modal.value.open = false;
    await load();
  } catch (e: any) {
    modal.value.error = e?.response?.data?.error || e?.message || 'Errore salvataggio';
  } finally {
    modal.value.saving = false;
  }
}

async function deleteCustomer() {
  if (modal.value.deleting) return;
  if (!modal.value.id) return;
  if (!confirm('Eliminare definitivamente questo cliente?')) return;
  modal.value.deleting = true;
  modal.value.error = '';
  try {
    await api.delete(`/customers/${modal.value.id}`);
    modal.value.open = false;
    await load();
  } catch (e: any) {
    modal.value.error = e?.response?.data?.error || e?.message || 'Errore eliminazione cliente';
  } finally {
    modal.value.deleting = false;
  }
}

</script>

<style scoped></style>
