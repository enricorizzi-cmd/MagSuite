<template>
  <div class="items-page">
    <h1>Items</h1>
    <button @click="newItem">New Item</button>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

function newItem() {
  router.push('/items/new');
}
</script>

<style scoped>
.items-page {
  padding: 1rem;
}
</style>
