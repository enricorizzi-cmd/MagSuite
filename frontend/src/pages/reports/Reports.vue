<template>
  <ResourceTablePage
    title="Reportistica"
    description="Catalogo report schedulati con frequenza e stato di ultima esecuzione."
    new-label="Nuovo report"
    :fields="fields"
    :form-schema="formSchema"
    :sample-data="sampleData"
    empty-label="Nessun report configurato."
  />
</template>

<script setup lang="ts">
import ResourceTablePage from '../../components/ResourceTablePage.vue';

const fields = [
  { key: 'code', label: 'Codice', type: 'string' },
  { key: 'title', label: 'Titolo', type: 'string' },
  { key: 'category', label: 'Categoria', type: 'enum', options: ['Finance', 'Operations', 'Sales', 'HR'] },
  { key: 'frequency', label: 'Frequenza', type: 'enum', options: ['Giornaliero', 'Settimanale', 'Mensile', 'On demand'] },
  { key: 'status', label: 'Stato', type: 'enum', options: ['Attivo', 'In revisione', 'Disattivato'] },
  { key: 'last_run', label: 'Ultima esecuzione', type: 'string' },
  { key: 'owner', label: 'Owner', type: 'string' }
];

const formSchema = [
  { key: 'code', label: 'Codice', input: 'text', required: true, placeholder: 'REP-FIN-01' },
  { key: 'title', label: 'Titolo', input: 'text', required: true },
  {
    key: 'category',
    label: 'Categoria',
    input: 'select',
    options: [
      { value: 'Finance', label: 'Finance' },
      { value: 'Operations', label: 'Operations' },
      { value: 'Sales', label: 'Sales' },
      { value: 'HR', label: 'HR' }
    ]
  },
  {
    key: 'frequency',
    label: 'Frequenza',
    input: 'select',
    options: [
      { value: 'Giornaliero', label: 'Giornaliero' },
      { value: 'Settimanale', label: 'Settimanale' },
      { value: 'Mensile', label: 'Mensile' },
      { value: 'On demand', label: 'On demand' }
    ]
  },
  {
    key: 'status',
    label: 'Stato',
    input: 'select',
    options: [
      { value: 'Attivo', label: 'Attivo' },
      { value: 'In revisione', label: 'In revisione' },
      { value: 'Disattivato', label: 'Disattivato' }
    ]
  },
  { key: 'last_run', label: 'Ultima esecuzione', input: 'datetime' },
  { key: 'owner', label: 'Owner', input: 'text' }
];

const sampleData = [
  {
    id: 'REP-001',
    code: 'REP-FIN-01',
    title: 'Marginalità mensile',
    category: 'Finance',
    frequency: 'Mensile',
    status: 'Attivo',
    last_run: '2025-09-10 06:05',
    owner: 'Filippo Neri'
  },
  {
    id: 'REP-002',
    code: 'REP-OPS-03',
    title: 'Monitoraggio stock critici',
    category: 'Operations',
    frequency: 'Giornaliero',
    status: 'Attivo',
    last_run: '2025-09-15 05:30',
    owner: 'Chiara Sartori'
  },
  {
    id: 'REP-003',
    code: 'REP-SALES-02',
    title: 'Forecast vendite rolling',
    category: 'Sales',
    frequency: 'Settimanale',
    status: 'In revisione',
    last_run: '2025-09-12 08:00',
    owner: 'Andrea Costa'
  }
];
</script>

<style scoped></style>
