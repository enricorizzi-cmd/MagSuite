<template>
  <div class="settings-classifiers">
    <label>
      Default Category
      <input v-model="classifiers.defaultCategory" />
    </label>
    <div class="actions">
      <button @click="save">Save</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const classifiers = ref<{ defaultCategory: string }>({ defaultCategory: '' });

onMounted(async () => {
  try {
    const { default: api } = await import('../../services/api');
    const { data } = await api.get('/settings');
    classifiers.value = data.classifiers || { defaultCategory: '' };
  } catch (err) {
    console.error('Failed to load settings', err);
  }
});

async function save() {
  try {
    const { default: api } = await import('../../services/api');
    await api.put('/settings', { classifiers: classifiers.value });
  } catch (err) {
    console.error('Failed to save settings', err);
  }
}
</script>

<style scoped>
.settings-classifiers {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.actions {
  margin-top: 1rem;
}
</style>
