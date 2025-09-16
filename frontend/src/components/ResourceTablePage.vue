<template>
  <div>
    <Topbar />
    <main class="max-w-7xl mx-auto px-4 py-6">
      <header class="mb-5 flex flex-wrap items-start gap-3">
        <div class="flex-1 min-w-[16rem]">
          <h1 class="text-xl font-semibold text-slate-100">{{ title }}</h1>
          <p class="text-sm text-slate-400 mt-1">{{ description }}</p>
        </div>
        <button
          v-if="hasEndpoint"
          class="px-3 py-1.5 rounded-lg text-sm border border-white/10 text-slate-200 hover:bg-white/10"
          :disabled="loading"
          @click="load"
        >Aggiorna</button>
      </header>

      <div v-if="error" class="mb-4 flex items-start gap-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
        <span>{{ error }}</span>
        <button class="ml-auto text-xs text-rose-100 underline hover:text-rose-50" @click="load">Riprova</button>
      </div>

      <div v-if="loading" class="text-slate-400">Caricamento…</div>
      <div v-else>
        <ListFiltersTable
          :items="rows"
          :fields="fields"
          :new-label="newLabel"
          :empty-label="emptyLabel || 'Nessun risultato.'"
          :page="page"
          :limit="limit"
          @new="openCreate"
          @edit="openEdit"
        />

        <div class="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-400">
          <div>Totale: {{ rows.length }} • Pagina {{ page }} di {{ totalPages }}</div>
          <div class="ml-auto flex items-center gap-2 text-slate-300">
            <button class="px-2 py-1 rounded border border-white/10 hover:bg-white/10" :disabled="page<=1" @click="prevPage">Indietro</button>
            <button class="px-2 py-1 rounded border border-white/10 hover:bg-white/10" :disabled="page>=totalPages" @click="nextPage">Avanti</button>
            <select v-model.number="limit" class="px-2 py-1 rounded bg-white/10 border border-white/10 text-sm text-slate-200">
              <option :value="20">20</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>
          </div>
        </div>
      </div>

      <transition name="fade">
        <div v-if="modal.open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div class="w-full max-w-3xl rounded-xl border border-white/10 bg-[#0b1020] p-5">
            <div class="mb-4 flex items-center gap-3">
              <h2 class="text-lg font-semibold text-slate-100">
                {{ modal.mode==='create' ? newLabel : 'Modifica record' }}
              </h2>
              <button class="ml-auto rounded-lg px-2 py-1 text-xl leading-none text-slate-300 hover:bg-white/10" @click="closeModal" aria-label="Chiudi">×</button>
            </div>
            <div class="grid gap-3 md:grid-cols-2">
              <template v-for="field in formSchema" :key="field.key">
                <div :class="field.colSpan===2 ? 'md:col-span-2 flex flex-col gap-1' : 'flex flex-col gap-1'">
                  <template v-if="field.input==='checkbox'">
                    <label class="inline-flex items-center gap-2 text-sm text-slate-300">
                      <input v-model="form[field.key]" type="checkbox" class="h-4 w-4 rounded border-white/20 bg-white/10" />
                      <span>{{ field.label }}</span>
                    </label>
                  </template>
                  <template v-else-if="field.input==='textarea'">
                    <label class="text-sm text-slate-300">{{ field.label }}
                      <textarea
                        v-model="form[field.key]"
                        rows="3"
                        class="mt-1 w-full rounded border border-white/10 bg-white/10 px-2 py-1.5 text-sm text-slate-200 placeholder:text-slate-500"
                        :placeholder="field.placeholder || ''"
                      ></textarea>
                    </label>
                  </template>
                  <template v-else-if="field.input==='select'">
                    <label class="text-sm text-slate-300">{{ field.label }}
                      <select
                        v-model="form[field.key]"
                        class="mt-1 w-full rounded border border-white/10 bg-white/10 px-2 py-1.5 text-sm text-slate-200"
                      >
                        <option value="">Seleziona…</option>
                        <option v-for="opt in field.options || []" :key="String(opt.value)" :value="opt.value">{{ opt.label }}</option>
                      </select>
                    </label>
                  </template>
                  <template v-else>
                    <label class="text-sm text-slate-300">{{ field.label }}
                      <input
                        v-model="form[field.key]"
                        :type="inputType(field.input)"
                        class="mt-1 w-full rounded border border-white/10 bg-white/10 px-2 py-1.5 text-sm text-slate-200 placeholder:text-slate-500"
                        :step="field.input==='currency' ? '0.01' : undefined"
                        :placeholder="field.placeholder || ''"
                      />
                    </label>
                  </template>
                  <p v-if="field.hint" class="text-xs text-slate-500">{{ field.hint }}</p>
                </div>
              </template>
            </div>
            <div v-if="modal.error" class="mt-3 text-sm text-rose-400">{{ modal.error }}</div>
            <div class="mt-4 flex items-center gap-2">
              <button class="px-3 py-1.5 rounded-lg text-sm bg-white/10 hover:bg-white/20 text-slate-200" @click="closeModal">Annulla</button>
              <button class="px-3 py-1.5 rounded-lg text-sm bg-fuchsia-600 hover:bg-fuchsia-500 text-white ml-auto" :disabled="modal.saving" @click="saveRecord">
                <span v-if="modal.saving">Salvataggio…</span>
                <span v-else>Salva</span>
              </button>
            </div>
          </div>
        </div>
      </transition>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import Topbar from './Topbar.vue';
import ListFiltersTable from './ListFiltersTable.vue';
import api from '../services/api';

type FieldType = 'string' | 'number' | 'boolean' | 'enum';
type ResourceField = { key: string; label: string; type: FieldType; align?: 'left' | 'right'; options?: Array<string | number> };

type FormInputType = 'text' | 'textarea' | 'number' | 'currency' | 'select' | 'checkbox' | 'date' | 'datetime';
type SelectOption = { value: string | number | boolean; label: string };
type FormField = { key: string; label: string; input: FormInputType; required?: boolean; options?: SelectOption[]; placeholder?: string; default?: any; colSpan?: 1 | 2; hint?: string };
type ModalState = { open: boolean; mode: 'create' | 'edit'; index: number; error: string; saving: boolean };

const props = defineProps<{
  title: string;
  description: string;
  newLabel: string;
  fields: ResourceField[];
  formSchema: FormField[];
  sampleData: Array<Record<string, any>>;
  endpoint?: string;
  idKey?: string;
  emptyLabel?: string;
  transformResponse?: (payload: any) => Array<Record<string, any>>;
}>();

const hasEndpoint = computed(() => typeof props.endpoint === 'string' && props.endpoint.length > 0);
const idKey = computed(() => props.idKey || 'id');

const rows = ref(normalizeRows(props.sampleData || []));
const loading = ref(false);
const error = ref('');
const page = ref(1);
const limit = ref(20);
const totalPages = computed(() => Math.max(1, Math.ceil(rows.value.length / limit.value)));

const modal = ref<ModalState>({ open: false, mode: 'create', index: -1, error: '', saving: false });
const form = ref<Record<string, any>>(buildEmptyForm());

watch([() => rows.value.length, limit], () => {
  const max = Math.max(1, Math.ceil(rows.value.length / limit.value));
  if (page.value > max) page.value = max;
});

watch(() => props.sampleData, (next) => {
  if (!loading.value) {
    rows.value = normalizeRows(next || []);
  }
}, { deep: true });

function normalizeRows(list: Array<Record<string, any>>) {
  const key = idKey.value;
  return (list || []).map((row, idx) => {
    const value = row?.[key];
    if (value !== undefined && value !== null && String(value) !== '') return { ...row };
    return { ...row, [key]: `tmp-${idx + 1}-${Math.random().toString(36).slice(2, 8)}` };
  });
}

function buildEmptyForm() {
  const data: Record<string, any> = {};
  for (const field of props.formSchema) {
    if (field.default !== undefined) {
      data[field.key] = cloneDefault(field.default);
    } else if (field.input === 'checkbox') {
      data[field.key] = false;
    } else {
      data[field.key] = '';
    }
  }
  return data;
}

function cloneDefault(value: any) {
  if (Array.isArray(value)) return value.slice();
  if (value && typeof value === 'object') return JSON.parse(JSON.stringify(value));
  return value;
}

function inputType(input: FormInputType) {
  if (input === 'currency') return 'number';
  if (input === 'datetime') return 'datetime-local';
  if (input === 'number') return 'number';
  if (input === 'date') return 'date';
  return 'text';
}

function setForm(row?: Record<string, any>) {
  const base = buildEmptyForm();
  if (!row) {
    form.value = base;
    return;
  }
  const filled: Record<string, any> = { ...base };
  for (const field of props.formSchema) {
    const raw = row[field.key];
    if (raw === undefined || raw === null) continue;
    if (field.input === 'checkbox') filled[field.key] = Boolean(raw);
    else filled[field.key] = raw;
  }
  form.value = filled;
}

function openCreate() {
  modal.value = { open: true, mode: 'create', index: -1, error: '', saving: false };
  setForm();
}

function findIndex(row: Record<string, any>) {
  const key = idKey.value;
  const rowId = row?.[key];
  if (rowId !== undefined && rowId !== null) {
    const idx = rows.value.findIndex(item => item[key] === rowId);
    if (idx !== -1) return idx;
  }
  return rows.value.findIndex(item => JSON.stringify(item) === JSON.stringify(row));
}

function openEdit(row: Record<string, any>) {
  const idx = findIndex(row);
  modal.value = { open: true, mode: 'edit', index: idx, error: '', saving: false };
  if (idx >= 0) setForm(rows.value[idx]);
  else setForm(row);
}

function closeModal() {
  modal.value.open = false;
}

function prevPage() {
  if (page.value <= 1) return;
  page.value -= 1;
}

function nextPage() {
  if (page.value >= totalPages.value) return;
  page.value += 1;
}

async function load() {
  if (!hasEndpoint.value) return;
  loading.value = true;
  error.value = '';
  try {
    const { data } = await api.get(props.endpoint!);
    const list = extractRows(data);
    rows.value = list.length ? normalizeRows(list) : normalizeRows(props.sampleData || []);
  } catch (e: any) {
    error.value = e?.response?.data?.error || e?.message || 'Errore durante il caricamento';
  } finally {
    loading.value = false;
  }
}

function extractRows(payload: any): Array<Record<string, any>> {
  if (props.transformResponse) {
    const res = props.transformResponse(payload);
    return Array.isArray(res) ? res : [];
  }
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.rows)) return payload.rows;
  return [];
}

