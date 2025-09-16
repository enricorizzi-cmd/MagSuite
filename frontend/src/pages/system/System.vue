<template>
  <ResourceTablePage
    title="Stato sistema"
    description="Esito ultimo health-check di servizi e infrastruttura."
    new-label="Aggiornamento manuale"
    endpoint="/health/diagnostics"
    :fields="fields"
    :form-schema="[]"
    :transform-response="transformResponse"
    empty-label="Nessun dato di diagnostica disponibile."
    :show-new="false"
    :show-actions="false"
  />
</template>

<script setup lang="ts">
import ResourceTablePage from '../../components/ResourceTablePage.vue';

const fields = [
  { key: 'service', label: 'Servizio', type: 'string' },
  { key: 'status', label: 'Stato', type: 'string' },
  { key: 'details', label: 'Dettagli', type: 'string' },
  { key: 'response_time', label: 'Tempo risposta', type: 'string' }
];

const transformResponse = (payload: any) => {
  if (!payload || typeof payload !== 'object') return [];
  const { services = {}, overall, recommendations = [] } = payload;
  const rows = Object.entries(services).map(([key, value]: [string, any]) => ({
    service: key,
    status: value?.status ?? 'unknown',
    details: value?.error || value?.message || value?.mode || '-',
    response_time: value?.responseTime || value?.response_time || '-',
  }));
  rows.push({
    service: 'overall',
    status: overall?.status || '-',
    details: recommendations.length ? recommendations.join(' | ') : '-',
    response_time: payload.timestamp ? new Date(payload.timestamp).toLocaleString() : '-',
  });
  return rows;
};
</script>

<style scoped></style>
