<template>
  <ResourceTablePage
    title="Template Etichette"
    description="Gestione layout etichette con destinazione e stato di pubblicazione."
    new-label="Nuovo template"
    :fields="fields"
    :form-schema="formSchema"
    :sample-data="sampleData"
    empty-label="Nessuna etichetta configurata."
  />
</template>

<script setup lang="ts">
import ResourceTablePage from '../../components/ResourceTablePage.vue';

const fields = [
  { key: 'code', label: 'Codice', type: 'string' },
  { key: 'name', label: 'Nome', type: 'string' },
  { key: 'type', label: 'Tipo', type: 'enum', options: ['Articolo', 'Spedizione', 'Lotto', 'Seriale'] },
  { key: 'target', label: 'Destinazione', type: 'enum', options: ['Desktop', 'Mobile', 'Zebra'] },
  { key: 'status', label: 'Stato', type: 'enum', options: ['Draft', 'Published', 'Deprecated'] },
  { key: 'last_update', label: 'Aggiornato', type: 'string' },
  { key: 'owner', label: 'Owner', type: 'string' }
];

const formSchema = [
  { key: 'code', label: 'Codice', input: 'text', required: true, placeholder: 'LBL-ART-01' },
  { key: 'name', label: 'Nome template', input: 'text', required: true },
  {
    key: 'type',
    label: 'Tipo etichetta',
    input: 'select',
    options: [
      { value: 'Articolo', label: 'Articolo' },
      { value: 'Spedizione', label: 'Spedizione' },
      { value: 'Lotto', label: 'Lotto' },
      { value: 'Seriale', label: 'Seriale' }
    ]
  },
  {
    key: 'target',
    label: 'Destinazione',
    input: 'select',
    options: [
      { value: 'Desktop', label: 'Desktop' },
      { value: 'Mobile', label: 'Mobile' },
      { value: 'Zebra', label: 'Stampante Zebra' }
    ]
  },
  {
    key: 'status',
    label: 'Stato',
    input: 'select',
    options: [
      { value: 'Draft', label: 'Bozza' },
      { value: 'Published', label: 'Pubblicato' },
      { value: 'Deprecated', label: 'Deprecato' }
    ]
  },
  { key: 'last_update', label: 'Ultimo aggiornamento', input: 'datetime' },
  { key: 'owner', label: 'Owner', input: 'text' }
];

const sampleData = [
  {
    id: 'LBL-001',
    code: 'LBL-ART-01',
    name: 'Etichetta articolo standard',
    type: 'Articolo',
    target: 'Zebra',
    status: 'Published',
    last_update: '2025-09-10 14:22',
    owner: 'Chiara Sartori'
  },
  {
    id: 'LBL-002',
    code: 'LBL-SPED-02',
    name: 'Label spedizione express',
    type: 'Spedizione',
    target: 'Desktop',
    status: 'Draft',
    last_update: '2025-09-14 09:40',
    owner: 'Marco Villa'
  },
  {
    id: 'LBL-003',
    code: 'LBL-LOT-01',
    name: 'Etichetta lotto refrigerato',
    type: 'Lotto',
    target: 'Zebra',
    status: 'Published',
    last_update: '2025-08-31 16:05',
    owner: 'Elisa Monti'
  }
];
</script>

<style scoped></style>
