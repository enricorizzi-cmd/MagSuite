<template>
  <div class="system-status">
    <h2>System Status</h2>
    <p>Version: {{ status.version }}</p>
    <h3>Migrations</h3>
    <ul>
      <li v-for="m in status.migrations" :key="m.name">{{ m.name }} - {{ m.status }}</li>
      <li v-if="!status.migrations.length">None</li>
    </ul>
    <h3>Queued Jobs</h3>
    <ul>
      <li v-for="job in status.jobs" :key="job">{{ job }}</li>
      <li v-if="!status.jobs.length">None</li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

interface Status {
  version: string;
  migrations: Array<{ name: string; status: string }>;
  jobs: string[];
}

const status = ref<Status>({ version: '', migrations: [], jobs: [] });

async function fetchStatus() {
  try {
    const res = await fetch('/system/status');
    if (res.ok) {
      const data = await res.json();
      status.value = {
        version: data.version || '',
        migrations: data.migrations || [],
        jobs: data.jobs || []
      };
    }
  } catch (err) {
    console.error('Failed to load system status', err);
  }
}

onMounted(fetchStatus);
</script>

<style scoped>
.system-status {
  padding: 1rem;
}
</style>
