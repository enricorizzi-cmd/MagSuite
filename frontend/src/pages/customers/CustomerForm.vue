<template>
  <div class="customer-form">
    <label>
      Name
      <input v-model="customer.name" />
    </label>
    <div class="actions">
      <button @click="save">Save</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

interface Customer { id?: number | string; name: string }

const route = useRoute();
const router = useRouter();
const id = route.params.id as string;
const customer = ref<Customer>({ name: '' });

onMounted(async () => {
  if (id && id !== 'new') {
    const res = await fetch(`/customers/${id}`);
    if (res.ok) {
      customer.value = await res.json();
    }
  }
});

async function save() {
  const method = id === 'new' ? 'POST' : 'PUT';
  const url = id === 'new' ? '/customers' : `/customers/${id}`;
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(customer.value)
  });
  if (res.ok) router.push('/customers');
}
</script>

<style scoped>
.customer-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
}
.actions {
  margin-top: 1rem;
}
</style>

