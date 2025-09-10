<template>
  <nav class="topbar">
    <router-link to="/dashboard">Dashboard</router-link>
    <router-link to="/items">Items</router-link>
    <router-link to="/warehouses">Warehouses</router-link>
    <router-link to="/inventories">Inventories</router-link>
    <router-link to="/reports">Reports</router-link>
    <router-link to="/settings">Settings</router-link>
    <button class="logout" v-if="hasToken" @click="logout">Logout</button>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const hasToken = computed(() => !!localStorage.getItem('token'));
function logout() {
  localStorage.removeItem('token');
  router.push('/login');
}
</script>

<style scoped>
.topbar {
  display: flex;
  gap: 1rem;
  background: #333;
  padding: 1rem;
}

.topbar a {
  color: white;
  text-decoration: none;
}
.logout { margin-left: auto; background: #555; color: #fff; border: none; padding: .4rem .6rem; cursor: pointer; }
</style>
