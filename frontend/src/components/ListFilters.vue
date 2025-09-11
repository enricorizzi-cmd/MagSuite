<template>
  <div class="mb-4">
    <!-- New button row (uniform across project) -->
    <div v-if="showNewButton" class="flex items-center mb-2">
      <div class="text-xs uppercase tracking-wide text-slate-400">Azioni</div>
      <button
        class="ml-auto px-3 py-1.5 rounded-lg text-sm bg-fuchsia-600 hover:bg-fuchsia-500 text-white"
        @click="emit('new')"
      >{{ newLabelComputed }}</button>
    </div>
    <!-- Filters Row -->
    <div class="flex flex-wrap items-start gap-3">
      <div class="text-xs uppercase tracking-wide text-slate-400 w-full">Filtri</div>
      <template v-for="f in fieldsToUse" :key="f.key">
        <!-- Boolean selector -->
        <div v-if="f.type==='boolean'" class="flex flex-col gap-1">
          <label class="text-xs text-slate-400">{{ f.label || f.key }}</label>
          <select v-model="localFilters[f.key]" class="min-w-[10rem] bg-white/10 border border-white/10 rounded px-2 py-1 text-sm text-slate-200">
            <option :value="''">Tutti</option>
            <option :value="'true'">Sì</option>
            <option :value="'false'">No</option>
          </select>
        </div>

        <!-- Enum selector -->
        <div v-else-if="f.type==='enum'" class="flex flex-col gap-1">
          <label class="text-xs text-slate-400">{{ f.label || f.key }}</label>
          <select v-model="localFilters[f.key]" class="min-w-[10rem] bg-white/10 border border-white/10 rounded px-2 py-1 text-sm text-slate-200">
            <option :value="''">Tutti</option>
            <option v-for="opt in f.options || []" :key="String(opt)" :value="String(opt)">{{ opt }}</option>
          </select>
        </div>

        <!-- Number input (equality) -->
        <div v-else-if="f.type==='number'" class="flex flex-col gap-1">
          <label class="text-xs text-slate-400">{{ f.label || f.key }}</label>
          <input v-model="localFilters[f.key]" type="number" class="w-28 bg-white/10 border border-white/10 rounded px-2 py-1 text-sm text-slate-200 placeholder:text-slate-400" placeholder="=" />
        </div>

        <!-- String input (contains) -->
        <div v-else class="flex flex-col gap-1">
          <label class="text-xs text-slate-400">{{ f.label || f.key }}</label>
          <input v-model="localFilters[f.key]" type="text" class="w-40 bg-white/10 border border-white/10 rounded px-2 py-1 text-sm text-slate-200 placeholder:text-slate-400" placeholder="contiene..." />
        </div>
      </template>

      <button v-if="hasAnyFilter" class="ml-auto px-2 py-1 rounded border border-white/10 text-slate-300 hover:bg-white/10 text-xs" @click="reset">Azzera</button>
    </div>

    <!-- Sorting Header -->
    <div class="mt-2 flex flex-wrap items-center gap-2">
      <div class="text-xs uppercase tracking-wide text-slate-400 mr-2">Ordina per</div>
      <button
        v-for="f in fieldsToUse"
        :key="'sort-'+f.key"
        class="relative px-2 py-1 rounded border text-xs flex items-center gap-1 hover:bg-white/10"
        :class="isSorted(f.key) ? 'border-fuchsia-500/50 text-fuchsia-200' : 'border-white/10 text-slate-300'"
        @click="toggleSort(f.key)"
        :title="sortTitle(f.key)"
      >
        <span class="capitalize">{{ f.label || f.key }}</span>
        <span v-if="sortDir(f.key)==='asc'" aria-hidden>▲</span>
        <span v-else-if="sortDir(f.key)==='desc'" aria-hidden>▼</span>
        <span v-if="isSorted(f.key)" class="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-fuchsia-600 text-[10px] text-white">{{ sortIndex(f.key) + 1 }}</span>
      </button>
      <button v-if="sorts.length" class="ml-auto px-2 py-1 rounded border border-white/10 text-slate-300 hover:bg-white/10 text-xs" @click="clearSorts">Azzera ordine</button>
    </div>

    <!-- Slot receives filtered + sorted items -->
    <slot :filtered="filteredItems" />
  </div>
  
  </template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';

type FieldType = 'string' | 'number' | 'boolean' | 'enum';
type Field = { key: string; label?: string; type: FieldType; options?: any[] };
type SortDir = 'asc' | 'desc';

const props = defineProps<{
  items: Array<Record<string, any>>;
  fields?: Array<Field>;
  newLabel?: string; // When provided, shows the uniform "Nuovo…" button
  showNew?: boolean; // Force show/hide; defaults to true when newLabel provided
}>();

const emit = defineEmits<{ (e: 'new'): void }>();

const showNewButton = computed<boolean>(() => {
  if (typeof props.showNew === 'boolean') return props.showNew;
  return typeof props.newLabel === 'string' && props.newLabel.length > 0;
});
const newLabelComputed = computed<string>(() => props.newLabel || 'Nuovo…');

