<template>
  <ResourceTablePage
    title="Provvigioni"
    description="Provvigioni maturate per agente e periodo."
    new-label="Nuova provvigione"
    :show-new="false"
    :show-actions="false"
    endpoint="/gestionale/commissions"
    :fields="fields"
    :form-schema="[]"
    server-pagination
    :transform-response="transformResponse"
  />
</template>

<script setup lang="ts">
import ResourceTablePage from '../../components/ResourceTablePage.vue';

const currency = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });

const fields = [
  { key: 'id', label: 'ID', type: 'number' },
  { key: 'agent_id', label: 'Agente', type: 'number' },
  { key: 'order_id', label: 'Ordine', type: 'number' },
  { key: 'amount', label: 'Importo', type: 'string' },
  { key: 'rate', label: 'Aliquota %', type: 'string' },
  { key: 'period', label: 'Periodo', type: 'string' }
];

const transformResponse = (payload: any) => {
  const list = Array.isArray(payload?.items) ? payload.items : [];
  return list.map((row: Record<string, any>) => ({
    ...row,
    amount: typeof row.amount === 'number' ? currency.format(row.amount) : row.amount,
    rate: typeof row.rate === 'number' ? `${row.rate.toFixed(2)}%` : row.rate
  }));
};
</script>
