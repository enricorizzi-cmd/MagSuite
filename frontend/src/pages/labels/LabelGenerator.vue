<template>
  <div class="label-generator">
    <h1>Label Generator</h1>
    <div class="form">
      <input v-model="itemId" placeholder="Item ID" />
      <input v-model="code" placeholder="Code" />
      <select v-model="codeType">
        <option value="code128">Code-128</option>
        <option value="ean13">EAN13</option>
        <option value="upca">UPC-A</option>
        <option value="qrcode">QR</option>
      </select>
      <textarea v-model="codesList" placeholder="Codes (one per line)" />
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
const code = ref('');
const codeType = ref('code128');
const codesList = ref('');
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

  if (codesList.value) {
    const items = codesList.value
      .split(/\n+/)
      .map((c) => c.trim())
      .filter((c) => c)
      .map((c) => ({ code: c, type: codeType.value, item_id: itemId.value, lot: lot.value, serial: serial.value }));
    try {
      const res = await fetch(`/labels/${template.value}/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: format.value, items })
      });
      if (res.ok) {
        const data = await res.json();
        if (format.value === 'png' && data.items) {
          const bytes = atob(data.items[0]);
          const arr = Uint8Array.from(bytes, (c) => c.charCodeAt(0));
          const blob = new Blob([arr], { type: 'image/png' });
          const url = URL.createObjectURL(blob);
          window.open(url, '_blank');
        } else if (data.content) {
          const bytes = atob(data.content);
          const arr = Uint8Array.from(bytes, (c) => c.charCodeAt(0));
          const blob = new Blob([arr], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          window.open(url, '_blank');
        }
      }
    } catch (err) {
      console.error('Failed to generate labels', err);
    }
    return;
  }

  const params = new URLSearchParams();
  params.set('item_id', itemId.value);
  if (code.value) params.set('code', code.value);
  params.set('type', codeType.value);
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

