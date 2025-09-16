<template>
  <ResourceTablePage
    title="Flusso di Cassa"
    description="Monitoraggio entrate/uscite mensili suddivise per categoria gestionale."
    new-label="Nuovo movimento"
    :fields="fields"
    :form-schema="formSchema"
    :sample-data="sampleData"
    empty-label="Nessun movimento registrato."
  />
</template>

<script setup lang="ts">
import ResourceTablePage from '../../components/ResourceTablePage.vue';

const fields = [
  { key: 'period', label: 'Periodo', type: 'string' },
  { key: 'category', label: 'Categoria', type: 'enum', options: ['Operativo', 'Investimenti', 'Finanziario'] },
  { key: 'incoming', label: 'Entrate', type: 'number', align: 'right' },
  { key: 'outgoing', label: 'Uscite', type: 'number', align: 'right' },
  { key: 'net', label: 'Saldo', type: 'number', align: 'right' },
  { key: 'status', label: 'Stato', type: 'enum', options: ['Consuntivo', 'Previsionale'] },
  { key: 'note', label: 'Note', type: 'string' }
];

const formSchema = [
  { key: 'period', label: 'Periodo (es. 2025-09)', input: 'text', required: true, placeholder: '2025-09' },
  {
    key: 'category',
    label: 'Categoria',
    input: 'select',
    required: true,
    options: [
      { value: 'Operativo', label: 'Operativo' },
      { value: 'Investimenti', label: 'Investimenti' },
      { value: 'Finanziario', label: 'Finanziario' }
    ]
  },
  { key: 'incoming', label: 'Entrate', input: 'currency', placeholder: '0,00' },
  { key: 'outgoing', label: 'Uscite', input: 'currency', placeholder: '0,00' },
  { key: 'net', label: 'Saldo', input: 'currency', placeholder: '0,00', hint: 'Calcolato automaticamente dal controller, compilare solo per simulazioni.' },
  {
    key: 'status',
    label: 'Stato',
    input: 'select',
    options: [
      { value: 'Consuntivo', label: 'Consuntivo' },
      { value: 'Previsionale', label: 'Previsionale' }
    ]
  },
  { key: 'note', label: 'Note', input: 'textarea', placeholder: 'Dettagli o riferimento documento' }
];

const sampleData = [
  {
    id: 'CF-2025-09-OP',
    period: '2025-09',
    category: 'Operativo',
    incoming: 185000,
    outgoing: 132400,
    net: 52600,
    status: 'Consuntivo',
    note: 'Incassi clienti principali chiusi entro il 12/09'
  },
  {
    id: 'CF-2025-09-INV',
    period: '2025-09',
    category: 'Investimenti',
    incoming: 0,
    outgoing: 28000,
    net: -28000,
    status: 'Previsionale',
    note: 'Nuovo impianto picking automatico Mag Nord'
  },
  {
    id: 'CF-2025-10-OP',
    period: '2025-10',
    category: 'Operativo',
    incoming: 174500,
    outgoing: 118900,
    net: 55600,
    status: 'Previsionale',
    note: 'Scenario base - clienti GDO con incasso a 45gg'
  },
  {
    id: 'CF-2025-10-FIN',
    period: '2025-10',
    category: 'Finanziario',
    incoming: 50000,
    outgoing: 15000,
    net: 35000,
    status: 'Consuntivo',
    note: 'Finanziamento breve termine per anticipo fornitori'
  }
];
</script>

<style scoped></style>
