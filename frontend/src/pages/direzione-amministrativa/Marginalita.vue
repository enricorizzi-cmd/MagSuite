<template>
  <ResourceTablePage
    title="Marginalità"
    description="Analisi della marginalità per linea di business e stato." 
    new-label="Nuova linea"
    :fields="fields"
    :form-schema="formSchema"
    :sample-data="sampleData"
    empty-label="Nessuna marginalità disponibile."
  />
</template>

<script setup lang="ts">
import ResourceTablePage from '../../components/ResourceTablePage.vue';

const fields = [
  { key: 'line', label: 'Linea', type: 'string' },
  { key: 'segment', label: 'Segmento', type: 'enum', options: ['B2B', 'Retail', 'E-commerce'] },
  { key: 'revenue', label: 'Ricavi', type: 'number', align: 'right' },
  { key: 'cost', label: 'Costi', type: 'number', align: 'right' },
  { key: 'margin', label: 'Margine', type: 'number', align: 'right' },
  { key: 'margin_pct', label: 'Margine %', type: 'number', align: 'right' },
  { key: 'status', label: 'Stato', type: 'enum', options: ['Monitorata', 'Critica', 'In linea'] },
  { key: 'owner', label: 'Owner', type: 'string' }
];

const formSchema = [
  { key: 'line', label: 'Linea di business', input: 'text', required: true },
  {
    key: 'segment',
    label: 'Segmento',
    input: 'select',
    required: true,
    options: [
      { value: 'B2B', label: 'B2B' },
      { value: 'Retail', label: 'Retail' },
      { value: 'E-commerce', label: 'E-commerce' }
    ]
  },
  { key: 'revenue', label: 'Ricavi', input: 'currency' },
  { key: 'cost', label: 'Costi', input: 'currency' },
  { key: 'margin', label: 'Margine', input: 'currency', hint: 'Calcolo automatico a sistema, compilare solo per simulazioni.' },
  { key: 'margin_pct', label: 'Margine %', input: 'number', placeholder: '0-100' },
  {
    key: 'status',
    label: 'Stato',
    input: 'select',
    options: [
      { value: 'Monitorata', label: 'Monitorata' },
      { value: 'Critica', label: 'Critica' },
      { value: 'In linea', label: 'In linea' }
    ]
  },
  { key: 'owner', label: 'Owner', input: 'text', placeholder: 'Responsabile linea' }
];

const sampleData = [
  {
    id: 'MARG-B2B',
    line: 'Componentistica Industriale',
    segment: 'B2B',
    revenue: 820000,
    cost: 592000,
    margin: 228000,
    margin_pct: 27.8,
    status: 'In linea',
    owner: 'Giorgio Lanza'
  },
  {
    id: 'MARG-RET',
    line: 'Retail canale fisico',
    segment: 'Retail',
    revenue: 455000,
    cost: 364000,
    margin: 91000,
    margin_pct: 20.0,
    status: 'Monitorata',
    owner: 'Alice Ferretti'
  },
  {
    id: 'MARG-ECO',
    line: 'E-commerce direct',
    segment: 'E-commerce',
    revenue: 312000,
    cost: 278000,
    margin: 34000,
    margin_pct: 10.9,
    status: 'Critica',
    owner: 'Michele Serra'
  }
];
</script>

<style scoped></style>
