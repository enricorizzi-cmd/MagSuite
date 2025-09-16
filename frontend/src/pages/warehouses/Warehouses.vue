<template>
  <ResourceTablePage
    title="Magazzini"
    description="Anagrafica siti logistici con capacità e livello di utilizzo."
    new-label="Nuovo magazzino"
    :fields="fields"
    :form-schema="formSchema"
    :sample-data="sampleData"
    empty-label="Nessun magazzino censito."
  />
</template>

<script setup lang="ts">
import ResourceTablePage from '../../components/ResourceTablePage.vue';

const fields = [
  { key: 'code', label: 'Codice', type: 'string' },
  { key: 'name', label: 'Nome', type: 'string' },
  { key: 'type', label: 'Tipologia', type: 'enum', options: ['Centrale', 'Transit point', 'Distribuzione'] },
  { key: 'city', label: 'Città', type: 'string' },
  { key: 'capacity', label: 'Capacità m²', type: 'number', align: 'right' },
  { key: 'usage', label: 'Utilizzo %', type: 'number', align: 'right' },
  { key: 'manager', label: 'Responsabile', type: 'string' },
  { key: 'active', label: 'Attivo', type: 'boolean' }
];

const formSchema = [
  { key: 'code', label: 'Codice', input: 'text', required: true, placeholder: 'WH-NORD' },
  { key: 'name', label: 'Nome magazzino', input: 'text', required: true },
  {
    key: 'type',
    label: 'Tipologia',
    input: 'select',
    options: [
      { value: 'Centrale', label: 'Centrale' },
      { value: 'Transit point', label: 'Transit point' },
      { value: 'Distribuzione', label: 'Distribuzione' }
    ]
  },
  { key: 'city', label: 'Città', input: 'text' },
  { key: 'capacity', label: 'Capacità (m²)', input: 'number' },
  { key: 'usage', label: 'Utilizzo %', input: 'number', placeholder: '0-100' },
  { key: 'manager', label: 'Responsabile', input: 'text' },
  { key: 'active', label: 'Attivo', input: 'checkbox', default: true }
];

const sampleData = [
  {
    id: 'WH-NORD',
    code: 'WH-NORD',
    name: 'Magazzino Nord',
    type: 'Centrale',
    city: 'Piacenza',
    capacity: 22000,
    usage: 82,
    manager: 'Paolo Grandi',
    active: true
  },
  {
    id: 'WH-SUD',
    code: 'WH-SUD',
    name: 'Magazzino Sud',
    type: 'Distribuzione',
    city: 'Caserta',
    capacity: 14500,
    usage: 76,
    manager: 'Marta Colombo',
    active: true
  },
  {
    id: 'WH-HUB',
    code: 'WH-HUB',
    name: 'Hub E-commerce',
    type: 'Transit point',
    city: 'Verona',
    capacity: 9800,
    usage: 64,
    manager: 'Chiara Lodi',
    active: false
  }
];
</script>

<style scoped></style>
