<template>
  <ResourceTablePage
    title="Turni"
    description="Programmazione turni per squadra e sito con copertura prevista."
    new-label="Nuovo turno"
    :fields="fields"
    :form-schema="formSchema"
    :sample-data="sampleData"
    empty-label="Nessun turno pianificato."
  />
</template>

<script setup lang="ts">
import ResourceTablePage from '../../components/ResourceTablePage.vue';

const fields = [
  { key: 'week', label: 'Settimana', type: 'string' },
  { key: 'team', label: 'Squadra', type: 'string' },
  { key: 'site', label: 'Sede', type: 'enum', options: ['HQ', 'Magazzino Nord', 'Magazzino Sud'] },
  { key: 'shift', label: 'Turno', type: 'enum', options: ['Mattina', 'Pomeriggio', 'Notte'] },
  { key: 'from', label: 'Dal', type: 'string' },
  { key: 'to', label: 'Al', type: 'string' },
  { key: 'coverage', label: 'Copertura %', type: 'number', align: 'right' },
  { key: 'supervisor', label: 'Supervisor', type: 'string' }
];

const formSchema = [
  { key: 'week', label: 'Settimana', input: 'text', required: true, placeholder: '2025-W38' },
  { key: 'team', label: 'Squadra', input: 'text', required: true },
  {
    key: 'site',
    label: 'Sede',
    input: 'select',
    options: [
      { value: 'HQ', label: 'HQ' },
      { value: 'Magazzino Nord', label: 'Magazzino Nord' },
      { value: 'Magazzino Sud', label: 'Magazzino Sud' }
    ]
  },
  {
    key: 'shift',
    label: 'Turno',
    input: 'select',
    options: [
      { value: 'Mattina', label: 'Mattina' },
      { value: 'Pomeriggio', label: 'Pomeriggio' },
      { value: 'Notte', label: 'Notte' }
    ]
  },
  { key: 'from', label: 'Dal', input: 'date', required: true },
  { key: 'to', label: 'Al', input: 'date', required: true },
  { key: 'coverage', label: 'Copertura %', input: 'number', placeholder: '0-100' },
  { key: 'supervisor', label: 'Supervisor', input: 'text' }
];

const sampleData = [
  {
    id: 'SHIFT-2025W38-A',
    week: '2025-W38',
    team: 'Picking A',
    site: 'Magazzino Nord',
    shift: 'Mattina',
    from: '2025-09-16',
    to: '2025-09-22',
    coverage: 98,
    supervisor: 'Elisa Romero'
  },
  {
    id: 'SHIFT-2025W38-B',
    week: '2025-W38',
    team: 'Ricevimento B',
    site: 'Magazzino Sud',
    shift: 'Notte',
    from: '2025-09-16',
    to: '2025-09-22',
    coverage: 88,
    supervisor: 'Marco Villa'
  },
  {
    id: 'SHIFT-2025W37-C',
    week: '2025-W37',
    team: 'Customer Care',
    site: 'HQ',
    shift: 'Pomeriggio',
    from: '2025-09-09',
    to: '2025-09-15',
    coverage: 92,
    supervisor: 'Chiara Lodi'
  }
];
</script>

<style scoped></style>
