<template>
  <div class="supplier-form">
    <label>
      Name
      <input v-model="supplier.name" />
    </label>
    <div class="actions">
      <button @click="save">Save</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

interface Supplier { id?: number | string; name: string }

const route = useRoute();
const router = useRouter();
const id = route.params.id as string;
const supplier = ref<Supplier>({ name: '' });

onMounted(async () => {
  if (id && id !== 'new') {
    const res = await fetch(`/suppliers/${id}`);
    if (res.ok) {
      supplier.value = await res.json();
    }
  }
});

async function save() {
  const method = id === 'new' ? 'POST' : 'PUT';
  const url = id === 'new' ? '/suppliers' : `/suppliers/${id}`;
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(supplier.value)
  });
  if (res.ok) router.push('/suppliers');
}
</script>

<style scoped>
.supplier-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
}
.actions {
  margin-top: 1rem;
}
</style>

