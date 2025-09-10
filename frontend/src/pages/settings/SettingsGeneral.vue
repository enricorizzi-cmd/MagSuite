<template>
  <div class="settings-general">
    <label>
      Company Name
      <input v-model="general.companyName" />
    </label>
    <div class="actions">
      <button @click="save">Save</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const general = ref<{ companyName: string }>({ companyName: '' });

onMounted(async () => {
  try {
    const { default: api } = await import('../../services/api');
    const { data } = await api.get('/settings');
    general.value = data.general || { companyName: '' };
  } catch (err) {
    console.error('Failed to load settings', err);
  }
});

async function save() {
  try {
    const { default: api } = await import('../../services/api');
    await api.put('/settings', { general: general.value });
  } catch (err) {
    console.error('Failed to save settings', err);
  }
}
</script>

<style scoped>
.settings-general {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.actions {
  margin-top: 1rem;
}
</style>
