<template>
  <ResourceTablePage
    title="Piano Finanziario"
    description="Investimenti strategici, budget CAPEX/OPEX e stato di approvazione."
    new-label="Nuovo progetto"
    :fields="fields"
    :form-schema="formSchema"
    :sample-data="sampleData"
    empty-label="Nessun progetto pianificato."
  />
</template>

<script setup lang="ts">
import ResourceTablePage from '../../components/ResourceTablePage.vue';

const fields = [
  { key: 'project', label: 'Progetto', type: 'string' },
  { key: 'year', label: 'Anno', type: 'number' },
  { key: 'capex', label: 'CAPEX', type: 'number', align: 'right' },
  { key: 'opex', label: 'OPEX', type: 'number', align: 'right' },
  { key: 'cashflow', label: 'Cashflow', type: 'number', align: 'right' },
  { key: 'status', label: 'Stato', type: 'enum', options: ['Bozza', 'Approvato', 'In revisione'] },
  { key: 'owner', label: 'Owner', type: 'string' }
];

const formSchema = [
  { key: 'project', label: 'Progetto', input: 'text', required: true },
  { key: 'year', label: 'Anno', input: 'number', required: true },
  { key: 'capex', label: 'CAPEX', input: 'currency' },
  { key: 'opex', label: 'OPEX', input: 'currency' },
  { key: 'cashflow', label: 'Cashflow', input: 'currency', hint: 'Valore cumulato previsto a fine progetto.' },
  {
    key: 'status',
    label: 'Stato',
    input: 'select',
    options: [
      { value: 'Bozza', label: 'Bozza' },
      { value: 'Approvato', label: 'Approvato' },
      { value: 'In revisione', label: 'In revisione' }
    ]
  },
  { key: 'owner', label: 'Owner', input: 'text', placeholder: 'Project manager' }
];

const sampleData = [
  {
    id: 'FIN-LOG-2025',
    project: 'Automazione magazzino Nord',
    year: 2025,
    capex: 380000,
    opex: 42000,
    cashflow: 125000,
    status: 'In revisione',
    owner: 'Elisa Monti'
  },
  {
    id: 'FIN-IT-2025',
    project: 'Upgrade ERP e portale B2B',
    year: 2025,
    capex: 210000,
    opex: 65000,
    cashflow: 86000,
    status: 'Approvato',
    owner: 'Tommaso Ruggeri'
  },
  {
    id: 'FIN-HR-2026',
    project: 'Academy interna tecnici',
    year: 2026,
    capex: 75000,
    opex: 28000,
    cashflow: 34000,
    status: 'Bozza',
    owner: 'Francesca Vitali'
  }
];
</script>

<style scoped></style>
