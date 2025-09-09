<template>
  <div class="customer-list">
    <section class="actions">
      <button @click="createCustomer">Create</button>
      <select v-model="exportFormat">
        <option value="csv">CSV</option>
        <option value="xlsx">XLSX</option>
      </select>
      <select multiple v-model="selectedColumns">
        <option v-for="col in allColumns" :key="col" :value="col">
          {{ col }}
        </option>
      </select>
      <button @click="exportData">Export</button>
      <button @click="showImport = true">Import CSV</button>
    </section>
    <ImportWizard v-if="showImport" type="customers" @close="showImport = false" @done="fetchCustomers" />
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="c in customers" :key="c.id">
          <td>{{ c.name }}</td>
          <td><button @click="editCustomer(c)">Edit</button></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import ImportWizard from '../../components/ImportWizard.vue';
import { useRouter } from 'vue-router';

interface Customer { id: number | string; name: string }

const router = useRouter();
const customers = ref<Customer[]>([]);
const showImport = ref(false);
const allColumns = ['id', 'name'];
const selectedColumns = ref<string[]>([...allColumns]);
const exportFormat = ref('csv');

async function fetchCustomers() {
  try {
    const res = await fetch('/customers');
    if (res.ok) {
      const data = await res.json();
      customers.value = data.items || [];
    }
  } catch (err) {
    console.error('Failed to load customers', err);
  }
}

function createCustomer() {
  router.push('/customers/new');
}

function editCustomer(c: Customer) {
  router.push(`/customers/${c.id}`);
}

function exportData() {
  const params = new URLSearchParams();
  params.set('columns', selectedColumns.value.join(','));
  params.set('format', exportFormat.value);
  window.open(`/customers/export?${params.toString()}`, '_blank');
}

onMounted(fetchCustomers);
</script>

<style scoped>
.actions {
  margin-bottom: 1rem;
  display: flex;
  gap: 0.5rem;
}
</style>

