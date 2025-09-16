<template>
  <ResourceTablePage
    title="Inventari"
    description="Sessioni di inventario e relativo stato di avanzamento."
    new-label="Nuovo inventario"
    endpoint="/inventories"
    :fields="fields"
    :form-schema="formSchema"
    :transform-response="transformResponse"
    :build-create-payload="buildPayload"
    server-pagination
    empty-label="Nessun inventario presente."
    :show-actions="false"
  />
</template>

<script setup lang="ts">
import ResourceTablePage from '../../components/ResourceTablePage.vue';

type InventoryRow = Record<string, any>;

const fields = [
  { key: 'id', label: 'ID', type: 'number', align: 'right' },
  { key: 'status', label: 'Stato', type: 'string' },
  { key: 'scope_items', label: 'Articoli scope', type: 'number', align: 'right' },
  { key: 'differences_items', label: 'Differenze rilevate', type: 'number', align: 'right' },
  { key: 'approvals_count', label: 'Approvazioni', type: 'number', align: 'right' },
  { key: 'created_at', label: 'Creato il', type: 'string' }
];

const formSchema = [
  {
    key: 'scope',
    label: 'Scope (JSON opzionale)',
    input: 'textarea',
    placeholder: '[{"item_id":1,"expected":100}]',
    hint: 'Lascia vuoto per creare un inventario su tutti gli articoli.'
  }
];

const buildPayload = (data: InventoryRow) => {
  const { scope } = data;
  if (!scope) {
    return {};
  }
  try {
    const parsed = JSON.parse(scope as string);
    return { scope: parsed };
  } catch (err) {
    throw new Error('Scope non è un JSON valido');
  }
};

const transformResponse = (payload: any) => {
  const list = Array.isArray(payload?.items) ? payload.items : [];
  return list.map((row: InventoryRow) => ({
    ...row,
    scope_items: Array.isArray(row.scope) ? row.scope.length : 0,
    differences_items: Array.isArray(row.differences) ? row.differences.length : 0,
    approvals_count: Array.isArray(row.approvals) ? row.approvals.length : 0,
    created_at: row.created_at ? new Date(row.created_at).toLocaleString() : '',
  }));
};
</script>

<style scoped></style>
