<template>
  <ResourceTablePage
    title="Marketing / Clienti"
    description="Lead e opportunità generate dalle campagne marketing."
    new-label="Nuovo lead"
    :show-new="false"
    :show-actions="false"
    endpoint="/gestionale/marketing-clients"
    :fields="fields"
    :form-schema="[]"
    server-pagination
    :transform-response="transformResponse"
  />
</template>

<script setup lang="ts">
import ResourceTablePage from '../../components/ResourceTablePage.vue';

const fields = [
  { key: 'name', label: 'Nome', type: 'string' },
  { key: 'source', label: 'Fonte', type: 'string' },
  { key: 'campaign', label: 'Campagna', type: 'string' },
  { key: 'created_at', label: 'Creato il', type: 'string' }
];

const transformResponse = (payload: any) => {
  const list = Array.isArray(payload?.items) ? payload.items : [];
  return list.map((row: Record<string, any>) => ({
    ...row,
    created_at: row.created_at ? new Date(row.created_at).toLocaleString('it-IT') : ''
  }));
};
</script>
