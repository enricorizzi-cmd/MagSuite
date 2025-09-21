<template>
  <ResourceTablePage
    title="Games"
    description="Programmi di gamification e stato di avanzamento."
    new-label="Nuova iniziativa"
    :show-new="false"
    :show-actions="false"
    endpoint="/gestionale/games"
    :fields="fields"
    :form-schema="[]"
    :transform-response="transformResponse"
  />
</template>

<script setup lang="ts">
import ResourceTablePage from '../../components/ResourceTablePage.vue';

const fields = [
  { key: 'name', label: 'Nome', type: 'string' },
  { key: 'status', label: 'Stato', type: 'string' },
  { key: 'starts_at', label: 'Avvio', type: 'string' }
];

const transformResponse = (payload: any) => {
  const list = Array.isArray(payload?.items) ? payload.items : [];
  return list.map((row: Record<string, any>) => ({
    ...row,
    starts_at: row.starts_at ? new Date(row.starts_at).toLocaleString('it-IT') : ''
  }));
};
</script>
