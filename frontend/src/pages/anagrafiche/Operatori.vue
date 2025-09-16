<template>
  <ResourceTablePage
    title="Operatori"
    description="Anagrafica operatori, ruoli e turnistica di sede."
    new-label="Nuovo operatore"
    :fields="fields"
    :form-schema="formSchema"
    :sample-data="sampleData"
    empty-label="Nessun operatore registrato."
  />
</template>

<script setup lang="ts">
import ResourceTablePage from '../../components/ResourceTablePage.vue';

const fields = [
  { key: 'code', label: 'Codice', type: 'string' },
  { key: 'name', label: 'Nome', type: 'string' },
  { key: 'role', label: 'Ruolo', type: 'enum', options: ['Responsabile', 'Magazziniere', 'Autista', 'Amministrazione'] },
  { key: 'site', label: 'Sede', type: 'enum', options: ['HQ', 'Magazzino Nord', 'Magazzino Sud'] },
  { key: 'shift', label: 'Turno', type: 'enum', options: ['Giorno', 'Notte', 'Flessibile'] },
  { key: 'active', label: 'Attivo', type: 'boolean' },
  { key: 'email', label: 'Email', type: 'string' },
  { key: 'phone', label: 'Telefono', type: 'string' },
  { key: 'last_access', label: 'Ultimo accesso', type: 'string' }
];

const formSchema = [
  { key: 'code', label: 'Codice', input: 'text', required: true, placeholder: 'OP-001' },
  { key: 'name', label: 'Nome e cognome', input: 'text', required: true },
  {
    key: 'role',
    label: 'Ruolo',
    input: 'select',
    required: true,
    options: [
      { value: 'Responsabile', label: 'Responsabile' },
      { value: 'Magazziniere', label: 'Magazziniere' },
      { value: 'Autista', label: 'Autista' },
      { value: 'Amministrazione', label: 'Amministrazione' }
    ]
  },
  {
    key: 'site',
    label: 'Sede',
    input: 'select',
    required: true,
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
      { value: 'Giorno', label: 'Giorno' },
      { value: 'Notte', label: 'Notte' },
      { value: 'Flessibile', label: 'Flessibile' }
    ]
  },
  { key: 'email', label: 'Email', input: 'text', placeholder: 'nome@azienda.it' },
  { key: 'phone', label: 'Telefono', input: 'text', placeholder: '+39 320 000 0000' },
  { key: 'active', label: 'Operatore attivo', input: 'checkbox', default: true },
  { key: 'last_access', label: 'Ultimo accesso', input: 'datetime' }
];

const sampleData = [
  {
    id: 'OP-001',
    code: 'OP-001',
    name: 'Marco Villa',
    role: 'Responsabile',
    site: 'HQ',
    shift: 'Giorno',
    active: true,
    email: 'marco.villa@magsuite.it',
    phone: '+39 321 554 2201',
    last_access: '2025-09-15 07:55'
  },
  {
    id: 'OP-014',
    code: 'OP-014',
    name: 'Sara Conti',
    role: 'Magazziniere',
    site: 'Magazzino Nord',
    shift: 'Notte',
    active: true,
    email: 'sara.conti@magsuite.it',
    phone: '+39 321 884 1020',
    last_access: '2025-09-14 22:17'
  },
  {
    id: 'OP-022',
    code: 'OP-022',
    name: 'Davide Palma',
    role: 'Autista',
    site: 'Magazzino Sud',
    shift: 'Flessibile',
    active: false,
    email: 'davide.palma@magsuite.it',
    phone: '+39 321 764 8891',
    last_access: '2025-09-08 18:40'
  }
];
</script>

<style scoped></style>
