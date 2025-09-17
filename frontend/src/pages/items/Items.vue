<template>
  <ResourceTablePage
    title="Articoli"
    description="Catalogo articoli con disponibilita e parametri di riordino."
    new-label="Nuovo articolo"
    endpoint="/items"
    :fields="fields"
    :form-schema="formSchema"
    :transform-response="transformResponse"
    :build-create-payload="buildPayload"
    :build-update-payload="buildPayload"
    server-pagination
    empty-label="Nessun articolo in catalogo."
  />
</template>

<script setup lang="ts">
import ResourceTablePage from '../../components/ResourceTablePage.vue';

type ItemRow = Record<string, any>;

const fields = [
  { key: 'sku', label: 'SKU', type: 'string' },
  { key: 'name', label: 'Nome', type: 'string' },
  { key: 'type', label: 'Tipo', type: 'string' },
  { key: 'category', label: 'Categoria', type: 'string' },
  { key: 'supplier', label: 'Fornitore', type: 'string' },
  { key: 'quantity_on_hand', label: 'Giacenza', type: 'number', align: 'right' },
  { key: 'min_stock', label: 'Scorta min', type: 'number', align: 'right' },
  { key: 'rotation_index', label: 'Indice rotazione', type: 'number', align: 'right' },
  { key: 'purchase_price', label: 'Prezzo acquisto', type: 'number', align: 'right' },
  { key: 'avg_weighted_price', label: 'Costo medio', type: 'number', align: 'right' }
];

const formSchema = [
  { key: 'name', label: 'Nome', input: 'text', required: true },
  { key: 'sku', label: 'SKU', input: 'text', required: true },
  { key: 'type', label: 'Tipo', input: 'text', placeholder: 'Merce, Servizio…' },
  { key: 'category', label: 'Categoria', input: 'text' },
  { key: 'group', label: 'Gruppo', input: 'text' },
  { key: 'class', label: 'Classe', input: 'text' },
  { key: 'manufacturer', label: 'Produttore', input: 'text' },
  { key: 'supplier', label: 'Fornitore', input: 'text' },
  { key: 'purchase_price', label: 'Prezzo acquisto', input: 'currency' },
  { key: 'avg_weighted_price', label: 'Costo medio ponderato', input: 'currency' },
  { key: 'min_stock', label: 'Scorta minima', input: 'number' },
  { key: 'rotation_index', label: 'Indice di rotazione', input: 'number' },
  { key: 'last_purchase_date', label: 'Ultimo acquisto', input: 'date' },
  { key: 'lotti', label: 'Gestione lotti', input: 'checkbox', default: false },
  { key: 'seriali', label: 'Gestione seriali', input: 'checkbox', default: false },
  { key: 'notes', label: 'Note', input: 'textarea' }
];

const numericKeys = ['purchase_price', 'avg_weighted_price'];
const integerKeys = ['min_stock'];
const floatKeys = ['rotation_index'];

const buildPayload = (data: ItemRow) => {
  const payload: ItemRow = {
    name: data.name?.trim(),
    sku: data.sku?.trim(),
    lotti: Boolean(data.lotti),
    seriali: Boolean(data.seriali),
    type: data.type?.trim() || null,
    category: data.category?.trim() || null,
    group: data.group?.trim() || null,
    class: data.class?.trim() || null,
    manufacturer: data.manufacturer?.trim() || null,
    distributor: data.distributor?.trim() || null,
    supplier: data.supplier?.trim() || null,
    notes: data.notes?.trim() || null,
    last_purchase_date: data.last_purchase_date || null,
  } as ItemRow;
  for (const key of numericKeys) {
    payload[key] = data[key] === '' || data[key] === undefined || data[key] === null ? null : Number(data[key]);
  }
  for (const key of integerKeys) {
    payload[key] = data[key] === '' || data[key] === undefined || data[key] === null ? null : Number.parseInt(data[key], 10);
  }
  for (const key of floatKeys) {
    payload[key] = data[key] === '' || data[key] === undefined || data[key] === null ? null : Number(data[key]);
  }
  return payload;
};

const transformResponse = (payload: any) => {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  return items.map((row: ItemRow) => ({
    ...row,
    purchase_price: row.purchase_price == null ? null : Number(row.purchase_price),
    avg_weighted_price: row.avg_weighted_price == null ? null : Number(row.avg_weighted_price),
    min_stock: row.min_stock == null ? null : Number(row.min_stock),
    rotation_index: row.rotation_index == null ? null : Number(row.rotation_index),
    quantity_on_hand: row.quantity_on_hand == null ? 0 : Number(row.quantity_on_hand),
  }));
};
</script>

<style scoped></style>

