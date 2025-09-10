<template>
  <div class="dashboard">
    <div class="filters">
      <input type="date" v-model="filters.from" />
      <input type="date" v-model="filters.to" />
      <select v-model="filters.warehouse">
        <option value="">Tutti i magazzini</option>
        <option v-for="w in warehouses" :key="w.id" :value="w.id">{{ w.name }}</option>
      </select>
      <button @click="loadDashboard">Applica filtri</button>
    </div>

    <section class="kpis">
      <div v-for="(value, key) in kpis" :key="key" class="kpi">
        <h3>{{ key }}</h3>
        <p>{{ value }}</p>
      </div>
    </section>

    <section class="quick-links">
      <router-link to="/movements/inbound">Movimenti</router-link>
      <router-link to="/purchase-orders">PO</router-link>
      <router-link to="/labels">Etichette</router-link>
      <router-link to="/system/imports">Import</router-link>
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

interface Warehouse {
  id: number;
  name: string;
}

const kpis = ref<KPIMap>({});
const charts = ref<Record<string, unknown>>({});
const alerts = ref<Alert[]>([]);
const selectedAlert = ref<Alert | null>(null);
const filters = ref({ from: '', to: '', warehouse: '' });
const warehouses = ref<Warehouse[]>([]);

function selectAlert(alert: Alert) {
  selectedAlert.value = alert;
}

async function loadDashboard() {
  try {
    const params = new URLSearchParams();
    if (filters.value.from) params.set('from', filters.value.from);
    if (filters.value.to) params.set('to', filters.value.to);
    if (filters.value.warehouse) params.set('warehouse', String(filters.value.warehouse));
    const { default: api } = await import('../../services/api');
    const url = `/reports/dashboard${params.toString() ? `?${params.toString()}` : ''}`;
    const { data } = await api.get(url);
    kpis.value = data.kpis || {};
    charts.value = data.charts || {};
  } catch (err) {
    console.error('Failed to load dashboard data', err);
  }
}

async function loadAlerts() {
  try {
    const { default: api } = await import('../../services/api');
    const { data } = await api.get('/alerts', { params: { status: 'open' } });
    alerts.value = data || [];
  } catch (err) {
    console.error('Failed to load alerts', err);
  }
}

async function loadWarehouses() {
  try {
    const { default: api } = await import('../../services/api');
    const { data } = await api.get('/warehouses');
    warehouses.value = data.items || [];
  } catch (err) {
    console.error('Failed to load warehouses', err);
  }
}

onMounted(async () => {
  await loadWarehouses();
  await loadDashboard();
  await loadAlerts();
});
</script>

<style scoped>
.dashboard {
  padding: 1rem;
}
.filters {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 1rem;
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
.quick-links {
  margin-top: 1rem;
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}
.quick-links a {
  background: #007bff;
  color: #fff;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  text-decoration: none;
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
