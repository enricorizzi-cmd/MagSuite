<template>
  <div class="mrp-suggestions">
    <table v-if="suggestions.length">
      <thead>
        <tr>
          <th>Item</th>
          <th>ROP</th>
          <th>Avg Demand</th>
          <th>Suggested Qty</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="s in suggestions" :key="s.item">
          <td>{{ s.item }}</td>
          <td>{{ s.rop }}</td>
          <td>{{ s.avg_demand }}</td>
          <td>{{ s.suggested_qty }}</td>
          <td>
            <button @click="generatePo(s)">Generate PO</button>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-else>No suggestions found.</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

interface Suggestion {
  item: string;
  rop: number;
  avg_demand: number;
  suggested_qty: number;
}

const suggestions = ref<Suggestion[]>([]);
const router = useRouter();

async function fetchSuggestions() {
  try {
    const res = await fetch('/mrp/suggestions');
    if (res.ok) {
      suggestions.value = await res.json();
    }
  } catch (err) {
    console.error('Failed to load suggestions', err);
  }
}

async function generatePo(s: Suggestion) {
  try {
    const res = await fetch('/po', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item: s.item, qty: s.suggested_qty })
    });
    if (res.ok) {
      const data = await res.json();
      router.push(`/purchase-orders/${data.id}`);
    }
  } catch (err) {
    console.error('Failed to create purchase order', err);
  }
}

onMounted(fetchSuggestions);
</script>

<style scoped>
.mrp-suggestions {
  padding: 1rem;
}

table {
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
