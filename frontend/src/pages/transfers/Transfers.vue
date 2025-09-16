<template>
  <ResourceTablePage
    title="Trasferimenti"
    description="Movimenti inter-magazzino con stato, righe e vettore incaricato."
    new-label="Nuovo trasferimento"
    :fields="fields"
    :form-schema="formSchema"
    :sample-data="sampleData"
    empty-label="Nessun trasferimento pianificato."
  />
</template>

<script setup lang="ts">
import ResourceTablePage from '../../components/ResourceTablePage.vue';

const fields = [
  { key: 'reference', label: 'Riferimento', type: 'string' },
  { key: 'from_location', label: 'Da', type: 'string' },
  { key: 'to_location', label: 'A', type: 'string' },
  { key: 'status', label: 'Stato', type: 'enum', options: ['Bozza', 'In transito', 'Completato', 'Annullato'] },
  { key: 'lines', label: 'Righe', type: 'number', align: 'right' },
  { key: 'scheduled_at', label: 'Pianificato', type: 'string' },
  { key: 'completed_at', label: 'Completato', type: 'string' },
  { key: 'carrier', label: 'Vettore', type: 'string' }
];

const formSchema = [
  { key: 'reference', label: 'Riferimento', input: 'text', required: true, placeholder: 'TRF-2025-0012' },
  { key: 'from_location', label: 'Magazzino partenza', input: 'text', required: true },
  { key: 'to_location', label: 'Magazzino arrivo', input: 'text', required: true },
  {
    key: 'status',
    label: 'Stato',
    input: 'select',
    options: [
      { value: 'Bozza', label: 'Bozza' },
      { value: 'In transito', label: 'In transito' },
      { value: 'Completato', label: 'Completato' },
      { value: 'Annullato', label: 'Annullato' }
    ]
  },
  { key: 'lines', label: 'Numero righe', input: 'number' },
  { key: 'scheduled_at', label: 'Data pianificata', input: 'datetime' },
  { key: 'completed_at', label: 'Data completamento', input: 'datetime' },
  { key: 'carrier', label: 'Vettore', input: 'text' }
];

const sampleData = [
  {
    id: 'TRF-2025-0012',
    reference: 'TRF-2025-0012',
    from_location: 'Magazzino Nord',
    to_location: 'Magazzino Sud',
    status: 'In transito',
    lines: 42,
    scheduled_at: '2025-09-16 06:30',
    completed_at: '',
    carrier: 'GreenTransport Logistics'
  },
  {
    id: 'TRF-2025-0010',
    reference: 'TRF-2025-0010',
    from_location: 'HQ',
    to_location: 'Magazzino Nord',
    status: 'Completato',
    lines: 18,
    scheduled_at: '2025-09-10 08:00',
    completed_at: '2025-09-11 15:45',
    carrier: 'Fleet interno'
  },
  {
    id: 'TRF-2025-0013',
    reference: 'TRF-2025-0013',
    from_location: 'Magazzino Sud',
    to_location: 'Hub E-commerce',
    status: 'Bozza',
    lines: 9,
    scheduled_at: '2025-09-20 07:30',
    completed_at: '',
    carrier: 'Express Cargo'
  }
];
</script>

<style scoped></style>
