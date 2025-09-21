<template>
  <ResourceTablePage
    title="Ordini / Portafoglio"
    description="Ordini in backlog con importi in attesa di evasione."
    new-label="Nuovo ordine"
    :show-new="false"
    :show-actions="false"
    endpoint="/gestionale/orders"
    :query-params="{ status: 'backlog' }"
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
  { key: 'order_date', label: 'Data', type: 'string' },
  { key: 'customer_name', label: 'Cliente', type: 'string' },
  { key: 'total', label: 'Totale', type: 'string' },
  { key: 'status', label: 'Stato', type: 'string' }
];

const transformResponse = (payload: any) => {
  const list = Array.isArray(payload?.items) ? payload.items : [];
  return list.map((row: Record<string, any>) => ({
    ...row,
    order_date: row.order_date ? new Date(row.order_date).toLocaleDateString('it-IT') : '',
    total: typeof row.total === 'number'
      ? new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(row.total)
      : row.total
  }));
};
</script>
