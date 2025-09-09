<template>
  <div class="supplier-list">
    <section class="actions">
      <button @click="createSupplier">Create</button>
      <button @click="exportCSV">Export CSV</button>
      <button @click="showImport = true">Import CSV</button>
    </section>
    <ImportWizard v-if="showImport" type="suppliers" @close="showImport = false" @done="fetchSuppliers" />
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="s in suppliers" :key="s.id">
          <td>{{ s.name }}</td>
          <td><button @click="editSupplier(s)">Edit</button></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import ImportWizard from '../../components/ImportWizard.vue';

interface Supplier { id: number | string; name: string }

const router = useRouter();
const suppliers = ref<Supplier[]>([]);
const showImport = ref(false);

async function fetchSuppliers() {
  try {
    const res = await fetch('/suppliers');
    if (res.ok) {
      const data = await res.json();
      suppliers.value = data.items || [];
    }
  } catch (err) {
    console.error('Failed to load suppliers', err);
  }
}

function createSupplier() {
  router.push('/suppliers/new');
}

function editSupplier(s: Supplier) {
  router.push(`/suppliers/${s.id}`);
}

function exportCSV() {
  window.open('/suppliers/export', '_blank');
}

onMounted(fetchSuppliers);
</script>

<style scoped>
.actions {
  margin-bottom: 1rem;
  display: flex;
  gap: 0.5rem;
}
</style>

