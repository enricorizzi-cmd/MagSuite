<template>
  <div class="warehouses-page">
    <h1>Warehouses</h1>
    <button @click="newWarehouse">New Warehouse</button>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

function newWarehouse() {
  router.push('/warehouses/new');
}
</script>

<style scoped>
.warehouses-page {
  padding: 1rem;
}
</style>
