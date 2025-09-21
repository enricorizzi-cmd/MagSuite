<template>
  <div>
    <ListFilters
      :items="items"
      :fields="fields"
      :new-label="newLabel"
      :show-new="showNew"
      @new="$emit('new')"
      v-slot="{ filtered }"
    >
      <div v-if="filtered.length === 0" class="text-slate-400">{{ emptyLabelComputed }}</div>
      <div v-else class="overflow-x-auto border border-white/10 rounded-lg">
        <table class="min-w-full text-sm">
          <thead class="bg-white/5 text-slate-300">
            <tr>
              <th v-for="f in fields" :key="f.key" class="px-3 py-2" :class="f.align === 'right' ? 'text-right' : 'text-left'">
                {{ f.label || f.key }}
              </th>
              <th v-if="showActionsComputed" class="px-3 py-2 text-right">Azioni</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in paged(filtered)" :key="rowKey(row)" class="border-t border-white/10">
              <td v-for="f in fields" :key="f.key" class="px-3 py-2" :class="cellAlign(f)">{{ renderCell(row[f.key], f) }}</td>
              <td v-if="showActionsComputed" class="px-3 py-2 text-right">
                <button
                  type="button"
                  class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/5 text-slate-200 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40"
                  :aria-label="editButtonLabel"
                  :title="editButtonLabel"
                  @click="$emit('edit', row)"
                >
                  <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 13.5V16h2.5l7.374-7.374-2.5-2.5L4 13.5z" fill="currentColor"/>
                    <path d="M13.793 3.793a1 1 0 011.414 0l1 1a1 1 0 010 1.414l-1.086 1.086-2.414-2.414 1.086-1.086z" fill="currentColor"/>
                  </svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </ListFilters>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import ListFilters from './ListFilters.vue';

type FieldType = 'string' | 'number' | 'boolean' | 'enum';
type Field = { key: string; label?: string; type: FieldType; options?: any[]; align?: 'left' | 'right' };

const props = defineProps<{
  items: Array<Record<string, any>>;
  fields: Array<Field>;
  newLabel?: string;
  showNew?: boolean;
  emptyLabel?: string;
  rowKeyField?: string;
  page?: number;
  limit?: number;
  serverPagination?: boolean;
  showActions?: boolean;
}>();

defineEmits<{ (e: 'new'): void; (e: 'edit', row: Record<string, any>): void }>();

const emptyLabelComputed = computed<string>(() => props.emptyLabel || 'Nessun risultato.');
const showActionsComputed = computed<boolean>(() => props.showActions !== false);
const entityLabel = computed<string>(() => inferEntityLabel(props.newLabel));
const editButtonLabel = computed<string>(() => entityLabel.value ? `Modifica ${entityLabel.value}` : 'Modifica elemento');

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

function rowKey(row: Record<string, any>): string | number {
  const k = props.rowKeyField || 'id';
  const v = row[k as any];
  if (v !== undefined && v !== null) return v;
  try { return JSON.stringify(row); } catch { return Math.random(); }
}

function cellAlign(f: Field) {
  if (f.align) return f.align === 'right' ? 'text-right text-slate-100' : 'text-left';
  if (f.type === 'number') return 'text-right text-slate-100';
  return 'text-left';
}

function renderCell(val: any, f: Field) {
  if (val == null || val === '') return '-';
  if (f.type === 'boolean') return val ? 'Si' : 'No';
  if (f.type === 'number') {
    try { return Number(val).toLocaleString(); } catch { return String(val); }
  }
  return String(val);
}

function paged(list: any[]) {
  if (props.serverPagination) {
    return list;
  }
  const p = props.page || 0;
  const l = props.limit || 0;
  if (p > 0 && l > 0) {
    const start = (p - 1) * l;
    return list.slice(start, start + l);
  }
  return list;
}
</script>

<style scoped></style>
