<template>
  <ResourceTablePage
    title="Pianificazione MRP"
    description="Fabbisogni materiali e proposte di approvvigionamento."
    new-label="Nuova proposta"
    :fields="fields"
    :form-schema="formSchema"
    :sample-data="sampleData"
    empty-label="Nessuna proposta MRP."
  />
</template>

<script setup lang="ts">
import ResourceTablePage from '../../components/ResourceTablePage.vue';

const fields = [
  { key: 'plan', label: 'Piano', type: 'string' },
  { key: 'item', label: 'Articolo', type: 'string' },
  { key: 'warehouse', label: 'Magazzino', type: 'enum', options: ['HQ', 'Magazzino Nord', 'Magazzino Sud'] },
  { key: 'need_date', label: 'Data bisogno', type: 'string' },
  { key: 'quantity', label: 'Quantità', type: 'number', align: 'right' },
  { key: 'supply', label: 'Copertura', type: 'enum', options: ['Produzione', 'Acquisto', 'Trasferimento'] },
  { key: 'status', label: 'Stato', type: 'enum', options: ['Proposto', 'Rilasciato', 'Confermato'] },
  { key: 'note', label: 'Note', type: 'string' }
];

const formSchema = [
  { key: 'plan', label: 'Piano', input: 'text', required: true, placeholder: 'MRP-2025-09' },
  { key: 'item', label: 'Articolo', input: 'text', required: true },
  {
    key: 'warehouse',
    label: 'Magazzino',
    input: 'select',
    options: [
      { value: 'HQ', label: 'HQ' },
      { value: 'Magazzino Nord', label: 'Magazzino Nord' },
      { value: 'Magazzino Sud', label: 'Magazzino Sud' }
    ]
  },
  { key: 'need_date', label: 'Data bisogno', input: 'date', required: true },
  { key: 'quantity', label: 'Quantità', input: 'number' },
  {
    key: 'supply',
    label: 'Copertura',
    input: 'select',
    options: [
      { value: 'Produzione', label: 'Produzione' },
      { value: 'Acquisto', label: 'Acquisto' },
      { value: 'Trasferimento', label: 'Trasferimento' }
    ]
  },
  {
    key: 'status',
    label: 'Stato',
    input: 'select',
    options: [
      { value: 'Proposto', label: 'Proposto' },
      { value: 'Rilasciato', label: 'Rilasciato' },
      { value: 'Confermato', label: 'Confermato' }
    ]
  },
  { key: 'note', label: 'Note', input: 'textarea', placeholder: 'Info aggiuntive' }
];

const sampleData = [
  {
    id: 'MRP-2025-09-001',
    plan: 'MRP-2025-09',
    item: 'ART-00045',
    warehouse: 'Magazzino Nord',
    need_date: '2025-09-28',
    quantity: 80,
    supply: 'Acquisto',
    status: 'Proposto',
    note: 'Lead time 7 gg'
  },
  {
    id: 'MRP-2025-09-004',
    plan: 'MRP-2025-09',
    item: 'ART-00211',
    warehouse: 'HQ',
    need_date: '2025-10-02',
    quantity: 1200,
    supply: 'Produzione',
    status: 'Rilasciato',
    note: 'Ordine produzione PRD-458 in lavorazione'
  },
  {
    id: 'MRP-2025-10-002',
    plan: 'MRP-2025-10',
    item: 'ART-00870',
    warehouse: 'Magazzino Sud',
    need_date: '2025-10-12',
    quantity: 420,
    supply: 'Trasferimento',
    status: 'Confermato',
    note: 'Trasferimento da Mag Nord'
  }
];
</script>

<style scoped></style>
