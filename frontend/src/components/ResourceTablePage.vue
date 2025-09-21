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
          class="px-3 py-1.5 rounded-lg text-sm border border-white/10 text-slate-200 hover:bg-white/10 disabled:opacity-50"
          :disabled="loading"
          @click="load"
        >{{ loading ? 'Aggiornamento…' : 'Aggiorna' }}</button>
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
          :server-pagination="useServerPagination"
          :show-new="showNew"
          :show-actions="showActions"
          @new="openCreate"
          @edit="openEdit"
        />

        <div class="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-400">
          <div>Totale: {{ totalItems }} • Pagina {{ page }} di {{ totalPages }}</div>
          <div class="ml-auto flex items-center gap-2 text-slate-300">
            <button class="px-2 py-1 rounded border border-white/10 hover:bg-white/10 disabled:opacity-40" :disabled="page<=1 || loading" @click="prevPage">Indietro</button>
            <button class="px-2 py-1 rounded border border-white/10 hover:bg-white/10 disabled:opacity-40" :disabled="page>=totalPages || loading" @click="nextPage">Avanti</button>
            <select v-model.number="limit" class="px-2 py-1 rounded bg-white/10 border border-white/10 text-sm text-slate-200" :disabled="loading">
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
                {{ modalTitle }}
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
              <button
                class="px-3 py-1.5 rounded-lg text-sm bg-white/10 hover:bg-white/20 text-slate-200 disabled:opacity-60"
                :disabled="modal.saving || modal.deleting"
                @click="closeModal"
              >Annulla</button>
              <button
                v-if="showDeleteButton"
                type="button"
                class="ml-auto px-3 py-1.5 rounded-lg text-sm border border-rose-500/40 text-rose-300 hover:bg-rose-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 disabled:opacity-60"
                :disabled="modal.saving || modal.deleting"
                @click="deleteRecord"
              >
                <span v-if="modal.deleting">Eliminazione…</span>
                <span v-else>{{ deleteButtonLabel }}</span>
              </button>
              <button
                class="px-3 py-1.5 rounded-lg text-sm bg-fuchsia-600 hover:bg-fuchsia-500 text-white disabled:opacity-60"
                :class="showDeleteButton ? '' : 'ml-auto'"
                :disabled="modal.saving || modal.deleting"
                @click="saveRecord"
              >
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
type ModalState = { open: boolean; mode: 'create' | 'edit'; index: number; error: string; saving: boolean; deleting: boolean; original?: Record<string, any> | null };

type QueryParams = Record<string, any>;

type SubmitPayloadBuilder = (data: Record<string, any>, original?: Record<string, any> | null) => Record<string, any>;
type UpdateUrlBuilder = (id: string | number, payload: Record<string, any>, original?: Record<string, any> | null) => string;
type CreateUrlBuilder = (payload: Record<string, any>) => string;

type HttpMethod = 'post' | 'put' | 'patch';

type DeleteMethod = 'delete' | 'post' | 'put';
type DeletePayloadBuilder = (original: Record<string, any> | null) => Record<string, any>;
type DeleteUrlBuilder = (id: string | number, original?: Record<string, any> | null) => string;

const props = defineProps<{
  title: string;
  description: string;
  newLabel: string;
  fields: ResourceField[];
  formSchema: FormField[];
  endpoint?: string;
  queryParams?: QueryParams | (() => QueryParams);
  serverPagination?: boolean;
  createMethod?: HttpMethod;
  updateMethod?: HttpMethod;
  buildCreatePayload?: SubmitPayloadBuilder;
  buildUpdatePayload?: SubmitPayloadBuilder;
  buildCreateUrl?: CreateUrlBuilder;
  buildUpdateUrl?: UpdateUrlBuilder;
  deleteMethod?: DeleteMethod;
  buildDeletePayload?: DeletePayloadBuilder;
  buildDeleteUrl?: DeleteUrlBuilder;
  allowDelete?: boolean;
  transformResponse?: (payload: any) => Array<Record<string, any>>;
  sampleData?: Array<Record<string, any>>;
  idKey?: string;
  emptyLabel?: string;
  showNew?: boolean;
  showActions?: boolean;
}>();

const hasEndpoint = computed(() => typeof props.endpoint === 'string' && props.endpoint.length > 0);
const useServerPagination = computed(() => props.serverPagination === true && hasEndpoint.value);
const showNew = computed(() => props.showNew !== undefined ? props.showNew : true);
const showActions = computed(() => props.showActions !== false);
const idKey = computed(() => props.idKey || 'id');
const allowDelete = computed(() => props.allowDelete !== false);
const entityLabel = computed(() => inferEntityLabel(props.newLabel));
const editTitle = computed(() => entityLabel.value ? `Modifica ${entityLabel.value}` : 'Modifica record');
const deleteButtonLabel = computed(() => entityLabel.value ? `Elimina ${entityLabel.value}` : 'Elimina elemento');

