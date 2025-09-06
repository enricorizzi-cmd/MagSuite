<template>
  <div class="dashboard">
    <section class="kpis">
      <div v-for="(value, key) in kpis" :key="key" class="kpi">
        <h3>{{ key }}</h3>
        <p>{{ value }}</p>
      </div>
    </section>

    <section class="charts">
      <div v-for="(data, key) in charts" :key="key" class="chart">
        <h3>{{ key }}</h3>
        <pre>{{ data }}</pre>
      </div>
    </section>

    <section class="alerts">
      <h2>Open Alerts</h2>
      <ul>
        <li v-for="alert in alerts" :key="alert.id">
          <button @click="selectAlert(alert)">
            {{ alert.message || alert.title || alert.id }}
          </button>
        </li>
      </ul>
      <div v-if="selectedAlert" class="alert-detail">
        <h3>Alert {{ selectedAlert.id }}</h3>
        <pre>{{ selectedAlert }}</pre>
        <button @click="selectedAlert = null">Close</button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';

type KPIMap = Record<string, number>;

interface Alert {
  id: string | number;
  [key: string]: any;
}

const kpis = ref<KPIMap>({});
const charts = ref<Record<string, unknown>>({});
const alerts = ref<Alert[]>([]);
const selectedAlert = ref<Alert | null>(null);

function selectAlert(alert: Alert) {
  selectedAlert.value = alert;
}

onMounted(async () => {
  try {
    const dashboardRes = await fetch('/reports/dashboard');
    if (dashboardRes.ok) {
      const data = await dashboardRes.json();
      kpis.value = data.kpis || {};
      charts.value = data.charts || {};
    }
  } catch (err) {
    console.error('Failed to load dashboard data', err);
  }

  try {
    const alertsRes = await fetch('/alerts?status=open');
    if (alertsRes.ok) {
      alerts.value = await alertsRes.json();
    }
  } catch (err) {
    console.error('Failed to load alerts', err);
  }
});
</script>

<style scoped>
.dashboard {
  padding: 1rem;
}
.kpis {
  display: flex;
  gap: 1rem;
}
.kpi {
  background: #f0f0f0;
  padding: 1rem;
  border-radius: 4px;
}
.charts {
  margin-top: 2rem;
}
.alerts {
  margin-top: 2rem;
}
.alert-detail {
  margin-top: 1rem;
  background: #ffe0e0;
  padding: 1rem;
}
</style>
