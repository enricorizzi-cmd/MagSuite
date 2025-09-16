<template>
  <ResourceTablePage
    title="Trasferimenti"
    description="Movimenti interni con origine, destinazione e quantità."
    new-label="Nuovo trasferimento"
    endpoint="/transfers"
    :fields="fields"
    :form-schema="formSchema"
    :build-create-payload="buildPayload"
    :build-update-payload="buildPayload"
    empty-label="Nessun trasferimento pianificato."
  />
</template>

<script setup lang="ts">
import ResourceTablePage from '../../components/ResourceTablePage.vue';

type TransferForm = Record<string, any>;

const fields = [
  { key: 'id', label: 'ID', type: 'number', align: 'right' },
  { key: 'item_id', label: 'Articolo', type: 'number', align: 'right' },
  { key: 'source_location_id', label: 'Da ubicazione', type: 'number', align: 'right' },
  { key: 'dest_location_id', label: 'A ubicazione', type: 'number', align: 'right' },
  { key: 'quantity', label: 'Quantità', type: 'number', align: 'right' },
  { key: 'status', label: 'Stato', type: 'string' },
  { key: 'document_id', label: 'Documento', type: 'number', align: 'right' }
];

const formSchema = [
  { key: 'item_id', label: 'ID articolo', input: 'number', required: true },
  { key: 'source_location_id', label: 'Ubicazione origine', input: 'number', required: true },
  { key: 'dest_location_id', label: 'Ubicazione destinazione', input: 'number', required: true },
  { key: 'quantity', label: 'Quantità', input: 'number', required: true }
];

const buildPayload = (data: TransferForm) => ({
  item_id: Number(data.item_id),
  source_location_id: Number(data.source_location_id),
  dest_location_id: Number(data.dest_location_id),
  quantity: Number(data.quantity),
});
</script>

<style scoped></style>
