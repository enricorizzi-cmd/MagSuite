<template>
  <ResourceTablePage
    title="Entrata/Uscita"
    description="Registro giornaliero timbrature con anomalie evidenziate."
    new-label="Nuova timbratura"
    :fields="fields"
    :form-schema="formSchema"
    :sample-data="sampleData"
    empty-label="Nessuna timbratura registrata."
  />
</template>

<script setup lang="ts">
import ResourceTablePage from '../../components/ResourceTablePage.vue';

const fields = [
  { key: 'date', label: 'Data', type: 'string' },
  { key: 'employee', label: 'Dipendente', type: 'string' },
  { key: 'department', label: 'Reparto', type: 'enum', options: ['Magazzino', 'Uffici', 'Trasporti'] },
  { key: 'entry_time', label: 'Entrata', type: 'string' },
  { key: 'exit_time', label: 'Uscita', type: 'string' },
  { key: 'hours', label: 'Ore', type: 'number', align: 'right' },
  { key: 'anomaly', label: 'Anomalia', type: 'enum', options: ['Regolare', 'Ritardo', 'Assenza parziale'] },
  { key: 'note', label: 'Note', type: 'string' }
];

const formSchema = [
  { key: 'date', label: 'Data', input: 'date', required: true },
  { key: 'employee', label: 'Dipendente', input: 'text', required: true },
  {
    key: 'department',
    label: 'Reparto',
    input: 'select',
    options: [
      { value: 'Magazzino', label: 'Magazzino' },
      { value: 'Uffici', label: 'Uffici' },
      { value: 'Trasporti', label: 'Trasporti' }
    ]
  },
  { key: 'entry_time', label: 'Ora entrata', input: 'datetime' },
  { key: 'exit_time', label: 'Ora uscita', input: 'datetime' },
  { key: 'hours', label: 'Ore lavorate', input: 'number', placeholder: '0-24' },
  {
    key: 'anomaly',
    label: 'Anomalia',
    input: 'select',
    options: [
      { value: 'Regolare', label: 'Regolare' },
      { value: 'Ritardo', label: 'Ritardo' },
      { value: 'Assenza parziale', label: 'Assenza parziale' }
    ]
  },
  { key: 'note', label: 'Note', input: 'textarea', placeholder: 'Motivazione o commento' }
];

const sampleData = [
  {
    id: 'TIMB-2025-09-15-01',
    date: '2025-09-15',
    employee: 'Elena Rizzi',
    department: 'Magazzino',
    entry_time: '2025-09-15T06:03',
    exit_time: '2025-09-15T14:02',
    hours: 7.9,
    anomaly: 'Regolare',
    note: ''
  },
  {
    id: 'TIMB-2025-09-15-02',
    date: '2025-09-15',
    employee: 'Luca Nervi',
    department: 'Trasporti',
    entry_time: '2025-09-15T06:52',
    exit_time: '2025-09-15T15:30',
    hours: 8.6,
    anomaly: 'Ritardo',
    note: 'Traffico sulla tangenziale'
  },
  {
    id: 'TIMB-2025-09-14-04',
    date: '2025-09-14',
    employee: 'Silvia Pozzi',
    department: 'Uffici',
    entry_time: '2025-09-14T08:36',
    exit_time: '2025-09-14T13:05',
    hours: 4.5,
    anomaly: 'Assenza parziale',
    note: 'Uscita anticipata per visita medica'
  }
];
</script>

<style scoped></style>
