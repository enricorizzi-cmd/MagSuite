<template>
  <div class="customer-list">
    <section class="actions">
      <button @click="createCustomer">Create</button>
      <button @click="exportCSV">Export CSV</button>
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

function exportCSV() {
  window.open('/customers/export', '_blank');
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

