<template>
  <ResourceTablePage
    title="Documenti"
    description="Documenti di magazzino con stato e causale."
    new-label="Nuovo documento"
    endpoint="/documents"
    :fields="fields"
    :form-schema="formSchema"
    :transform-response="transformResponse"
    :build-create-payload="buildPayload"
    :query-params="queryParams"
    empty-label="Nessun documento disponibile."
    :show-actions="false"
  />
</template>

<script setup lang="ts">
import ResourceTablePage from '../../components/ResourceTablePage.vue';

type DocumentRow = Record<string, any>;

const fields = [
  { key: 'id', label: 'ID', type: 'number', align: 'right' },
  { key: 'type', label: 'Tipo', type: 'string' },
  { key: 'status', label: 'Stato', type: 'string' },
  { key: 'causal', label: 'Causale', type: 'string' },
  { key: 'lines_count', label: 'Righe', type: 'number', align: 'right' },
  { key: 'created_at', label: 'Creato il', type: 'string' }
];

const formSchema = [
  { key: 'type', label: 'Tipo', input: 'text', required: true, placeholder: 'transfer, picking…' },
  { key: 'causal', label: 'Causale', input: 'text' },
  {
    key: 'lines',
    label: 'Righe (JSON opzionale)',
    input: 'textarea',
    placeholder: '[{"item_id":1,"quantity":10}]'
  }
];

const queryParams = () => ({ limit: 100 });

const buildPayload = (data: DocumentRow) => {
  const payload: DocumentRow = {
    type: data.type?.trim(),
    causal: data.causal?.trim() || null,
  };
  if (data.lines) {
    try {
      payload.lines = JSON.parse(data.lines as string);
    } catch (err) {
      throw new Error('Righe non sono JSON valido');
    }
  }
  return payload;
};

const transformResponse = (payload: any) => {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  return items.map((row: DocumentRow) => ({
    ...row,
    lines_count: Array.isArray(row.lines) ? row.lines.length : 0,
    created_at: row.created_at ? new Date(row.created_at).toLocaleString() : '',
  }));
};
</script>

<style scoped></style>
