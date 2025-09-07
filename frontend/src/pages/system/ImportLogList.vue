<template>
  <div class="import-log">
    <div v-if="!importId">
      <h2>Imports</h2>
      <table v-if="imports.length">
        <thead>
          <tr>
            <th>ID</th>
            <th>Type</th>
            <th>Count</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="imp in imports" :key="imp.id" @click="viewLog(imp.id)">
            <td>{{ imp.id }}</td>
            <td>{{ imp.type }}</td>
            <td>{{ imp.count }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else>No imports found.</p>
    </div>
    <div v-else>
      <h2>Import {{ importId }} Log</h2>
      <button @click="downloadFile">Download File</button>
      <table v-if="logLines.length">
        <thead>
          <tr>
            <th>Line</th>
            <th>Message</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="entry in logLines" :key="entry.line" :class="{ error: entry.error }">
            <td>{{ entry.line }}</td>
            <td>{{ entry.message }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else>No log lines.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

interface ImportEntry {
  id: number;
  type: string;
  count: number;
}

interface LogEntry {
  line: number;
  message: string;
  error: boolean;
}

const route = useRoute();
const router = useRouter();
const imports = ref<ImportEntry[]>([]);
const logLines = ref<LogEntry[]>([]);
const importId = ref<string | undefined>(route.params.id as string | undefined);

async function fetchImports() {
  try {
    const res = await fetch('/system/imports');
    if (res.ok) {
      imports.value = await res.json();
    }
  } catch (err) {
    console.error('Failed to load imports', err);
  }
}

async function fetchLog() {
  if (!importId.value) return;
  try {
    const res = await fetch(`/imports/${importId.value}/log`);
    if (res.ok) {
      const data = await res.json();
      logLines.value = data.log || data.lines || [];
    }
  } catch (err) {
    console.error('Failed to load import log', err);
  }
}

function viewLog(id: number) {
  router.push(`/system/imports/${id}`);
}

async function downloadFile() {
  if (!importId.value) return;
  try {
    const res = await fetch(`/imports/${importId.value}/file`);
    if (!res.ok) return;
    const data = await res.json();
    const link = document.createElement('a');
    link.href = `data:application/octet-stream;base64,${data.content}`;
    link.download = data.filename || 'import.csv';
    link.click();
  } catch (err) {
    console.error('Failed to download file', err);
  }
}

onMounted(() => {
  if (importId.value) {
    fetchLog();
  } else {
    fetchImports();
  }
});

watch(
  () => route.params.id,
  (newId) => {
    importId.value = newId as string | undefined;
    logLines.value = [];
    imports.value = [];
    if (importId.value) {
      fetchLog();
    } else {
      fetchImports();
    }
  }
);
</script>

<style scoped>
.import-log {
  padding: 1rem;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}

th,
td {
  border: 1px solid #ccc;
  padding: 0.5rem;
  text-align: left;
}

tr.error {
  background: #ffe5e5;
}

tr:hover {
  background: #f5f5f5;
  cursor: pointer;
}
</style>
