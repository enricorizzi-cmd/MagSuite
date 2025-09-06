<template>
  <div class="supplier-list">
    <section class="actions">
      <button @click="createSupplier">Create</button>
      <button @click="exportCSV">Export CSV</button>
      <label class="import-csv">
        Import CSV
        <input type="file" accept=".csv" @change="importCSV" hidden />
      </label>
    </section>
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

interface Supplier { id: number | string; name: string }

const router = useRouter();
const suppliers = ref<Supplier[]>([]);

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

async function importCSV(e: Event) {
  const input = e.target as HTMLInputElement;
  if (!input.files?.length) return;
  const form = new FormData();
  form.append('file', input.files[0]);
  try {
    const res = await fetch('/imports/suppliers', { method: 'POST', body: form });
    if (res.ok) fetchSuppliers();
  } catch (err) {
    console.error('Import failed', err);
  } finally {
    input.value = '';
  }
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
.import-csv {
  display: inline-block;
}
</style>

