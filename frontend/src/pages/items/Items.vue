<template>
  <div class="container-page">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-semibold">Articoli</h1>
      <button class="btn-primary" @click="newItem">Nuovo Articolo</button>
    </div>
    <ItemsTable />
  </div>
  
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import ItemsTable from '../../components/ItemsTable.vue';

const router = useRouter();

function newItem() {
  router.push('/items/new');
}
</script>

<style scoped></style>
