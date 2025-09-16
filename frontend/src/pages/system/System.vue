<template>
  <ResourceTablePage
    title="System Status"
    description="Monitoraggio servizi applicativi con uptime, ultima verifica e owner."
    new-label="Nuovo servizio"
    :fields="fields"
    :form-schema="formSchema"
    :sample-data="sampleData"
    empty-label="Nessun servizio monitorato."
  />
</template>

<script setup lang="ts">
import ResourceTablePage from '../../components/ResourceTablePage.vue';

const fields = [
  { key: 'service', label: 'Servizio', type: 'string' },
  { key: 'module', label: 'Modulo', type: 'enum', options: ['API', 'Frontend', 'Supabase', 'Render', 'Queue'] },
  { key: 'status', label: 'Stato', type: 'enum', options: ['OK', 'Warning', 'Critical', 'Manutenzione'] },
  { key: 'uptime', label: 'Uptime %', type: 'number', align: 'right' },
  { key: 'last_check', label: 'Ultimo check', type: 'string' },
  { key: 'owner', label: 'Owner', type: 'string' },
  { key: 'notes', label: 'Note', type: 'string' }
];

const formSchema = [
  { key: 'service', label: 'Servizio', input: 'text', required: true },
  {
    key: 'module',
    label: 'Modulo',
    input: 'select',
    options: [
      { value: 'API', label: 'API' },
      { value: 'Frontend', label: 'Frontend' },
      { value: 'Supabase', label: 'Supabase' },
      { value: 'Render', label: 'Render' },
      { value: 'Queue', label: 'Queue' }
    ]
  },
  {
    key: 'status',
    label: 'Stato',
    input: 'select',
    options: [
      { value: 'OK', label: 'OK' },
      { value: 'Warning', label: 'Warning' },
      { value: 'Critical', label: 'Critical' },
      { value: 'Manutenzione', label: 'Manutenzione' }
    ]
  },
  { key: 'uptime', label: 'Uptime %', input: 'number', placeholder: '0-100' },
  { key: 'last_check', label: 'Ultimo check', input: 'datetime' },
  { key: 'owner', label: 'Owner', input: 'text' },
  { key: 'notes', label: 'Note', input: 'textarea' }
];

const sampleData = [
  {
    id: 'SYS-API',
    service: 'Backend API',
    module: 'API',
    status: 'OK',
    uptime: 99.92,
    last_check: '2025-09-15 09:20',
    owner: 'DevOps Team',
    notes: 'Ultima deploy 15/09 - nessuna anomalia'
  },
  {
    id: 'SYS-DB',
    service: 'Supabase cluster',
    module: 'Supabase',
    status: 'Warning',
    uptime: 98.43,
    last_check: '2025-09-15 09:18',
    owner: 'DBA Team',
    notes: 'Replica secondaria in sync lento'
  },
  {
    id: 'SYS-PWA',
    service: 'Frontend PWA',
    module: 'Frontend',
    status: 'OK',
    uptime: 99.99,
    last_check: '2025-09-15 09:22',
    owner: 'Web Team',
    notes: ''
  }
];
</script>

<style scoped></style>
