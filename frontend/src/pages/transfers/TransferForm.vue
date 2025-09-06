<template>
  <div class="transfer-form">
    <h2>Transfer {{ documentId ?? '' }}</h2>
    <p>Status: {{ status }}</p>
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
          <td><input v-model="line.barcode" /></td>
          <td><input v-model="line.lot" /></td>
          <td><input v-model="line.serial" /></td>
          <td><button @click="removeLine(idx)">X</button></td>
        </tr>
      </tbody>
    </table>
    <button @click="addLine">Add Line</button>
    <button @click="save">Save</button>
    <button v-if="documentId" @click="confirm">Confirm</button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

interface Line {
  barcode: string;
  lot?: string;
  serial?: string;
}

const route = useRoute();
const router = useRouter();
const id = route.params.id as string;
const isNew = id === 'new';

const lines = ref<Line[]>([{ barcode: '', lot: '', serial: '' }]);
const status = ref('in_transito');
const documentId = ref<number | null>(null);

onMounted(() => {
  if (!isNew) {
    fetchDocument();
  }
});

async function fetchDocument() {
  try {
    const res = await fetch(`/documents/${id}`);
    if (res.ok) {
      const data = await res.json();
      documentId.value = data.id;
      lines.value = data.lines && data.lines.length ? data.lines : [{ barcode: '', lot: '', serial: '' }];
      status.value = data.status || 'in_transito';
    }
  } catch (err) {
    console.error('Failed to load document', err);
  }
}

function addLine() {
  lines.value.push({ barcode: '', lot: '', serial: '' });
}

function removeLine(idx: number) {
  lines.value.splice(idx, 1);
  if (!lines.value.length) addLine();
}

async function save() {
  const payload = {
    type: 'TRASF',
    status: 'in_transito',
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
      router.replace(`/transfers/${data.id}`);
    }
  } catch (err) {
    console.error('Failed to save transfer', err);
  }
}

async function confirm() {
  if (!documentId.value) return;
  try {
    const res = await fetch(`/documents/${documentId.value}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ movements: ['TRASF_OUT', 'TRASF_IN'] })
    });
    if (res.ok) {
      const data = await res.json();
      status.value = data.status || 'confirmed';
    }
  } catch (err) {
    console.error('Failed to confirm transfer', err);
  }
}
</script>

<style scoped>
.transfer-form {
  padding: 1rem;
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
</style>
