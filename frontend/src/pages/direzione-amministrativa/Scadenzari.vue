<template>
  <ResourceTablePage
    title="Scadenzari"
    description="Scadenze attive di clienti e fornitori con stato di incasso/pagamento."
    new-label="Nuova scadenza"
    :fields="fields"
    :form-schema="formSchema"
    :sample-data="sampleData"
    empty-label="Nessuna scadenza pianificata."
  />
</template>

<script setup lang="ts">
import ResourceTablePage from '../../components/ResourceTablePage.vue';

const fields = [
  { key: 'document', label: 'Documento', type: 'string' },
  { key: 'customer', label: 'Contropartita', type: 'string' },
  { key: 'category', label: 'Categoria', type: 'enum', options: ['Clienti', 'Fornitori', 'Fisco'] },
  { key: 'due_date', label: 'Scadenza', type: 'string' },
  { key: 'amount', label: 'Importo', type: 'number', align: 'right' },
  { key: 'status', label: 'Stato', type: 'enum', options: ['Da incassare', 'Incassato', 'Scaduto', 'Programmato'] },
  { key: 'aging', label: 'Giorni ritardo', type: 'number', align: 'right' }
];

const formSchema = [
  { key: 'document', label: 'Documento', input: 'text', required: true, placeholder: 'FT/2025/0156' },
  { key: 'customer', label: 'Contropartita', input: 'text', required: true },
  {
    key: 'category',
    label: 'Categoria',
    input: 'select',
    options: [
      { value: 'Clienti', label: 'Clienti' },
      { value: 'Fornitori', label: 'Fornitori' },
      { value: 'Fisco', label: 'Fisco' }
    ]
  },
  { key: 'due_date', label: 'Data scadenza', input: 'date', required: true },
  { key: 'amount', label: 'Importo', input: 'currency' },
  {
    key: 'status',
    label: 'Stato',
    input: 'select',
    options: [
      { value: 'Da incassare', label: 'Da incassare' },
      { value: 'Incassato', label: 'Incassato' },
      { value: 'Scaduto', label: 'Scaduto' },
      { value: 'Programmato', label: 'Programmato' }
    ]
  },
  { key: 'aging', label: 'Giorni ritardo', input: 'number', placeholder: '0', hint: 'Valorizzare solo se la scadenza è oltre termine.' }
];

const sampleData = [
  {
    id: 'SC-CL-2025-156',
    document: 'FT/2025/0156',
    customer: 'Tecno Srl',
    category: 'Clienti',
    due_date: '2025-09-20',
    amount: 18250,
    status: 'Da incassare',
    aging: 0
  },
  {
    id: 'SC-FR-2025-078',
    document: 'FA/2025/0078',
    customer: 'LogiTrans SpA',
    category: 'Fornitori',
    due_date: '2025-09-10',
    amount: 12680,
    status: 'Scaduto',
    aging: 5
  },
  {
    id: 'SC-FI-2025-091',
    document: 'F24/2025/091',
    customer: 'Agenzia Entrate',
    category: 'Fisco',
    due_date: '2025-10-16',
    amount: 8400,
    status: 'Programmato',
    aging: 0
  },
  {
    id: 'SC-CL-2025-188',
    document: 'FT/2025/0188',
    customer: 'MarketPlus SRL',
    category: 'Clienti',
    due_date: '2025-09-05',
    amount: 9650,
    status: 'Incassato',
    aging: 0
  }
];
</script>

<style scoped></style>
