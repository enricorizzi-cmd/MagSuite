<template>
  <ResourceTablePage
    title="Target"
    description="Obiettivi assegnati per funzione e relativo avanzamento."
    new-label="Nuovo target"
    :show-new="false"
    :show-actions="false"
    endpoint="/gestionale/targets"
    :fields="fields"
    :form-schema="[]"
    :transform-response="transformResponse"
  />
</template>

<script setup lang="ts">
import ResourceTablePage from '../../components/ResourceTablePage.vue';

const fields = [
  { key: 'entity', label: 'Funzione', type: 'string' },
  { key: 'period', label: 'Periodo', type: 'string' },
  { key: 'metric', label: 'KPI', type: 'string' },
  { key: 'target_value', label: 'Target', type: 'string' },
  { key: 'actual_value', label: 'Attuale', type: 'string' }
];

const numberFmt = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 });

const transformResponse = (payload: any) => {
  const list = Array.isArray(payload?.items) ? payload.items : [];
  return list.map((row: Record<string, any>) => ({
    ...row,
    target_value: typeof row.target_value === 'number' ? numberFmt.format(row.target_value) : row.target_value,
    actual_value: typeof row.actual_value === 'number' ? numberFmt.format(row.actual_value) : row.actual_value
  }));
};
</script>
