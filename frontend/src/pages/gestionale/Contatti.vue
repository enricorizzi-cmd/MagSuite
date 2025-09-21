<template>
  <ResourceTablePage
    title="Contatti"
    description="Referenti commerciali e operativi collegati agli ordini."
    new-label="Nuovo contatto"
    :show-new="false"
    :show-actions="false"
    endpoint="/gestionale/contacts"
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
  { key: 'email', label: 'Email', type: 'string' },
  { key: 'phone', label: 'Telefono', type: 'string' },
  { key: 'type', label: 'Ruolo', type: 'string' }
];

const transformResponse = (payload: any) => {
  return Array.isArray(payload?.items) ? payload.items : [];
};
</script>
