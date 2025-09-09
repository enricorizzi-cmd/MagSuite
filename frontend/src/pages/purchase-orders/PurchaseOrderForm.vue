<template>
  <div class="po-form" v-if="po">
    <h2>Purchase Order {{ po.id }}</h2>
    <p>Status: {{ po.status }}</p>

    <table v-if="po.lines && po.lines.length">
      <thead>
        <tr>
          <th>Item</th>
          <th>Qty</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(line, idx) in po.lines" :key="idx">
          <td>{{ line.item }}</td>
          <td>{{ line.qty }}</td>
        </tr>
      </tbody>
    </table>

    <button v-if="nextStatus" @click="advanceStatus">
      {{ nextLabel }}
    </button>
  </div>
  <p v-else>Loading...</p>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';

interface PurchaseOrder {
  id: number | string;
  status: string;
  lines: Array<{ item: string; qty: number }>;
}

const route = useRoute();
const po = ref<PurchaseOrder | null>(null);
const statuses = ['draft', 'confirmed', 'receiving', 'closed'];

const nextStatus = computed(() => {
  if (!po.value) return null;
  const idx = statuses.indexOf(po.value.status);
  if (idx === -1 || idx === statuses.length - 1) return null;
  return statuses[idx + 1];
});

const nextLabel = computed(() => {
  if (!nextStatus.value) return '';
  const labels: Record<string, string> = {
    confirmed: 'Confirm',
    receiving: 'Receive',
    closed: 'Close',
  };
  return labels[nextStatus.value] || '';
});

async function fetchPo() {
  try {
    const res = await fetch(`/purchase-orders/${route.params.id}`);
    if (res.ok) {
      po.value = await res.json();
    }
  } catch (err) {
    console.error('Failed to load purchase order', err);
  }
}

async function advanceStatus() {
  if (!po.value || !nextStatus.value) return;
  try {
    const res = await fetch(`/purchase-orders/${po.value.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus.value })
    });
    if (res.ok) {
      const data = await res.json();
      po.value.status = data.status;
    }
  } catch (err) {
    console.error('Failed to update purchase order status', err);
  }
}

onMounted(fetchPo);
</script>

<style scoped>
.po-form {
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
</style>
