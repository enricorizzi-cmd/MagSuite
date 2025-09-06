<template>
  <div class="inventory-list">
    <button @click="createInventory">New Inventory</button>
    <table v-if="inventories.length">
      <thead>
        <tr>
          <th>ID</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="inv in inventories" :key="inv.id" @click="openInventory(inv)">
          <td>{{ inv.id }}</td>
          <td>{{ inv.status }}</td>
        </tr>
      </tbody>
    </table>
    <p v-else>No inventories found.</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

interface Inventory {
  id: number | string;
  status: string;
  [key: string]: any;
}

const inventories = ref<Inventory[]>([]);
const router = useRouter();

async function fetchInventories() {
  try {
    const res = await fetch('/inventories');
    if (res.ok) {
      const data = await res.json();
      inventories.value = Array.isArray(data) ? data : data.items || [];
    }
  } catch (err) {
    console.error('Failed to load inventories', err);
  }
}

function openInventory(inv: Inventory) {
  router.push(`/inventories/${inv.id}`);
}

async function createInventory() {
  try {
    const res = await fetch('/inventories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    if (res.ok) {
      const data = await res.json();
      router.push(`/inventories/${data.id}`);
    }
  } catch (err) {
    console.error('Failed to create inventory', err);
  }
}

onMounted(fetchInventories);
</script>

<style scoped>
.inventory-list {
  padding: 1rem;
}

table {
  margin-top: 1rem;
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  border: 1px solid #ccc;
  padding: 0.5rem;
  text-align: left;
}

tr:hover {
  background: #f5f5f5;
  cursor: pointer;
}
</style>
