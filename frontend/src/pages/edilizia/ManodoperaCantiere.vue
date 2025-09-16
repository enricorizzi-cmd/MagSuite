<template>
  <ResourceTablePage
    title="Manodopera Cantiere"
    description="Consuntivi ore squadra e costo medio a settimana."
    new-label="Nuovo consuntivo"
    :fields="fields"
    :form-schema="formSchema"
    :sample-data="sampleData"
    empty-label="Nessun dato manodopera registrato."
  />
</template>

<script setup lang="ts">
import ResourceTablePage from '../../components/ResourceTablePage.vue';

const fields = [
  { key: 'week', label: 'Settimana', type: 'string' },
  { key: 'site', label: 'Cantiere', type: 'string' },
  { key: 'team', label: 'Squadra', type: 'string' },
  { key: 'hours_planned', label: 'Ore pianificate', type: 'number', align: 'right' },
  { key: 'hours_worked', label: 'Ore rilevate', type: 'number', align: 'right' },
  { key: 'variance', label: 'Delta ore', type: 'number', align: 'right' },
  { key: 'cost_hour', label: 'Costo/ora', type: 'number', align: 'right' },
  { key: 'total_cost', label: 'Costo totale', type: 'number', align: 'right' }
];

const formSchema = [
  { key: 'week', label: 'Settimana', input: 'text', required: true, placeholder: '2025-W37' },
  { key: 'site', label: 'Cantiere', input: 'text', required: true },
  { key: 'team', label: 'Squadra', input: 'text', required: true },
  { key: 'hours_planned', label: 'Ore pianificate', input: 'number' },
  { key: 'hours_worked', label: 'Ore rilevate', input: 'number' },
  { key: 'variance', label: 'Delta ore', input: 'number', hint: 'Differenza tra pianificato e rilevato.' },
  { key: 'cost_hour', label: 'Costo orario', input: 'currency' },
  { key: 'total_cost', label: 'Costo totale', input: 'currency' }
];

const sampleData = [
  {
    id: 'LAB-2025W37-A',
    week: '2025-W37',
    site: 'Magazzino Pharma - Bologna',
    team: 'Squadra carpenteria',
    hours_planned: 320,
    hours_worked: 302,
    variance: -18,
    cost_hour: 32.5,
    total_cost: 9820
  },
  {
    id: 'LAB-2025W37-B',
    week: '2025-W37',
    site: 'Hub Alimentare - Parma',
    team: 'Squadra impianti',
    hours_planned: 260,
    hours_worked: 274,
    variance: 14,
    cost_hour: 35.2,
    total_cost: 9645
  },
  {
    id: 'LAB-2025W36-A',
    week: '2025-W36',
    site: 'Centro Logistico Bari',
    team: 'Finiture interne',
    hours_planned: 190,
    hours_worked: 188,
    variance: -2,
    cost_hour: 28.1,
    total_cost: 5273
  }
];
</script>

<style scoped></style>
