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
              <th class="px-3 py-2 text-right">Azioni</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in paged(filtered)" :key="rowKey(row)" class="border-t border-white/10">
              <td v-for="f in fields" :key="f.key" class="px-3 py-2" :class="cellAlign(f)">{{ renderCell(row[f.key], f) }}</td>
              <td class="px-3 py-2 text-right">
                <button class="px-2 py-1 rounded-lg text-xs bg-white/10 hover:bg-white/20 text-slate-200" @click="$emit('edit', row)">Modifica</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </ListFilters>
  </div>
</template>

<script setup lang="ts">
import ListFilters from './ListFilters.vue';

type FieldType = 'string' | 'number' | 'boolean' | 'enum';
type Field = { key: string; label?: string; type: FieldType; options?: any[]; align?: 'left' | 'right' };

const props = defineProps<{
  items: Array<Record<string, any>>;
  fields: Array<Field>;
  newLabel?: string;
  showNew?: boolean;
  emptyLabel?: string;
  rowKeyField?: string; // defaults to 'id' if present, else JSON stringify
  page?: number;
  limit?: number;
}>();

defineEmits<{ (e: 'new'): void; (e: 'edit', row: Record<string, any>): void }>();

const emptyLabelComputed = computed<string>(() => props.emptyLabel || 'Nessun risultato.');

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
  if (f.type === 'boolean') return val ? 'Sì' : 'No';
  if (f.type === 'number') {
    try { return Number(val).toLocaleString(); } catch { return String(val); }
  }
  return String(val);
}

function paged(list: any[]) {
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
