<template>
  <div class="transfer-list">
    <button @click="createTransfer">Create Transfer</button>
    <table v-if="transfers.length">
      <thead>
        <tr>
          <th>ID</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="tr in transfers" :key="tr.id" @click="openTransfer(tr)">
          <td>{{ tr.id }}</td>
          <td>{{ tr.status }}</td>
        </tr>
      </tbody>
    </table>
    <p v-else>No transfers found.</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

interface Transfer {
  id: number | string;
  status: string;
  [key: string]: any;
}

const transfers = ref<Transfer[]>([]);
const router = useRouter();

async function fetchTransfers() {
  try {
    const res = await fetch('/documents?type=TRASF');
    if (res.ok) {
      const data = await res.json();
      transfers.value = Array.isArray(data) ? data : data.items || [];
    }
  } catch (err) {
    console.error('Failed to load transfers', err);
  }
}

function openTransfer(tr: Transfer) {
  router.push(`/transfers/${tr.id}`);
}

function createTransfer() {
  router.push('/transfers/new');
}

onMounted(fetchTransfers);
</script>

<style scoped>
.transfer-list {
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
