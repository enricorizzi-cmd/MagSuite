<template>
  <ResourceTablePage
    title="Ordini di Acquisto"
    description="Tracciamento ordini fornitori con stato, delivery attesa e buyer."
    new-label="Nuovo ordine"
    :fields="fields"
    :form-schema="formSchema"
    :sample-data="sampleData"
    empty-label="Nessun ordine presente."
  />
</template>

<script setup lang="ts">
import ResourceTablePage from '../../components/ResourceTablePage.vue';

const fields = [
  { key: 'number', label: 'Numero', type: 'string' },
  { key: 'supplier', label: 'Fornitore', type: 'string' },
  { key: 'status', label: 'Stato', type: 'enum', options: ['Bozza', 'In approvazione', 'Confermato', 'Ricevuto parziale', 'Chiuso'] },
  { key: 'expected_date', label: 'Data prevista', type: 'string' },
  { key: 'total', label: 'Totale', type: 'number', align: 'right' },
  { key: 'buyer', label: 'Buyer', type: 'string' },
  { key: 'created_at', label: 'Creato il', type: 'string' }
];

const formSchema = [
  { key: 'number', label: 'Numero ordine', input: 'text', required: true, placeholder: 'PO/2025/010' },
  { key: 'supplier', label: 'Fornitore', input: 'text', required: true },
  {
    key: 'status',
    label: 'Stato',
    input: 'select',
    options: [
      { value: 'Bozza', label: 'Bozza' },
      { value: 'In approvazione', label: 'In approvazione' },
      { value: 'Confermato', label: 'Confermato' },
      { value: 'Ricevuto parziale', label: 'Ricevuto parziale' },
      { value: 'Chiuso', label: 'Chiuso' }
    ]
  },
  { key: 'expected_date', label: 'Data prevista', input: 'date' },
  { key: 'total', label: 'Totale', input: 'currency' },
  { key: 'buyer', label: 'Buyer', input: 'text' },
  { key: 'created_at', label: 'Data creazione', input: 'date' }
];

const sampleData = [
  {
    id: 'PO-2025-045',
    number: 'PO/2025/0045',
    supplier: 'SteelWorks Spa',
    status: 'In approvazione',
    expected_date: '2025-09-25',
    total: 28400,
    buyer: 'Elisa Monti',
    created_at: '2025-09-10'
  },
  {
    id: 'PO-2025-052',
    number: 'PO/2025/0052',
    supplier: 'Elettroimpianti Srl',
    status: 'Confermato',
    expected_date: '2025-09-22',
    total: 16800,
    buyer: 'Paolo Grandi',
    created_at: '2025-09-08'
  },
  {
    id: 'PO-2025-039',
    number: 'PO/2025/0039',
    supplier: 'LabelTech SRL',
    status: 'Ricevuto parziale',
    expected_date: '2025-09-15',
    total: 9400,
    buyer: 'Chiara Sartori',
    created_at: '2025-09-02'
  }
];
</script>

<style scoped></style>
