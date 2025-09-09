<template>
  <div class="import-wizard">
    <div v-if="step === 'upload'">
      <h3>Upload File</h3>
      <input type="file" @change="onFile" />
    </div>
    <div v-else-if="step === 'mapping'">
      <h3>Map Fields</h3>
      <div v-for="header in headers" :key="header" class="map-row">
        <label>{{ header }}
          <select v-model="mapping[header]">
            <option value="">Ignore</option>
            <option value="name">Name</option>
          </select>
        </label>
      </div>
      <div class="template-tools">
        <label>
          Template
          <select v-model="selectedTemplate" @change="applyTemplate">
            <option value="">-- none --</option>
            <option v-for="t in templates" :key="t.id" :value="t.id">{{ t.name }}</option>
          </select>
        </label>
        <input v-model="templateName" placeholder="Save as template" />
        <button @click="saveTemplate" :disabled="!templateName">Save Template</button>
      </div>
      <button @click="runDryRun" :disabled="!file">Dry Run</button>
    </div>
    <div v-else-if="step === 'result'">
      <h3>Dry Run Result</h3>
      <table class="log-table" v-if="errorLog.length">
        <thead>
          <tr>
            <th>Line</th>
            <th>Reason</th>
            <th>Record</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="line in errorLog" :key="line.line">
            <td>{{ line.line }}</td>
            <td>{{ line.message }}</td>
            <td><pre>{{ JSON.stringify(line.row, null, 2) }}</pre></td>
          </tr>
        </tbody>
      </table>
      <p v-else>No errors found.</p>
      <button @click="downloadReport" :disabled="!errorLog.length">Download Report</button>
      <button @click="confirmImport">Import</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

interface LogEntry { line: number; message: string; error: boolean; row?: Record<string, unknown> }
interface Template { id: number; name: string; mapping: Record<string, string> }

const props = defineProps<{ type: string }>();
const emit = defineEmits(['close', 'done']);

const step = ref<'upload' | 'mapping' | 'result'>('upload');
const file = ref<File | null>(null);
const headers = ref<string[]>([]);
const mapping = ref<Record<string, string>>({});
const log = ref<LogEntry[]>([]);
const templates = ref<Template[]>([]);
const selectedTemplate = ref<string>('');
const templateName = ref('');
const errorLog = computed(() => log.value.filter((l) => l.error));

function onFile(e: Event) {
  const input = e.target as HTMLInputElement;
  if (!input.files?.length) return;
  file.value = input.files[0];
  const reader = new FileReader();
  reader.onload = () => {
    const text = String(reader.result || '');
    headers.value = text.split('\n')[0].split(',');
    step.value = 'mapping';
    loadTemplates();
  };
  reader.readAsText(file.value);
}

async function loadTemplates() {
  try {
    const res = await fetch(`/imports/templates/${props.type}`);
    if (res.ok) templates.value = await res.json();
  } catch (err) {
    console.error('Failed to load templates', err);
  }
}

function applyTemplate() {
  const tpl = templates.value.find((t) => String(t.id) === selectedTemplate.value);
  if (tpl) {
    mapping.value = { ...tpl.mapping };
  }
}

async function saveTemplate() {
  try {
    const res = await fetch(`/imports/templates/${props.type}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: templateName.value, mapping: mapping.value }),
    });
    if (res.ok) {
      templateName.value = '';
      await loadTemplates();
    }
  } catch (err) {
    console.error('Failed to save template', err);
  }
}

async function runDryRun() {
  if (!file.value) return;
  const form = new FormData();
  form.append('file', file.value);
  form.append('mapping', JSON.stringify(mapping.value));
  if (selectedTemplate.value) form.append('templateId', selectedTemplate.value);
  try {
    const res = await fetch(`/imports/${props.type}/dry-run`, { method: 'POST', body: form });
    if (res.ok) {
      const data = await res.json();
      log.value = data.log || [];
      step.value = 'result';
    }
  } catch (err) {
    console.error('Dry run failed', err);
  }
}

async function confirmImport() {
  if (!file.value) return;
  const form = new FormData();
  form.append('file', file.value);
  form.append('mapping', JSON.stringify(mapping.value));
  if (selectedTemplate.value) form.append('templateId', selectedTemplate.value);
  if (templateName.value) form.append('templateName', templateName.value);
  try {
    const res = await fetch(`/imports/${props.type}`, { method: 'POST', body: form });
    if (res.ok) {
      emit('done');
      emit('close');
    }
  } catch (err) {
    console.error('Import failed', err);
  }
}

function downloadReport() {
  if (!errorLog.value.length) return;
  const headerSet = new Set<string>();
  errorLog.value.forEach((e) => {
    Object.keys(e.row || {}).forEach((k) => headerSet.add(k));
  });
  const headers = Array.from(headerSet);
  const lines: string[] = [];
  const escape = (v: unknown) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? '"' + s.replace(/"/g, '""') + '"'
      : s;
  };
  lines.push([...headers, 'error'].join(','));
  errorLog.value.forEach((e) => {
    const vals = headers.map((h) => escape((e.row || {})[h]));
    vals.push(escape(e.message));
    lines.push(vals.join(','));
  });
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'import-errors.csv';
  a.click();
  URL.revokeObjectURL(url);
}
</script>

<style scoped>
.import-wizard {
  padding: 1rem;
  border: 1px solid #ccc;
}
.map-row {
  margin-bottom: 0.5rem;
}
.log-table {
  width: 100%;
  border-collapse: collapse;
}
.log-table th,
.log-table td {
  border: 1px solid #ccc;
  padding: 0.25rem;
}
pre {
  white-space: pre-wrap;
  margin: 0;
}
.template-tools {
  margin: 1rem 0;
}
</style>

