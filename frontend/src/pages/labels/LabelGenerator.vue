<template>
  <div class="label-generator">
    <h1>Label Generator</h1>
    <div class="form">
      <input v-model="itemId" placeholder="Item ID" />
      <input v-model="lot" placeholder="Lot" />
      <input v-model="serial" placeholder="Serial" />
      <input v-model="template" placeholder="Template" />
      <select v-model="format">
        <option value="pdf">PDF</option>
        <option value="png">PNG</option>
      </select>
      <button @click="generate">Generate</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const itemId = ref('');
const lot = ref('');
const serial = ref('');
const format = ref('pdf');
const template = ref('standard');

async function loadSettings() {
  try {
    const res = await fetch('/settings');
    if (res.ok) {
      const data = await res.json();
      if (data.defaultLabelTemplate) {
        template.value = data.defaultLabelTemplate;
      }
    }
  } catch (err) {
    console.error('Failed to load settings', err);
  }
}

async function generate() {
  if (!itemId.value) return;

  try {
    await fetch(`/items/${itemId.value}/barcodes`, { method: 'POST' });
  } catch (err) {
    console.error('Barcode generation failed', err);
  }

  const params = new URLSearchParams();
  params.set('item_id', itemId.value);
  if (lot.value) params.set('lot', lot.value);
  if (serial.value) params.set('serial', serial.value);
  params.set('format', format.value);

  try {
    const res = await fetch(`/labels/${template.value}?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      const bytes = atob(data.content);
      const arr = Uint8Array.from(bytes, (c) => c.charCodeAt(0));
      const blob = new Blob([arr], {
        type: format.value === 'png' ? 'image/png' : 'application/pdf'
      });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    }
  } catch (err) {
    console.error('Failed to generate label', err);
  }
}

onMounted(() => {
  loadSettings();
});
</script>

<style scoped>
.label-generator {
  padding: 1rem;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 300px;
}
</style>

