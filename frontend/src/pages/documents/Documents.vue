<template>
  <ResourceTablePage
    title="Documenti"
    description="Repository documentale con stato e canale di emissione."
    new-label="Nuovo documento"
    :fields="fields"
    :form-schema="formSchema"
    :sample-data="sampleData"
    empty-label="Nessun documento disponibile."
  />
</template>

<script setup lang="ts">
import ResourceTablePage from '../../components/ResourceTablePage.vue';

const fields = [
  { key: 'number', label: 'Numero', type: 'string' },
  { key: 'type', label: 'Tipo', type: 'enum', options: ['Ordine', 'DDT', 'Fattura', 'Preventivo'] },
  { key: 'counterparty', label: 'Contropartita', type: 'string' },
  { key: 'channel', label: 'Canale', type: 'enum', options: ['Portale', 'Email', 'Cartaceo'] },
  { key: 'date', label: 'Data', type: 'string' },
  { key: 'amount', label: 'Importo', type: 'number', align: 'right' },
  { key: 'status', label: 'Stato', type: 'enum', options: ['Bozza', 'Emesso', 'In approvazione', 'Annullato'] }
];

const formSchema = [
  { key: 'number', label: 'Numero documento', input: 'text', required: true, placeholder: 'FT/2025/001' },
  {
    key: 'type',
    label: 'Tipo',
    input: 'select',
    options: [
      { value: 'Ordine', label: 'Ordine' },
      { value: 'DDT', label: 'DDT' },
      { value: 'Fattura', label: 'Fattura' },
      { value: 'Preventivo', label: 'Preventivo' }
    ]
  },
  { key: 'counterparty', label: 'Contropartita', input: 'text', required: true },
  {
    key: 'channel',
    label: 'Canale',
    input: 'select',
    options: [
      { value: 'Portale', label: 'Portale' },
      { value: 'Email', label: 'Email' },
      { value: 'Cartaceo', label: 'Cartaceo' }
    ]
  },
  { key: 'date', label: 'Data', input: 'date', required: true },
  { key: 'amount', label: 'Importo', input: 'currency' },
  {
    key: 'status',
    label: 'Stato',
    input: 'select',
    options: [
      { value: 'Bozza', label: 'Bozza' },
      { value: 'Emesso', label: 'Emesso' },
      { value: 'In approvazione', label: 'In approvazione' },
      { value: 'Annullato', label: 'Annullato' }
    ]
  }
];

const sampleData = [
  {
    id: 'DOC-FT-2025-001',
    number: 'FT/2025/0001',
    type: 'Fattura',
    counterparty: 'Tecno Srl',
    channel: 'Email',
    date: '2025-09-02',
    amount: 18250,
    status: 'Emesso'
  },
  {
    id: 'DOC-ORD-2025-045',
    number: 'ORD/2025/0045',
    type: 'Ordine',
    counterparty: 'SteelWorks Spa',
    channel: 'Portale',
    date: '2025-09-10',
    amount: 28400,
    status: 'In approvazione'
  },
  {
    id: 'DOC-DDT-2025-112',
    number: 'DDT/2025/0112',
    type: 'DDT',
    counterparty: 'Mercurio Group',
    channel: 'Cartaceo',
    date: '2025-09-08',
    amount: 0,
    status: 'Bozza'
  }
];
</script>

<style scoped></style>