const rows = ref<Array<Record<string, any>>>([]);
const loading = ref(false);
const error = ref('');
const page = ref(1);
const limit = ref(20);
const totalItems = ref(0);
const totalPages = computed(() => Math.max(1, Math.ceil(Math.max(totalItems.value, rows.value.length) / limit.value)));

const modal = ref<ModalState>({ open: false, mode: 'create', index: -1, error: '', saving: false, deleting: false, original: null });
const form = ref<Record<string, any>>({});
const modalTitle = computed(() => {
  if (modal.value.mode === 'create') return props.newLabel || 'Nuovo elemento';
  return editTitle.value;
});
const showDeleteButton = computed(() => modal.value.mode === 'edit' && allowDelete.value);

watch(() => props.sampleData, (next) => {
  if (!hasEndpoint.value && Array.isArray(next)) {
    rows.value = normalizeRows(next);
    totalItems.value = rows.value.length;
  }
}, { deep: true });

watch(rows, () => {
  if (!useServerPagination.value) {
    totalItems.value = rows.value.length;
  }
}, { deep: true });

watch([page, limit], ([newPage, newLimit], [oldPage, oldLimit]) => {
  if (!useServerPagination.value) return;
  if (newPage === oldPage && newLimit === oldLimit) return;
  load();
});

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

function inferEntityLabel(label?: string): string {
  if (!label) return '';
  const trimmed = label.trim();
  if (!trimmed) return '';
  const lowered = trimmed.toLowerCase();
  const prefixes = ['nuovo', 'nuova', 'nuovi', 'nuove'];
  for (const prefix of prefixes) {
    if (lowered === prefix) return '';
    if (lowered.startsWith(prefix + ' ')) {
      return trimmed.slice(prefix.length).trim();
    }
  }
  return trimmed;
}

