<template>
  <ResourceTablePage
    title="Ordini / Erogazioni"
    description="Cronologia erogazioni e quantità consegnate."
    new-label="Nuova erogazione"
    :show-new="false"
    :show-actions="false"
    endpoint="/gestionale/deliveries"
    :fields="fields"
    :form-schema="[]"
    server-pagination
    :transform-response="transformResponse"
  />
</template>

<script setup lang="ts">
import ResourceTablePage from '../../components/ResourceTablePage.vue';

const fields = [
  { key: 'id', label: 'ID', type: 'number' },
  { key: 'customer_name', label: 'Cliente', type: 'string' },
  { key: 'date', label: 'Data', type: 'string' },
  { key: 'quantity', label: 'Quantità', type: 'number' },
  { key: 'notes', label: 'Note', type: 'string' }
];

const transformResponse = (payload: any) => {
  const list = Array.isArray(payload?.items) ? payload.items : [];
  return list.map((row: Record<string, any>) => ({
    ...row,
    date: row.date ? new Date(row.date).toLocaleDateString('it-IT') : ''
  }));
};
</script>
