<template>
  <ResourceTablePage
    title="Supply Base"
    description="Valutazione fornitori: rating, lead time e stato qualifica."
    new-label="Nuovo fornitore"
    :fields="fields"
    :form-schema="formSchema"
    :sample-data="sampleData"
    empty-label="Nessun fornitore qualificato."
  />
</template>

<script setup lang="ts">
import ResourceTablePage from '../../components/ResourceTablePage.vue';

const fields = [
  { key: 'code', label: 'Codice', type: 'string' },
  { key: 'name', label: 'Fornitore', type: 'string' },
  { key: 'category', label: 'Categoria', type: 'enum', options: ['Materiali', 'Servizi', 'Trasporti', 'IT'] },
  { key: 'rating', label: 'Rating', type: 'number', align: 'right' },
  { key: 'lead_time', label: 'Lead time gg', type: 'number', align: 'right' },
  { key: 'status', label: 'Stato', type: 'enum', options: ['Qualificato', 'In qualifica', 'Sospeso'] },
  { key: 'buyer', label: 'Buyer', type: 'string' },
  { key: 'last_order', label: 'Ultimo ordine', type: 'string' }
];

const formSchema = [
  { key: 'code', label: 'Codice', input: 'text', required: true, placeholder: 'FOR-001' },
  { key: 'name', label: 'Ragione sociale', input: 'text', required: true },
  {
    key: 'category',
    label: 'Categoria',
    input: 'select',
    options: [
      { value: 'Materiali', label: 'Materiali' },
      { value: 'Servizi', label: 'Servizi' },
      { value: 'Trasporti', label: 'Trasporti' },
      { value: 'IT', label: 'IT' }
    ]
  },
  { key: 'rating', label: 'Rating', input: 'number', placeholder: '1-10' },
  { key: 'lead_time', label: 'Lead time (giorni)', input: 'number' },
  {
    key: 'status',
    label: 'Stato',
    input: 'select',
    options: [
      { value: 'Qualificato', label: 'Qualificato' },
      { value: 'In qualifica', label: 'In qualifica' },
      { value: 'Sospeso', label: 'Sospeso' }
    ]
  },
  { key: 'buyer', label: 'Buyer', input: 'text' },
  { key: 'last_order', label: 'Ultimo ordine', input: 'date' }
];

const sampleData = [
  {
    id: 'FOR-001',
    code: 'FOR-001',
    name: 'SteelWorks Spa',
    category: 'Materiali',
    rating: 8.9,
    lead_time: 12,
    status: 'Qualificato',
    buyer: 'Elisa Monti',
    last_order: '2025-09-10'
  },
  {
    id: 'FOR-014',
    code: 'FOR-014',
    name: 'Elettroimpianti Srl',
    category: 'Servizi',
    rating: 7.5,
    lead_time: 9,
    status: 'Qualificato',
    buyer: 'Paolo Grandi',
    last_order: '2025-09-07'
  },
  {
    id: 'FOR-021',
    code: 'FOR-021',
    name: 'GreenTransport Logistics',
    category: 'Trasporti',
    rating: 6.8,
    lead_time: 3,
    status: 'In qualifica',
    buyer: 'Marta Colombo',
    last_order: '2025-08-29'
  }
];
</script>

<style scoped></style>
