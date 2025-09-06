<template>
  <div class="movement-list">
    <button @click="createMovement">Create {{ type }}</button>
    <table v-if="movements.length">
      <thead>
        <tr>
          <th>ID</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="m in movements" :key="m.id" @click="openMovement(m)">
          <td>{{ m.id }}</td>
          <td>{{ m.status }}</td>
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

async function fetchMovements() {
  try {
    const res = await fetch(`/documents?type=${type}`);
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
</script>

<style scoped>
.movement-list {
  padding: 1rem;
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
