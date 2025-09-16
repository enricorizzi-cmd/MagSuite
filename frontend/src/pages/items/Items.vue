<template>
  <ResourceTablePage
    title="Catalogo Articoli"
    description="Vista sintetica articoli con stato ciclo di vita e punti di riordino."
    new-label="Nuovo articolo"
    :fields="fields"
    :form-schema="formSchema"
    :sample-data="sampleData"
    empty-label="Nessun articolo in catalogo."
  />
</template>

<script setup lang="ts">
import ResourceTablePage from '../../components/ResourceTablePage.vue';

const fields = [
  { key: 'sku', label: 'SKU', type: 'string' },
  { key: 'name', label: 'Descrizione', type: 'string' },
  { key: 'category', label: 'Categoria', type: 'enum', options: ['Componenti', 'Ricambi', 'Consumabili'] },
  { key: 'lifecycle', label: 'Ciclo di vita', type: 'enum', options: ['Attivo', 'In esaurimento', 'Obsoleto'] },
  { key: 'stock', label: 'Giacenza', type: 'number', align: 'right' },
  { key: 'reorder_point', label: 'Punto di riordino', type: 'number', align: 'right' },
  { key: 'status', label: 'Stato', type: 'enum', options: ['Disponibile', 'Bloccato', 'In arrivo'] },
  { key: 'supplier', label: 'Fornitore', type: 'string' }
];

const formSchema = [
  { key: 'sku', label: 'SKU', input: 'text', required: true },
  { key: 'name', label: 'Descrizione articolo', input: 'text', required: true },
  {
    key: 'category',
    label: 'Categoria',
    input: 'select',
    options: [
      { value: 'Componenti', label: 'Componenti' },
      { value: 'Ricambi', label: 'Ricambi' },
      { value: 'Consumabili', label: 'Consumabili' }
    ]
  },
  {
    key: 'lifecycle',
    label: 'Stato ciclo di vita',
    input: 'select',
    options: [
      { value: 'Attivo', label: 'Attivo' },
      { value: 'In esaurimento', label: 'In esaurimento' },
      { value: 'Obsoleto', label: 'Obsoleto' }
    ]
  },
  { key: 'stock', label: 'Giacenza', input: 'number' },
  { key: 'reorder_point', label: 'Punto di riordino', input: 'number' },
  {
    key: 'status',
    label: 'Stato disponibilità',
    input: 'select',
    options: [
      { value: 'Disponibile', label: 'Disponibile' },
      { value: 'Bloccato', label: 'Bloccato' },
      { value: 'In arrivo', label: 'In arrivo' }
    ]
  },
  { key: 'supplier', label: 'Fornitore', input: 'text' }
];

const sampleData = [
  {
    id: 'CAT-ART-001',
    sku: 'ART-00045',
    name: 'Scanner barcode palmare',
    category: 'Componenti',
    lifecycle: 'Attivo',
    stock: 118,
    reorder_point: 80,
    status: 'Disponibile',
    supplier: 'TechLines Spa'
  },
  {
    id: 'CAT-ART-002',
    sku: 'ART-00870',
    name: 'Cartone isotermico 60L',
    category: 'Consumabili',
    lifecycle: 'In esaurimento',
    stock: 540,
    reorder_point: 400,
    status: 'In arrivo',
    supplier: 'CoolPack Logistics'
  },
  {
    id: 'CAT-ART-003',
    sku: 'ART-02011',
    name: 'Etichetta termica 100x60',
    category: 'Consumabili',
    lifecycle: 'Attivo',
    stock: 3400,
    reorder_point: 2500,
    status: 'Disponibile',
    supplier: 'LabelTech SRL'
  }
];
</script>

<style scoped></style>
