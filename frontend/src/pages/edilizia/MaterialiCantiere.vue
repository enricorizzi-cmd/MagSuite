<template>
  <ResourceTablePage
    title="Materiali di Cantiere"
    description="Consumi materiali per cantiere con confronto tra pianificato e utilizzato."
    new-label="Nuovo materiale"
    :fields="fields"
    :form-schema="formSchema"
    :sample-data="sampleData"
    empty-label="Nessun materiale registrato."
  />
</template>

<script setup lang="ts">
import ResourceTablePage from '../../components/ResourceTablePage.vue';

const fields = [
  { key: 'material', label: 'Materiale', type: 'string' },
  { key: 'site', label: 'Cantiere', type: 'string' },
  { key: 'unit', label: 'Unità', type: 'string' },
  { key: 'planned_qty', label: 'Pianificato', type: 'number', align: 'right' },
  { key: 'used_qty', label: 'Utilizzato', type: 'number', align: 'right' },
  { key: 'variance', label: 'Varianza', type: 'number', align: 'right' },
  { key: 'supplier', label: 'Fornitore', type: 'string' },
  { key: 'last_delivery', label: 'Ultima consegna', type: 'string' }
];

const formSchema = [
  { key: 'material', label: 'Materiale', input: 'text', required: true },
  { key: 'site', label: 'Cantiere', input: 'text', required: true },
  { key: 'unit', label: 'Unità di misura', input: 'text', placeholder: 'pz, ml, kg…' },
  { key: 'planned_qty', label: 'Quantità pianificata', input: 'number' },
  { key: 'used_qty', label: 'Quantità utilizzata', input: 'number' },
  { key: 'variance', label: 'Varianza', input: 'number', hint: 'Valore calcolato dal sistema. Inserire solo per simulazioni.' },
  { key: 'supplier', label: 'Fornitore', input: 'text' },
  { key: 'last_delivery', label: 'Ultima consegna', input: 'date' }
];

const sampleData = [
  {
    id: 'MAT-001',
    material: 'Profilati acciaio HEB180',
    site: 'Magazzino Pharma - Bologna',
    unit: 'pz',
    planned_qty: 220,
    used_qty: 205,
    variance: -15,
    supplier: 'SteelWorks Spa',
    last_delivery: '2025-09-12'
  },
  {
    id: 'MAT-002',
    material: 'Quadri elettrici BT',
    site: 'Hub Alimentare - Parma',
    unit: 'pz',
    planned_qty: 16,
    used_qty: 18,
    variance: 2,
    supplier: 'Elettroimpianti Srl',
    last_delivery: '2025-09-10'
  },
  {
    id: 'MAT-003',
    material: 'Pannelli sandwich coibentati',
    site: 'Centro Logistico Bari',
    unit: 'mq',
    planned_qty: 1450,
    used_qty: 1395,
    variance: -55,
    supplier: 'ClimaPanel SRL',
    last_delivery: '2025-09-08'
  }
];
</script>

<style scoped></style>
