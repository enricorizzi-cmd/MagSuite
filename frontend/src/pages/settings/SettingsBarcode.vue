<template>
  <div class="settings-barcode">
    <label>
      Barcode Length
      <input type="number" v-model.number="barcode.barcodeLength" />
    </label>
    <div class="actions">
      <button @click="save">Save</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const barcode = ref<{ barcodeLength: number }>({ barcodeLength: 0 });

onMounted(async () => {
  try {
    const res = await fetch('/settings');
    if (res.ok) {
      const data = await res.json();
      barcode.value = data.barcode || { barcodeLength: 0 };
    }
  } catch (err) {
    console.error('Failed to load settings', err);
  }
});

async function save() {
  try {
    await fetch('/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ barcode: barcode.value })
    });
  } catch (err) {
    console.error('Failed to save settings', err);
  }
}
</script>

<style scoped>
.settings-barcode {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.actions {
  margin-top: 1rem;
}
</style>
