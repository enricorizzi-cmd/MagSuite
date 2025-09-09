<template>
  <div class="mrp-suggestions">
    <table v-if="suggestions.length">
      <thead>
        <tr>
          <th>Select</th>
          <th>Item</th>
          <th>ROP</th>
          <th>Avg Demand</th>
          <th>Suggested Qty</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="s in suggestions" :key="s.item">
          <td>
            <input type="checkbox" v-model="selected" :value="s.item" />
          </td>
          <td>{{ s.item }}</td>
          <td>{{ s.rop }}</td>
          <td>{{ s.avg_demand }}</td>
          <td>{{ s.suggested_qty }}</td>
        </tr>
      </tbody>
    </table>
    <button v-if="suggestions.length" :disabled="!selected.length" @click="generateSelectedPo">
      Generate PO
    </button>
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
const selected = ref<string[]>([]);
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

async function generateSelectedPo() {
  const lines = suggestions.value
    .filter((s) => selected.value.includes(s.item))
    .map((s) => ({ item: s.item, qty: s.suggested_qty }));
  if (!lines.length) return;
  try {
    const res = await fetch('/po', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lines })
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
