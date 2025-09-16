<template>
  <ResourceTablePage
    title="Operatori"
    description="Utenti operativi abilitati con ruolo e warehouse associato."
    new-label="Nuovo operatore"
    endpoint="/users"
    :fields="fields"
    :form-schema="formSchema"
    :transform-response="transformResponse"
    :build-create-payload="buildPayload"
    :build-update-payload="buildPayload"
    empty-label="Nessun operatore registrato."
  />
</template>

<script setup lang="ts">
import ResourceTablePage from '../../components/ResourceTablePage.vue';

const fields = [
  { key: 'id', label: 'ID', type: 'number', align: 'right' },
  { key: 'name', label: 'Nome', type: 'string' },
  { key: 'role', label: 'Ruolo', type: 'string' },
  { key: 'warehouseId', label: 'Warehouse', type: 'number', align: 'right' }
];

const formSchema = [
  { key: 'name', label: 'Nome e cognome', input: 'text', required: true },
  { key: 'role', label: 'Ruolo', input: 'text', placeholder: 'user, admin…' },
  { key: 'warehouseId', label: 'ID warehouse', input: 'number', placeholder: 'Opcionale' }
];

const transformResponse = (payload: any) => {
  const list = Array.isArray(payload?.users) ? payload.users : [];
  return list.map((row: any) => ({
    ...row,
    warehouseId: row.warehouseId ?? null,
  }));
};

const buildPayload = (data: Record<string, any>) => ({
  name: data.name?.trim() || null,
  role: data.role?.trim() || 'user',
  warehouseId: data.warehouseId === '' || data.warehouseId === undefined ? null : Number(data.warehouseId),
});
</script>

<style scoped></style>
