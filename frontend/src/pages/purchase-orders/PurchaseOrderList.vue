<template>
  <div class="po-list">
    <button @click="createPo">New Purchase Order</button>
    <table v-if="orders.length">
      <thead>
        <tr>
          <th>ID</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="po in orders" :key="po.id" @click="openPo(po)">
          <td>{{ po.id }}</td>
          <td>{{ po.status }}</td>
        </tr>
      </tbody>
    </table>
    <p v-else>No purchase orders found.</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

interface PurchaseOrder {
  id: number | string;
  status: string;
  [key: string]: any;
}

const orders = ref<PurchaseOrder[]>([]);
const router = useRouter();

async function fetchOrders() {
  try {
    const res = await fetch('/purchase-orders');
    if (res.ok) {
      const data = await res.json();
      orders.value = Array.isArray(data) ? data : data.items || [];
    }
  } catch (err) {
    console.error('Failed to load purchase orders', err);
  }
}

function openPo(po: PurchaseOrder) {
  router.push(`/purchase-orders/${po.id}`);
}

async function createPo() {
  try {
    const res = await fetch('/po', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lines: [] })
    });
    if (res.ok) {
      const data = await res.json();
      router.push(`/purchase-orders/${data.id}`);
    }
  } catch (err) {
    console.error('Failed to create purchase order', err);
  }
}

onMounted(fetchOrders);
</script>

<style scoped>
.po-list {
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
