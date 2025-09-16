<template>
  <ResourceTablePage
    title="Customer Health"
    description="Analisi clienti con segmentazione, revenue YTD e stato di relazione."
    new-label="Nuovo cliente"
    :fields="fields"
    :form-schema="formSchema"
    :sample-data="sampleData"
    empty-label="Nessun cliente presente."
  />
</template>

<script setup lang="ts">
import ResourceTablePage from '../../components/ResourceTablePage.vue';

const fields = [
  { key: 'code', label: 'Codice', type: 'string' },
  { key: 'name', label: 'Cliente', type: 'string' },
  { key: 'segment', label: 'Segmento', type: 'enum', options: ['Enterprise', 'Mid Market', 'SMB'] },
  { key: 'status', label: 'Stato', type: 'enum', options: ['Attivo', 'A rischio', 'Dormiente'] },
  { key: 'revenue_ytd', label: 'Revenue YTD', type: 'number', align: 'right' },
  { key: 'satisfaction', label: 'Soddisfazione', type: 'number', align: 'right' },
  { key: 'account_manager', label: 'Account manager', type: 'string' },
  { key: 'last_contact', label: 'Ultimo contatto', type: 'string' }
];

const formSchema = [
  { key: 'code', label: 'Codice', input: 'text', required: true, placeholder: 'CL-0001' },
  { key: 'name', label: 'Ragione sociale', input: 'text', required: true },
  {
    key: 'segment',
    label: 'Segmento',
    input: 'select',
    options: [
      { value: 'Enterprise', label: 'Enterprise' },
      { value: 'Mid Market', label: 'Mid Market' },
      { value: 'SMB', label: 'SMB' }
    ]
  },
  {
    key: 'status',
    label: 'Stato',
    input: 'select',
    options: [
      { value: 'Attivo', label: 'Attivo' },
      { value: 'A rischio', label: 'A rischio' },
      { value: 'Dormiente', label: 'Dormiente' }
    ]
  },
  { key: 'revenue_ytd', label: 'Revenue YTD', input: 'currency' },
  { key: 'satisfaction', label: 'Indice soddisfazione', input: 'number', placeholder: '0-10' },
  { key: 'account_manager', label: 'Account manager', input: 'text' },
  { key: 'last_contact', label: 'Ultimo contatto', input: 'date' }
];

const sampleData = [
  {
    id: 'CL-001',
    code: 'CL-001',
    name: 'GlobalChem SpA',
    segment: 'Enterprise',
    status: 'Attivo',
    revenue_ytd: 418000,
    satisfaction: 8.7,
    account_manager: 'Laura Bianchi',
    last_contact: '2025-09-12'
  },
  {
    id: 'CL-024',
    code: 'CL-024',
    name: 'Mercurio Group',
    segment: 'Mid Market',
    status: 'A rischio',
    revenue_ytd: 156000,
    satisfaction: 6.1,
    account_manager: 'Andrea Costa',
    last_contact: '2025-08-28'
  },
  {
    id: 'CL-057',
    code: 'CL-057',
    name: 'FastGrocery SRL',
    segment: 'SMB',
    status: 'Dormiente',
    revenue_ytd: 42000,
    satisfaction: 5.4,
    account_manager: 'Giulia Moretti',
    last_contact: '2025-06-05'
  }
];
</script>

<style scoped></style>
