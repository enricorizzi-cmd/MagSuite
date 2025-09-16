<template>
  <ResourceTablePage
    title="Clienti"
    description="Anagrafica clienti con contatti e termini di pagamento."
    new-label="Nuovo cliente"
    endpoint="/customers"
    :fields="fields"
    :form-schema="formSchema"
    :transform-response="transformResponse"
    :build-create-payload="buildPayload"
    :build-update-payload="buildPayload"
    server-pagination
    empty-label="Nessun cliente presente."
  />
</template>

<script setup lang="ts">
import ResourceTablePage from '../../components/ResourceTablePage.vue';

const fields = [
  { key: 'code', label: 'Codice', type: 'string' },
  { key: 'name', label: 'Nome', type: 'string' },
  { key: 'email', label: 'Email', type: 'string' },
  { key: 'phone', label: 'Telefono', type: 'string' },
  { key: 'city', label: 'Città', type: 'string' },
  { key: 'country', label: 'Paese', type: 'string' },
  { key: 'payment_terms', label: 'Pagamento', type: 'string' },
  { key: 'created_at', label: 'Creato il', type: 'string' }
];

const formSchema = [
  { key: 'code', label: 'Codice', input: 'text', required: true, placeholder: 'CL-0001' },
  { key: 'name', label: 'Ragione sociale', input: 'text', required: true },
  { key: 'vat_number', label: 'Partita IVA', input: 'text' },
  { key: 'tax_code', label: 'Codice fiscale', input: 'text' },
  { key: 'email', label: 'Email', input: 'text', placeholder: 'cliente@example.com' },
  { key: 'phone', label: 'Telefono', input: 'text' },
  { key: 'address', label: 'Indirizzo', input: 'text' },
  { key: 'city', label: 'Città', input: 'text' },
  { key: 'province', label: 'Provincia', input: 'text' },
  { key: 'postal_code', label: 'CAP', input: 'text' },
  { key: 'country', label: 'Paese', input: 'text', placeholder: 'Italia' },
  { key: 'payment_terms', label: 'Termini pagamento', input: 'text' },
  { key: 'price_list', label: 'Listino', input: 'text' },
  { key: 'agent', label: 'Agente', input: 'text' },
  { key: 'classifier_a', label: 'Classificatore A', input: 'text' },
  { key: 'classifier_b', label: 'Classificatore B', input: 'text' },
  { key: 'classifier_c', label: 'Classificatore C', input: 'text' },
  { key: 'notes', label: 'Note', input: 'textarea', placeholder: 'Informazioni aggiuntive' }
];

const editableKeys = formSchema.map((f) => f.key);

const buildPayload = (data: Record<string, any>) => {
  const payload: Record<string, any> = {};
  for (const key of editableKeys) {
    const value = data[key];
    payload[key] = value === '' || value === undefined ? null : value;
  }
  return payload;
};

const transformResponse = (payload: any) => {
  const list = Array.isArray(payload?.items) ? payload.items : [];
  return list.map((row: Record<string, any>) => ({
    ...row,
    created_at: row.created_at ? new Date(row.created_at).toLocaleString() : '',
  }));
};
</script>

<style scoped></style>
