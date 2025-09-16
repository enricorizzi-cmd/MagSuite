<template>
  <ResourceTablePage
    title="Dettaglio Inventari"
    description="Righe di inventario con differenze rispetto a giacenza contabile."
    new-label="Nuova riga inventario"
    :fields="fields"
    :form-schema="formSchema"
    :sample-data="sampleData"
    empty-label="Nessuna riga inventario presente."
  />
</template>

<script setup lang="ts">
import ResourceTablePage from '../../components/ResourceTablePage.vue';

const fields = [
  { key: 'session', label: 'Sessione', type: 'string' },
  { key: 'sku', label: 'SKU', type: 'string' },
  { key: 'description', label: 'Descrizione', type: 'string' },
  { key: 'location', label: 'Ubicazione', type: 'string' },
  { key: 'book_qty', label: 'Giacenza contabile', type: 'number', align: 'right' },
  { key: 'counted_qty', label: 'Conteggio', type: 'number', align: 'right' },
  { key: 'difference', label: 'Differenza', type: 'number', align: 'right' },
  { key: 'status', label: 'Stato', type: 'enum', options: ['Da approvare', 'Approvato', 'Annullato'] },
  { key: 'operator', label: 'Operatore', type: 'string' }
];

const formSchema = [
  { key: 'session', label: 'Sessione inventario', input: 'text', required: true, placeholder: 'INV-2025-001' },
  { key: 'sku', label: 'SKU', input: 'text', required: true },
  { key: 'description', label: 'Descrizione', input: 'text' },
  { key: 'location', label: 'Ubicazione', input: 'text', placeholder: 'M01-B02-03' },
  { key: 'book_qty', label: 'Giacenza contabile', input: 'number' },
  { key: 'counted_qty', label: 'Quantità contata', input: 'number' },
  { key: 'difference', label: 'Differenza', input: 'number', hint: 'Calcolo automatico (contato - contabile).' },
  {
    key: 'status',
    label: 'Stato',
    input: 'select',
    options: [
      { value: 'Da approvare', label: 'Da approvare' },
      { value: 'Approvato', label: 'Approvato' },
      { value: 'Annullato', label: 'Annullato' }
    ]
  },
  { key: 'operator', label: 'Operatore', input: 'text' }
];

const sampleData = [
  {
    id: 'INVLINE-001',
    session: 'INV-2025-001',
    sku: 'ART-00045',
    description: 'Scanner barcode palmare',
    location: 'M01-B02-03',
    book_qty: 24,
    counted_qty: 22,
    difference: -2,
    status: 'Da approvare',
    operator: 'Sara Conti'
  },
  {
    id: 'INVLINE-002',
    session: 'INV-2025-001',
    sku: 'ART-00870',
    description: 'Cartoni isotermici 60L',
    location: 'M02-A01-01',
    book_qty: 180,
    counted_qty: 182,
    difference: 2,
    status: 'Approvato',
    operator: 'Elena Rizzi'
  },
  {
    id: 'INVLINE-003',
    session: 'INV-2025-002',
    sku: 'ART-02011',
    description: 'Etichette termiche 100x60',
    location: 'M03-C05-05',
    book_qty: 1240,
    counted_qty: 1240,
    difference: 0,
    status: 'Approvato',
    operator: 'Davide Palma'
  }
];
</script>

<style scoped></style>