function validateForm() {
  for (const field of props.formSchema) {
    const value = form.value[field.key];
    const isEmpty = value === undefined || value === null || value === '';
    if (field.required && isEmpty) {
      modal.value.error = `Compila il campo "${field.label}"`;
      return false;
    }
    if ((field.input === 'number' || field.input === 'currency') && value !== '' && value !== null) {
      const n = Number(value);
      if (Number.isNaN(n)) {
        modal.value.error = `${field.label} deve essere numerico`;
        return false;
      }
    }
  }
  modal.value.error = '';
  return true;
}

function buildPayload() {
  const payload: Record<string, any> = {};
  for (const field of props.formSchema) {
    let value = form.value[field.key];
    if (field.input === 'number' || field.input === 'currency') {
      value = value === '' || value === null ? null : Number(value);
    } else if (field.input === 'checkbox') {
      value = Boolean(value);
    }
    payload[field.key] = value;
  }
  return payload;
}

function createLocalId() {
  const key = idKey.value;
  const numericValues = rows.value
    .map(row => Number(row[key]))
    .filter(value => Number.isInteger(value));
  if (numericValues.length === rows.value.length && numericValues.length > 0) {
    return Math.max(...numericValues) + 1;
  }
  let candidate = '';
  do {
    candidate = `tmp-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
  } while (rows.value.some(row => String(row[key]) === candidate));
  return candidate;
}

function saveRecord() {
  if (modal.value.saving) return;
  if (!validateForm()) return;
  modal.value.saving = true;
  try {
    const payload = buildPayload();
    if (modal.value.mode === 'edit' && modal.value.index >= 0) {
      const existing = rows.value[modal.value.index];
      const updated = { ...existing, ...payload, [idKey.value]: existing[idKey.value] };
      rows.value = rows.value.map((row, idx) => idx === modal.value.index ? updated : row);
    } else {
      const newRow: Record<string, any> = { ...payload };
      const key = idKey.value;
      if (newRow[key] === undefined || newRow[key] === null || newRow[key] === '') {
        newRow[key] = createLocalId();
      }
      rows.value = [...rows.value, newRow];
    }
    closeModal();
  } catch (e: any) {
    modal.value.error = e?.message || 'Impossibile salvare i dati';
  } finally {
    modal.value.saving = false;
  }
}

onMounted(() => {
  if (hasEndpoint.value) load();
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
