<template>
  <ResourceTablePage
    title="Dashboard KPI"
    description="Indicatori chiave di performance monitorati a livello aziendale."
    new-label="Nuovo indicatore"
    :fields="fields"
    :form-schema="formSchema"
    :sample-data="sampleData"
    empty-label="Nessun indicatore configurato."
  />
</template>

<script setup lang="ts">
import ResourceTablePage from '../../components/ResourceTablePage.vue';

const fields = [
  { key: 'code', label: 'Codice', type: 'string' },
  { key: 'title', label: 'Indicatore', type: 'string' },
  { key: 'area', label: 'Area', type: 'enum', options: ['Vendite', 'Finanza', 'Magazzino', 'HR'] },
  { key: 'value', label: 'Valore', type: 'number', align: 'right' },
  { key: 'target', label: 'Target', type: 'number', align: 'right' },
  { key: 'trend', label: 'Trend', type: 'enum', options: ['up', 'flat', 'down'] },
  { key: 'owner', label: 'Owner', type: 'string' },
  { key: 'updated_at', label: 'Aggiornato', type: 'string' }
];

const formSchema = [
  { key: 'code', label: 'Codice', input: 'text', required: true, placeholder: 'KPI-001' },
  { key: 'title', label: 'Titolo indicatore', input: 'text', required: true },
  {
    key: 'area',
    label: 'Area',
    input: 'select',
    required: true,
    options: [
      { value: 'Vendite', label: 'Vendite' },
      { value: 'Finanza', label: 'Finanza' },
      { value: 'Magazzino', label: 'Magazzino' },
      { value: 'HR', label: 'HR' }
    ]
  },
  { key: 'value', label: 'Valore attuale', input: 'currency', placeholder: '0,00' },
  { key: 'target', label: 'Target', input: 'currency', placeholder: '0,00' },
  {
    key: 'trend',
    label: 'Trend',
    input: 'select',
    options: [
      { value: 'up', label: 'In crescita' },
      { value: 'flat', label: 'Stabile' },
      { value: 'down', label: 'In calo' }
    ]
  },
  { key: 'owner', label: 'Owner', input: 'text', placeholder: 'Responsabile' },
  { key: 'updated_at', label: 'Ultimo aggiornamento', input: 'datetime' }
];

const sampleData = [
  {
    id: 'KPI-001',
    code: 'KPI-001',
    title: 'Fatturato mese',
    area: 'Vendite',
    value: 128000,
    target: 120000,
    trend: 'up',
    owner: 'Laura Bianchi',
    updated_at: '2025-09-15 08:45'
  },
  {
    id: 'KPI-002',
    code: 'KPI-002',
    title: 'Margine operativo',
    area: 'Finanza',
    value: 27.4,
    target: 25,
    trend: 'up',
    owner: 'Filippo Neri',
    updated_at: '2025-09-14 18:20'
  },
  {
    id: 'KPI-003',
    code: 'KPI-003',
    title: 'Rotazione magazzino',
    area: 'Magazzino',
    value: 9.1,
    target: 8,
    trend: 'flat',
    owner: 'Chiara Sartori',
    updated_at: '2025-09-15 06:10'
  },
  {
    id: 'KPI-004',
    code: 'KPI-004',
    title: 'Assenteismo',
    area: 'HR',
    value: 3.2,
    target: 2.5,
    trend: 'down',
    owner: 'Marta Rinaldi',
    updated_at: '2025-09-13 17:05'
  }
];
</script>

<style scoped></style>
