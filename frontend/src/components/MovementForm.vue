<template>
  <div class="movement-form">
    <h2>{{ type }} {{ documentId ?? '' }}</h2>
    <p>Status: {{ status }}</p>
    <div class="causal">
      <label>Causale</label>
      <input v-model="causal" />
    </div>
    <div class="scanner">
      <input ref="scanInput" v-model="scanCode" @keyup.enter="handleScan" @blur="focusInput" />
      <span v-if="flash" class="flash"></span>
    </div>
    <table>
      <thead>
        <tr>
          <th>Barcode</th>
          <th>Lotto</th>
          <th>Seriale</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(line, idx) in lines" :key="idx">
          <td>{{ line.barcode }}</td>
          <td><input v-model="line.lot" :class="{ required: line.requiresLot && !line.lot }" /></td>
          <td><input v-model="line.serial" :class="{ required: line.requiresSerial && !line.serial }" /></td>
          <td><button @click="removeLine(idx)">X</button></td>
        </tr>
      </tbody>
    </table>
    <button @click="save">Save</button>
    <button v-if="documentId && status !== 'cancelled'" @click="confirm">Confirm</button>
    <button v-if="documentId && status !== 'cancelled'" @click="cancel">Cancel</button>
    <button v-if="documentId" @click="printDoc">Print</button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

interface Line {
  barcode: string;
  lot?: string;
  serial?: string;
  requiresLot?: boolean;
  requiresSerial?: boolean;
}

const route = useRoute();
const router = useRouter();
const type = route.params.type as string;
const id = route.params.id as string;
const isNew = id === 'new';

const lines = ref<Line[]>([]);
const status = ref('in_transito');
const documentId = ref<number | null>(null);
const scanCode = ref('');
const scanInput = ref<HTMLInputElement | null>(null);
const flash = ref(false);
const causal = ref('');
let beep: HTMLAudioElement;

onMounted(() => {
  focusInput();
  beep = new Audio('/beep.mp3');
  if (!isNew) {
    fetchDocument();
  }
});

function focusInput() {
  scanInput.value?.focus();
}

async function fetchDocument() {
  try {
    const res = await fetch(`/documents/${id}`);
    if (res.ok) {
      const data = await res.json();
      documentId.value = data.id;
      lines.value = data.lines && data.lines.length ? data.lines : [];
      status.value = data.status || 'in_transito';
      causal.value = data.causal || '';
    }
  } catch (err) {
    console.error('Failed to load document', err);
  }
}

async function handleScan() {
  const code = scanCode.value.trim();
  if (!code) return;
  const line: Line = { barcode: code, lot: '', serial: '' };
  try {
    const res = await fetch(`/items/${code}`);
    if (res.ok) {
      const item = await res.json();
      line.requiresLot = item.requires_lot || false;
      line.requiresSerial = item.requires_serial || false;
    }
  } catch (err) {
    // ignore fetch errors
  }
  lines.value.push(line);
  scanCode.value = '';
  playBeep();
  flash.value = true;
  setTimeout(() => (flash.value = false), 200);
  focusInput();
}

function playBeep() {
  if (beep) {
    try {
      beep.currentTime = 0;
      beep.play();
    } catch (err) {
      // ignore play errors
    }
  }
}

function removeLine(idx: number) {
  lines.value.splice(idx, 1);
}

function validateLines() {
  for (const line of lines.value) {
    if (line.requiresLot && !line.lot) {
      alert('Lotto obbligatorio');
      return false;
    }
    if (line.requiresSerial && !line.serial) {
      alert('Seriale obbligatorio');
      return false;
    }
  }
  return true;
}

async function save() {
  if (!validateLines()) return;
  const payload = {
    type,
    status: 'in_transito',
    causal: causal.value || null,
    lines: lines.value
  };
  try {
    const res = await fetch('/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      const data = await res.json();
      documentId.value = data.id;
      router.replace(`/movements/${type}/${data.id}`);
    }
  } catch (err) {
    console.error('Failed to save movement', err);
  }
}

async function confirm() {
  if (!documentId.value) return;
  if (!validateLines()) return;
  try {
    const res = await fetch(`/documents/${documentId.value}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ movements: [type] })
    });
    if (res.ok) {
      const data = await res.json();
      status.value = data.status || 'confirmed';
    }
  } catch (err) {
    console.error('Failed to confirm movement', err);
  }
}

async function cancel() {
  if (!documentId.value) return;
  try {
    const res = await fetch(`/documents/${documentId.value}/cancel`, {
      method: 'POST'
    });
    if (res.ok) {
      const data = await res.json();
      status.value = data.status || 'cancelled';
    }
  } catch (err) {
    console.error('Failed to cancel movement', err);
  }
}

function printDoc() {
  if (!documentId.value) return;
  window.open(`/documents/${documentId.value}/print`, '_blank');
}
</script>

<style scoped>
.movement-form {
  padding: 1rem;
}
.causal {
  margin-bottom: 1rem;
}
.scanner {
  margin-bottom: 1rem;
}
.flash {
  display: inline-block;
  width: 10px;
  height: 10px;
  background: green;
  margin-left: 0.5rem;
}
table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1rem;
}
th, td {
  border: 1px solid #ccc;
  padding: 0.5rem;
  text-align: left;
}
.required {
  border-color: red;
}
</style>
