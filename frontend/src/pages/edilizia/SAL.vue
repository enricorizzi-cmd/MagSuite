<template>
  <ResourceTablePage
    title="Stato Avanzamento Lavori"
    description="Situazione SAL cantieri con percentuale completamento e certificazione."
    new-label="Nuovo SAL"
    :fields="fields"
    :form-schema="formSchema"
    :sample-data="sampleData"
    empty-label="Nessun SAL registrato."
  />
</template>

<script setup lang="ts">
import ResourceTablePage from '../../components/ResourceTablePage.vue';

const fields = [
  { key: 'site', label: 'Cantiere', type: 'string' },
  { key: 'phase', label: 'Fase', type: 'enum', options: ['Strutturale', 'Impiantistica', 'Finiture'] },
  { key: 'progress', label: 'Avanzamento %', type: 'number', align: 'right' },
  { key: 'planned', label: 'Pianificato %', type: 'number', align: 'right' },
  { key: 'delta', label: 'Delta %', type: 'number', align: 'right' },
  { key: 'certified', label: 'Certificato', type: 'boolean' },
  { key: 'manager', label: 'PM', type: 'string' }
];

const formSchema = [
  { key: 'site', label: 'Cantiere', input: 'text', required: true },
  {
    key: 'phase',
    label: 'Fase',
    input: 'select',
    required: true,
    options: [
      { value: 'Strutturale', label: 'Strutturale' },
      { value: 'Impiantistica', label: 'Impiantistica' },
      { value: 'Finiture', label: 'Finiture' }
    ]
  },
  { key: 'progress', label: 'Avanzamento %', input: 'number', placeholder: '0-100' },
  { key: 'planned', label: 'Pianificato %', input: 'number', placeholder: '0-100' },
  { key: 'delta', label: 'Delta %', input: 'number', placeholder: '-100-100', hint: 'Calcolato automaticamente come differenza tra avanzamento e pianificato.' },
  { key: 'certified', label: 'Certificato dal DL', input: 'checkbox' },
  { key: 'manager', label: 'Project manager', input: 'text' }
];

const sampleData = [
  {
    id: 'SAL-CNTR-01',
    site: 'Magazzino Pharma - Bologna',
    phase: 'Strutturale',
    progress: 55,
    planned: 60,
    delta: -5,
    certified: false,
    manager: 'Paolo Grandi'
  },
  {
    id: 'SAL-CNTR-02',
    site: 'Hub Alimentare - Parma',
    phase: 'Impiantistica',
    progress: 42,
    planned: 38,
    delta: 4,
    certified: true,
    manager: 'Marta Colombo'
  },
  {
    id: 'SAL-CNTR-03',
    site: 'Centro Logistico Bari',
    phase: 'Finiture',
    progress: 88,
    planned: 85,
    delta: 3,
    certified: true,
    manager: 'Luigi Ferri'
  }
];
</script>

<style scoped></style>
