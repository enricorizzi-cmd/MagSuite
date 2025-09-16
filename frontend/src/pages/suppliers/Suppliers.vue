<template>
  <ResourceTablePage
    title="Fornitori"
    description="Anagrafica fornitori associati all'azienda."
    new-label="Nuovo fornitore"
    endpoint="/suppliers"
    :fields="fields"
    :form-schema="formSchema"
    :build-create-payload="buildPayload"
    :build-update-payload="buildPayload"
    server-pagination
    empty-label="Nessun fornitore disponibile."
  />
</template>

<script setup lang="ts">
import ResourceTablePage from '../../components/ResourceTablePage.vue';

const fields = [
  { key: 'id', label: 'ID', type: 'number', align: 'right' },
  { key: 'name', label: 'Nome', type: 'string' }
];

const formSchema = [
  { key: 'name', label: 'Nome', input: 'text', required: true }
];

const buildPayload = (data: Record<string, any>) => ({
  name: data.name?.trim() || null,
});
</script>

<style scoped></style>
