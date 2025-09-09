<template>
  <div class="movement-list">
    <div class="filters">
      <input v-model="filters.causal" placeholder="Causale" />
      <input type="date" v-model="filters.from" />
      <input type="date" v-model="filters.to" />
      <input v-model="filters.item" placeholder="Articolo" />
      <button @click="fetchMovements">Filter</button>
      <button @click="createMovement">Create {{ type }}</button>
    </div>
    <table v-if="movements.length">
      <thead>
        <tr>
          <th>ID</th>
          <th>Status</th>
          <th>Causale</th>
          <th>Date</th>
          <th>Article</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="m in movements" :key="m.id" @click="openMovement(m)">
          <td>{{ m.id }}</td>
          <td>{{ m.status }}</td>
          <td>{{ m.causal || '-' }}</td>
          <td>{{ formatDate(m.created_at) }}</td>
          <td>{{ m.lines && m.lines[0] ? m.lines[0].barcode : '' }}</td>
        </tr>
      </tbody>
    </table>
    <p v-else>No movements found.</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

interface Movement {
  id: number | string;
  status: string;
  [key: string]: any;
}

const route = useRoute();
const router = useRouter();
const type = route.params.type as string;

const movements = ref<Movement[]>([]);
const filters = ref({ causal: '', from: '', to: '', item: '' });

async function fetchMovements() {
  try {
    const params = new URLSearchParams({ type });
    if (filters.value.causal) params.append('causal', filters.value.causal);
    if (filters.value.from) params.append('from', filters.value.from);
    if (filters.value.to) params.append('to', filters.value.to);
    if (filters.value.item) params.append('item', filters.value.item);
    const res = await fetch(`/documents?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      movements.value = Array.isArray(data) ? data : data.items || [];
    }
  } catch (err) {
    console.error('Failed to load movements', err);
  }
}

function openMovement(m: Movement) {
  router.push(`/movements/${type}/${m.id}`);
}

function createMovement() {
  router.push(`/movements/${type}/new`);
}

onMounted(fetchMovements);

function formatDate(d?: string) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString();
  } catch (err) {
    return '';
  }
}
</script>

<style scoped>
.movement-list {
  padding: 1rem;
}
.filters {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 1rem;
}
table {
  margin-top: 1rem;
  width: 100%;
  border-collapse: collapse;
}
th, td {
  border: 1px solid #ccc;
  padding: 0.5rem;
  text-align: left;
}
tr:hover {
  background: #f5f5f5;
  cursor: pointer;
}
</style>
