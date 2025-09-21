<template>
  <ResourceTablePage
    title="Profilo utenti"
    description="Profili applicativi sincronizzati con Supabase."
    new-label="Nuovo profilo"
    :show-new="false"
    :show-actions="false"
    endpoint="/gestionale/profiles"
    :fields="fields"
    :form-schema="[]"
    :transform-response="transformResponse"
  />
</template>

<script setup lang="ts">
import ResourceTablePage from '../../components/ResourceTablePage.vue';

const fields = [
  { key: 'full_name', label: 'Nome completo', type: 'string' },
  { key: 'locale', label: 'Lingua', type: 'string' },
  { key: 'created_at', label: 'Creato il', type: 'string' }
];

const transformResponse = (payload: any) => {
  const list = Array.isArray(payload?.items) ? payload.items : [];
  return list.map((row: Record<string, any>) => ({
    ...row,
    created_at: row.created_at ? new Date(row.created_at).toLocaleString('it-IT') : ''
  }));
};
</script>
