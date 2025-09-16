<template>
  <ResourceTablePage
    title="Business Planning"
    description="Pipeline commerciale, probabilità di chiusura e stato delle opportunità."
    new-label="Nuova opportunità"
    :fields="fields"
    :form-schema="formSchema"
    :sample-data="sampleData"
    empty-label="Nessuna opportunità in pipeline."
  />
</template>

<script setup lang="ts">
import ResourceTablePage from '../../components/ResourceTablePage.vue';

const fields = [
  { key: 'deal', label: 'Opportunità', type: 'string' },
  { key: 'customer', label: 'Cliente', type: 'string' },
  { key: 'stage', label: 'Stadio', type: 'enum', options: ['Qualificazione', 'Proposta', 'Negoziazione', 'Chiuso vinto', 'Chiuso perso'] },
  { key: 'value', label: 'Valore', type: 'number', align: 'right' },
  { key: 'probability', label: 'Prob %', type: 'number', align: 'right' },
  { key: 'expected_close', label: 'Chiusura attesa', type: 'string' },
  { key: 'status', label: 'Esito', type: 'enum', options: ['Aperta', 'Vinta', 'Persa', 'On hold'] },
  { key: 'owner', label: 'Owner', type: 'string' }
];

const formSchema = [
  { key: 'deal', label: 'Nome opportunità', input: 'text', required: true },
  { key: 'customer', label: 'Cliente', input: 'text', required: true },
  {
    key: 'stage',
    label: 'Stadio',
    input: 'select',
    required: true,
    options: [
      { value: 'Qualificazione', label: 'Qualificazione' },
      { value: 'Proposta', label: 'Proposta' },
      { value: 'Negoziazione', label: 'Negoziazione' },
      { value: 'Chiuso vinto', label: 'Chiuso vinto' },
      { value: 'Chiuso perso', label: 'Chiuso perso' }
    ]
  },
  { key: 'value', label: 'Valore stimato', input: 'currency' },
  { key: 'probability', label: 'Probabilità %', input: 'number', placeholder: '0-100' },
  { key: 'expected_close', label: 'Data chiusura attesa', input: 'date' },
  {
    key: 'status',
    label: 'Esito',
    input: 'select',
    options: [
      { value: 'Aperta', label: 'Aperta' },
      { value: 'Vinta', label: 'Vinta' },
      { value: 'Persa', label: 'Persa' },
      { value: 'On hold', label: 'On hold' }
    ]
  },
  { key: 'owner', label: 'Owner', input: 'text', placeholder: 'Account manager' }
];

const sampleData = [
  {
    id: 'BP-2025-021',
    deal: 'Soluzione WMS per FreshLog',
    customer: 'FreshLog Srl',
    stage: 'Negoziazione',
    value: 96000,
    probability: 65,
    expected_close: '2025-10-05',
    status: 'Aperta',
    owner: 'Giulia Moretti'
  },
  {
    id: 'BP-2025-017',
    deal: 'Suite MagSuite + IoT',
    customer: 'GlobalChem SpA',
    stage: 'Proposta',
    value: 182000,
    probability: 45,
    expected_close: '2025-11-15',
    status: 'Aperta',
    owner: 'Andrea Costa'
  },
  {
    id: 'BP-2025-013',
    deal: 'Ridisegno processi logistica',
    customer: 'Mercurio Group',
    stage: 'Chiuso vinto',
    value: 134500,
    probability: 100,
    expected_close: '2025-08-22',
    status: 'Vinta',
    owner: 'Laura Bianchi'
  }
];
</script>

<style scoped></style>
