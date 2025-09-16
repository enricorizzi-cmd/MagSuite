<template>
  <ResourceTablePage
    title="Ferie e Permessi"
    description="Gestione richieste ferie/permessi con stato di approvazione."
    new-label="Nuova richiesta"
    :fields="fields"
    :form-schema="formSchema"
    :sample-data="sampleData"
    empty-label="Nessuna richiesta registrata."
  />
</template>

<script setup lang="ts">
import ResourceTablePage from '../../components/ResourceTablePage.vue';

const fields = [
  { key: 'employee', label: 'Dipendente', type: 'string' },
  { key: 'type', label: 'Tipo', type: 'enum', options: ['Ferie', 'Permesso', 'Malattia', 'ROL'] },
  { key: 'start', label: 'Dal', type: 'string' },
  { key: 'end', label: 'Al', type: 'string' },
  { key: 'days', label: 'Giorni', type: 'number', align: 'right' },
  { key: 'status', label: 'Stato', type: 'enum', options: ['Approvato', 'In approvazione', 'Rifiutato'] },
  { key: 'approver', label: 'Approvatore', type: 'string' },
  { key: 'note', label: 'Note', type: 'string' }
];

const formSchema = [
  { key: 'employee', label: 'Dipendente', input: 'text', required: true },
  {
    key: 'type',
    label: 'Tipo richiesta',
    input: 'select',
    required: true,
    options: [
      { value: 'Ferie', label: 'Ferie' },
      { value: 'Permesso', label: 'Permesso' },
      { value: 'Malattia', label: 'Malattia' },
      { value: 'ROL', label: 'ROL' }
    ]
  },
  { key: 'start', label: 'Dal', input: 'date', required: true },
  { key: 'end', label: 'Al', input: 'date', required: true },
  { key: 'days', label: 'Giorni', input: 'number', placeholder: 'Durata' },
  {
    key: 'status',
    label: 'Stato',
    input: 'select',
    options: [
      { value: 'Approvato', label: 'Approvato' },
      { value: 'In approvazione', label: 'In approvazione' },
      { value: 'Rifiutato', label: 'Rifiutato' }
    ]
  },
  { key: 'approver', label: 'Approvatore', input: 'text' },
  { key: 'note', label: 'Note', input: 'textarea', placeholder: 'Motivazione o indicazioni' }
];

const sampleData = [
  {
    id: 'LEAVE-2025-091',
    employee: 'Andrea Costa',
    type: 'Ferie',
    start: '2025-09-21',
    end: '2025-09-25',
    days: 4,
    status: 'Approvato',
    approver: 'Marta Rinaldi',
    note: 'Ferie estive residue'
  },
  {
    id: 'LEAVE-2025-094',
    employee: 'Sara Conti',
    type: 'Permesso',
    start: '2025-09-18',
    end: '2025-09-18',
    days: 0.5,
    status: 'In approvazione',
    approver: 'Marta Rinaldi',
    note: 'Visita specialistica'
  },
  {
    id: 'LEAVE-2025-082',
    employee: 'Luca Nervi',
    type: 'ROL',
    start: '2025-09-12',
    end: '2025-09-12',
    days: 1,
    status: 'Approvato',
    approver: 'Paola Gatti',
    note: ''
  }
];
</script>

<style scoped></style>