// Build fields list when not provided, inferring type and enum options
const fieldsToUse = computed<Array<Field>>(() => {
  if (props.fields && props.fields.length) return props.fields;
  const keys = new Set<string>();
  for (const it of props.items || []) {
    Object.keys(it || {}).forEach(k => keys.add(k));
  }
  const fields: Array<Field> = [];
  keys.forEach((key) => {
    const values = (props.items || []).map(it => (it ?? {})[key]).filter(v => v !== undefined && v !== null);
    // Determine type
    let type: FieldType = 'string';
    if (values.length && values.every(v => typeof v === 'boolean')) type = 'boolean';
    else if (values.length && values.every(v => typeof v === 'number' || (typeof v === 'string' && v !== '' && !Number.isNaN(Number(v))))) type = 'number';
    else type = 'string';

    // Enum heuristic for strings/numbers/booleans: few distinct values
    let options: any[] | undefined = undefined;
    if (type !== 'boolean') {
      const uniq = Array.from(new Set(values.map(v => String(v))));
      if (uniq.length > 0 && uniq.length <= 20) {
        type = type === 'string' ? 'enum' : type;
        options = uniq;
      }
    }
    fields.push({ key, type, options });
  });
  // Stable order: id, name/email, status-like first, then others alphabetically
  const order = (f: Field) => {
    const k = f.key.toLowerCase();
    if (k === 'id') return '0';
    if (k === 'name' || k === 'nome' || k.includes('email')) return '1';
    if (k.includes('status') || k.includes('stato') || k.includes('suspended')) return '2';
    return '9-' + k;
  };
  return fields.sort((a,b) => order(a).localeCompare(order(b)));
});

// Local filter state keyed by field key
const localFilters = reactive<Record<string, string>>({});
const sorts = ref<Array<{ key: string; dir: SortDir }>>([]);

const hasAnyFilter = computed(() => Object.values(localFilters).some(v => v !== undefined && v !== null && String(v) !== ''));

function reset() {
  Object.keys(localFilters).forEach(k => delete localFilters[k]);
}

function clearSorts() {
  sorts.value = [];
}

function isSorted(key: string) {
  return sorts.value.findIndex(s => s.key === key) !== -1;
}
function sortIndex(key: string) {
  return sorts.value.findIndex(s => s.key === key);
}
function sortDir(key: string): SortDir | '' {
  const s = sorts.value.find(s => s.key === key);
  return s ? s.dir : '';
}
function sortTitle(key: string) {
  const idx = sortIndex(key);
  const dir = sortDir(key);
  if (idx === -1) return 'Clic per ordinare crescente';
  if (dir === 'asc') return 'Clic per ordinare decrescente';
  return 'Clic per rimuovere ordinamento';
}
function toggleSort(key: string) {
  const i = sorts.value.findIndex(s => s.key === key);
  if (i === -1) {
    sorts.value = [...sorts.value, { key, dir: 'asc' }];
  } else if (sorts.value[i].dir === 'asc') {
    const next = [...sorts.value];
    next[i] = { key, dir: 'desc' };
    sorts.value = next;
  } else {
    const next = sorts.value.filter((_, idx) => idx !== i);
    sorts.value = next;
  }
}

// Compare helpers
function cmp(a: any, b: any, type: FieldType): number {
  // Nulls/undefined always last
  const aNull = a === null || a === undefined || a === '';
  const bNull = b === null || b === undefined || b === '';
  if (aNull && bNull) return 0;
  if (aNull) return 1;
  if (bNull) return -1;

  if (type === 'number') {
    const na = typeof a === 'number' ? a : Number(a);
    const nb = typeof b === 'number' ? b : Number(b);
    if (Number.isNaN(na) && Number.isNaN(nb)) return 0;
    if (Number.isNaN(na)) return 1;
    if (Number.isNaN(nb)) return -1;
    return na - nb;
  }
  if (type === 'boolean') {
    // false < true
    const ba = Boolean(a) ? 1 : 0;
    const bb = Boolean(b) ? 1 : 0;
    return ba - bb;
  }
  // strings and enum
  const sa = String(a).toLocaleLowerCase();
  const sb = String(b).toLocaleLowerCase();
  return sa.localeCompare(sb);
}

// Apply filters + sorts to items
const filteredItems = computed(() => {
  const items = props.items || [];
  const filtered = !hasAnyFilter.value ? items : items.filter((it) => {
    for (const f of fieldsToUse.value) {
      const sel = localFilters[f.key];
      if (sel === undefined || sel === null || String(sel) === '') continue;
      const val = (it as any)[f.key];
      if (f.type === 'boolean') {
        const want = sel === 'true';
        if (Boolean(val) !== want) return false;
      } else if (f.type === 'enum') {
        if (String(val) !== String(sel)) return false;
      } else if (f.type === 'number') {
        if (String(val) !== String(sel)) return false;
      } else {
        // string contains (case-insensitive)
        const vv = val == null ? '' : String(val);
        if (!vv.toLowerCase().includes(String(sel).toLowerCase())) return false;
      }
    }
    return true;
  });

  if (!sorts.value.length) return filtered;
  const fieldType = (key: string): FieldType => fieldsToUse.value.find(f => f.key === key)?.type || 'string';
  const s = [...sorts.value];
  // Sort with multi-level comparator
  return [...filtered].sort((a, b) => {
    for (const { key, dir } of s) {
      const t = fieldType(key);
      const r = cmp((a as any)[key], (b as any)[key], t);
      if (r !== 0) return dir === 'asc' ? r : -r;
    }
    return 0;
  });
});

// Reset filters when dataset changes significantly
watch(() => props.items, () => { reset(); }, { deep: false });

</script>

<style scoped>
/* Improve readability of selects on dark background */
select { color: #e5e7eb; }
/* Keep strong contrast inside native option popups */
select option { color: #111827; }
</style>
