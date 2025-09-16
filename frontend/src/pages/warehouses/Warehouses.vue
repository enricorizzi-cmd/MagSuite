<template>
  <ResourceTablePage
    title="Magazzini"
    description="Elenco magazzini disponibili."
    new-label="Nuovo magazzino"
    endpoint="/warehouses"
    :fields="fields"
    :form-schema="formSchema"
    :build-create-payload="buildPayload"
    :build-update-payload="buildPayload"
    empty-label="Nessun magazzino censito."
  />
</template>

<script setup lang="ts">
import ResourceTablePage from '../../components/ResourceTablePage.vue';

const fields = [
  { key: 'id', label: 'ID', type: 'number', align: 'right' },
  { key: 'name', label: 'Nome', type: 'string' }
];

const formSchema = [
  { key: 'name', label: 'Nome magazzino', input: 'text', required: true }
];

const buildPayload = (data: Record<string, any>) => ({
  name: data.name?.trim() || null,
});
</script>

<style scoped></style>
