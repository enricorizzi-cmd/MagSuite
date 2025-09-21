<template>
  <ResourceTablePage
    title="Sottoprodotti"
    description="Catalogo sottoprodotti e kit collegati ai progetti."
    new-label="Nuovo sottoprodotto"
    :show-new="false"
    :show-actions="false"
    endpoint="/gestionale/byproducts"
    :fields="fields"
    :form-schema="[]"
    :transform-response="transformResponse"
  />
</template>

<script setup lang="ts">
import ResourceTablePage from '../../components/ResourceTablePage.vue';

const fields = [
  { key: 'code', label: 'Codice', type: 'string' },
  { key: 'name', label: 'Nome', type: 'string' },
  { key: 'unit', label: 'Unità', type: 'string' },
  { key: 'price', label: 'Prezzo', type: 'string' }
];

const currency = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });

const transformResponse = (payload: any) => {
  const list = Array.isArray(payload?.items) ? payload.items : [];
  return list.map((row: Record<string, any>) => ({
    ...row,
    price: typeof row.price === 'number' ? currency.format(row.price) : row.price
  }));
};
</script>
