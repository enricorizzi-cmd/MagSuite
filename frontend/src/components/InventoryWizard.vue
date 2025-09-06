<template>
  <div class="inventory-wizard">
    <h2>Inventory {{ id }}</h2>
    <p>Status: {{ inventory.status }}</p>

    <div v-if="step === 'scope'">
      <p>Define scope of the inventory.</p>
      <button @click="freeze">Freeze Area</button>
      <button @click="nextStep">Next</button>
    </div>

    <div v-else-if="step === 'counting'">
      <p>Counting items...</p>
      <button @click="nextStep">Next</button>
    </div>

    <div v-else-if="step === 'differences'">
      <p>Review differences.</p>
      <button @click="nextStep">Next</button>
    </div>

    <div v-else-if="step === 'closure'">
      <button @click="closeInventory">Close Inventory</button>
      <div v-if="report">
        <a :href="reportUrl" target="_blank">View Report PDF</a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const id = route.params.id as string;

const inventory = ref<any>({});
const step = ref<'scope' | 'counting' | 'differences' | 'closure'>('scope');
const report = ref('');

async function fetchInventory() {
  try {
    const res = await fetch(`/inventories/${id}`);
    if (res.ok) {
      inventory.value = await res.json();
    }
  } catch (err) {
    console.error('Failed to load inventory', err);
  }
}

function nextStep() {
  const steps = ['scope', 'counting', 'differences', 'closure'];
  const idx = steps.indexOf(step.value);
  if (idx < steps.length - 1) step.value = steps[idx + 1] as any;
}

async function freeze() {
  try {
    const res = await fetch(`/inventories/${id}/freeze`, { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      inventory.value.status = data.status;
    }
  } catch (err) {
    console.error('Failed to freeze inventory', err);
  }
}

async function closeInventory() {
  try {
    const res = await fetch(`/inventories/${id}/close`, { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      inventory.value.status = data.status;
      report.value = data.report;
    }
  } catch (err) {
    console.error('Failed to close inventory', err);
  }
}

const reportUrl = computed(() =>
  report.value ? `data:application/pdf;base64,${report.value}` : ''
);

onMounted(fetchInventory);
</script>

<style scoped>
.inventory-wizard {
  padding: 1rem;
}
</style>