function openCreate() {
  modal.value = { open: true, mode: 'create', index: -1, error: '', saving: false, deleting: false, original: null };
  form.value = buildEmptyForm();
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
  modal.value = { open: true, mode: 'edit', index: idx, error: '', saving: false, deleting: false, original: idx >= 0 ? { ...rows.value[idx] } : { ...row } };
  if (idx >= 0) {
    setForm(rows.value[idx]);
  } else {
    setForm(row);
  }
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

function resolvedQueryParams(): QueryParams {
  const base = typeof props.queryParams === 'function' ? props.queryParams() : (props.queryParams || {});
  const params: QueryParams = { ...base };
  if (useServerPagination.value) {
    params.page = page.value;
    params.limit = limit.value;
  }
  return params;
}

async function load() {
  if (!hasEndpoint.value) {
    rows.value = normalizeRows(props.sampleData || []);
    totalItems.value = rows.value.length;
    return;
  }
  loading.value = true;
  error.value = '';
  try {
    const params = resolvedQueryParams();
    const { data } = await api.get(props.endpoint!, { params });
    const list = extractRows(data);
    rows.value = normalizeRows(list);
    const totalFromResponse = extractTotal(data);
    if (Number.isFinite(totalFromResponse)) {
      totalItems.value = Number(totalFromResponse);
    } else {
      totalItems.value = rows.value.length;
    }
    if (!rows.value.length && props.sampleData?.length) {
      rows.value = normalizeRows(props.sampleData);
      if (!Number.isFinite(totalFromResponse)) {
        totalItems.value = rows.value.length;
      }
    }
  } catch (e: any) {
    error.value = e?.response?.data?.error || e?.message || 'Errore durante il caricamento';
    if (props.sampleData?.length) {
      rows.value = normalizeRows(props.sampleData);
      totalItems.value = rows.value.length;
    }
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

function extractTotal(payload: any): number | null {
  if (!payload || typeof payload !== 'object') return null;
  const candidates = [payload.total, payload.count, payload.totalItems, payload.meta?.total, payload.pagination?.total];
  for (const candidate of candidates) {
    const num = typeof candidate === 'number' ? candidate : Number(candidate);
    if (Number.isFinite(num)) return num;
  }
  return null;
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

async function saveRecord() {
  if (modal.value.saving) return;
  if (!validateForm()) return;
  modal.value.saving = true;
  modal.value.error = '';
  const mode = modal.value.mode;
  const basePayload = buildPayload();
  const original = modal.value.original || (modal.value.index >= 0 ? rows.value[modal.value.index] : null);
  try {
    if (!hasEndpoint.value) {
      applyLocalSave(mode, basePayload, original);
      closeModal();
      return;
    }
    if (mode === 'create') {
      const payload = props.buildCreatePayload ? props.buildCreatePayload(basePayload, null) : basePayload;
      const method = (props.createMethod || 'post');
      const url = props.buildCreateUrl ? props.buildCreateUrl(payload) : props.endpoint!;
      await callApi(method, url, payload);
      if (!useServerPagination.value) page.value = 1;
      await load();
      closeModal();
    } else {
      if (!original) throw new Error('Record originale non disponibile');
      const payload = props.buildUpdatePayload ? props.buildUpdatePayload(basePayload, original) : basePayload;
      const method = (props.updateMethod || 'put');
      const id = original[idKey.value];
      if (id === undefined || id === null) throw new Error('ID non valido per aggiornamento');
      const url = props.buildUpdateUrl ? props.buildUpdateUrl(id, payload, original) : `${props.endpoint}/${encodeURIComponent(String(id))}`;
      await callApi(method, url, payload);
      await load();
      closeModal();
    }
  } catch (e: any) {
    modal.value.error = e?.response?.data?.error || e?.message || 'Impossibile salvare i dati';
  } finally {
    modal.value.saving = false;
  }
}

async function deleteRecord() {
  if (!showDeleteButton.value) return;
  if (modal.value.deleting || modal.value.saving) return;
  const original = modal.value.original || (modal.value.index >= 0 ? rows.value[modal.value.index] : null);
  if (!original) {
    modal.value.error = 'Record da eliminare non trovato';
    return;
  }
  const label = entityLabel.value || 'elemento';
  const confirmMessage = `Eliminare definitivamente questo ${label}?`;
  if (typeof window !== 'undefined' && !window.confirm(confirmMessage)) return;
  modal.value.deleting = true;
  modal.value.error = '';
  try {
    if (hasEndpoint.value) {
      const id = original[idKey.value];
      if (id === undefined || id === null) throw new Error('ID non valido per eliminazione');
      const url = props.buildDeleteUrl ? props.buildDeleteUrl(id, original) : `${props.endpoint}/${encodeURIComponent(String(id))}`;
      const payload = props.buildDeletePayload ? props.buildDeletePayload(original) : undefined;
      const method = props.deleteMethod || 'delete';
      const shouldGoBack = useServerPagination.value && page.value > 1 && rows.value.length <= 1;
      await callDeleteApi(method, url, payload);
      if (shouldGoBack) {
        page.value = Math.max(1, page.value - 1);
      } else {
        await load();
      }
    } else {
      applyLocalDelete(modal.value.index, original);
    }
    closeModal();
  } catch (e: any) {
    modal.value.error = e?.response?.data?.error || e?.message || 'Impossibile eliminare i dati';
  } finally {
    modal.value.deleting = false;
  }
}

function applyLocalDelete(index: number, original: Record<string, any> | null) {
  if (index >= 0) {
    rows.value = rows.value.filter((_, idx) => idx !== index);
    return;
  }
  if (original) {
    const key = idKey.value;
    rows.value = rows.value.filter(row => row[key] !== original[key]);
  }
}

async function callDeleteApi(method: DeleteMethod, url: string, payload?: Record<string, any>) {
  const lower = method.toLowerCase();
  if (lower === 'delete') {
    if (payload) {
      await api.delete(url, { data: payload });
    } else {
      await api.delete(url);
    }
    return;
  }
  if (lower === 'post') {
    await api.post(url, payload || {});
    return;
  }
  if (lower === 'put') {
    await api.put(url, payload || {});
    return;
  }
  throw new Error(`Metodo HTTP non supportato: ${method}`);
}


function applyLocalSave(mode: 'create' | 'edit', payload: Record<string, any>, original: Record<string, any> | null) {
  if (mode === 'edit' && modal.value.index >= 0) {
    const updated = { ...(original || {}), ...payload, [idKey.value]: original?.[idKey.value] };
    rows.value = rows.value.map((row, idx) => idx === modal.value.index ? updated : row);
  } else {
    const newRow: Record<string, any> = { ...payload };
    const key = idKey.value;
    if (newRow[key] === undefined || newRow[key] === null || newRow[key] === '') {
      newRow[key] = createLocalId();
    }
    rows.value = [...rows.value, newRow];
  }
}

async function callApi(method: HttpMethod, url: string, payload: Record<string, any>) {
  const lower = method.toLowerCase();
  if (lower === 'post') {
    await api.post(url, payload);
  } else if (lower === 'put') {
    await api.put(url, payload);
  } else if (lower === 'patch') {
    await api.patch(url, payload);
  } else {
    throw new Error(`Metodo HTTP non supportato: ${method}`);
  }
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

onMounted(() => {
  if (hasEndpoint.value) {
    load();
  } else if (props.sampleData?.length) {
    rows.value = normalizeRows(props.sampleData);
    totalItems.value = rows.value.length;
  }
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




