<template>
  <label class="block space-y-1 text-sm text-slate-300">
    <span v-if="label" class="font-medium">{{ label }}</span>
    <div class="relative">
      <input
        v-model="query"
        type="text"
        :placeholder="placeholder"
        :disabled="disabled"
        class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-400/60 focus:outline-none focus:ring-1 focus:ring-cyan-400/50"
        @focus="handleFocus"
        @keydown.down.prevent="highlight(1)"
        @keydown.up.prevent="highlight(-1)"
        @keydown.enter.prevent="confirmHighlight"
      />
      <button
        v-if="modelValue && !disabled"
        type="button"
        class="absolute inset-y-0 right-0 flex items-center px-2 text-xs text-slate-400 hover:text-slate-200"
        @click="clear"
      >✕</button>
    </div>
    <p v-if="helper" class="text-xs text-slate-400">{{ helper }}</p>
    <div v-if="open && dropdownItems.length" class="relative">
      <ul class="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-white/10 bg-slate-900/95 shadow-xl">
        <li
          v-for="(item, index) in dropdownItems"
          :key="item.id"
          class="cursor-pointer px-3 py-2 text-sm"
          :class="highlightedIndex === index ? 'bg-cyan-500/20 text-cyan-100' : 'text-slate-200 hover:bg-white/10'"
          @mousedown.prevent="select(item)"
        >
          <div class="font-medium">{{ item.name }}</div>
          <div class="text-xs text-slate-400 flex gap-2">
            <span v-if="item.code">{{ item.code }}</span>
            <span v-if="item.email">{{ item.email }}</span>
            <span v-if="item.phone">{{ item.phone }}</span>
          </div>
        </li>
        <li v-if="loading" class="px-3 py-2 text-xs text-slate-400">Ricerca in corso...</li>
      </ul>
    </div>
  </label>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import api from '../../../services/api';
import { searchCustomers, type CustomerSummary } from '../../../services/bp';

const props = withDefaults(defineProps<{
  modelValue: number | null;
  label?: string;
  placeholder?: string;
  helper?: string;
  disabled?: boolean;
}>(), {
  modelValue: null,
  label: '',
  placeholder: 'Seleziona cliente',
  helper: '',
  disabled: false
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: number | null): void;
  (e: 'change', value: number | null): void;
}>();

const query = ref('');
const loading = ref(false);
const open = ref(false);
const highlightedIndex = ref(-1);
const results = ref<CustomerSummary[]>([]);
let searchTimeout: number | null = null;

const dropdownItems = computed(() => results.value);

function handleFocus() {
  if (props.disabled) return;
  open.value = true;
  highlightedIndex.value = -1;
  if (!query.value) {
    results.value = [];
  }
}

function highlight(direction: 1 | -1) {
  if (!open.value || !dropdownItems.value.length) return;
  highlightedIndex.value = (highlightedIndex.value + direction + dropdownItems.value.length) % dropdownItems.value.length;
}

function confirmHighlight() {
  if (highlightedIndex.value < 0) return;
  const item = dropdownItems.value[highlightedIndex.value];
  select(item);
}

function select(item: CustomerSummary) {
  query.value = item.name;
  emit('update:modelValue', item.id);
  emit('change', item.id);
  open.value = false;
  results.value = [];
}

function clear() {
  query.value = '';
  emit('update:modelValue', null);
  emit('change', null);
  results.value = [];
  highlightedIndex.value = -1;
}

async function runSearch(term: string) {
  const trimmed = term.trim();
  if (trimmed.length < 2) {
    results.value = [];
    return;
  }
  loading.value = true;
  try {
    results.value = await searchCustomers(trimmed, 8);
    if (!open.value && results.value.length) open.value = true;
  } catch (error) {
    console.warn('customer search failed', error);
  } finally {
    loading.value = false;
  }
}

async function loadSelectedLabel(id: number) {
  try {
    const { data } = await api.get(/customers/);
    if (data?.name) {
      query.value = data.name;
    }
  } catch (error) {
    console.warn('unable to load customer', error);
  }
}

watch(() => props.modelValue, (value) => {
  if (!value) {
    if (query.value) {
      query.value = '';
    }
    return;
  }
  loadSelectedLabel(value);
});

watch(query, (value, previous) => {
  if (props.disabled) return;
  if (props.modelValue && value === previous) return;
  if (searchTimeout) {
    window.clearTimeout(searchTimeout);
  }
  if (!value || value.trim().length < 2) {
    results.value = [];
    return;
  }
  searchTimeout = window.setTimeout(() => runSearch(value), 220);
});

onMounted(() => {
  if (props.modelValue) {
    loadSelectedLabel(props.modelValue);
  }
});

const helper = computed(() => props.helper);
</script>
