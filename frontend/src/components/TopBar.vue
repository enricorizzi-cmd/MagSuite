<template>
  <nav class="topbar">
    <router-link to="/dashboard">Dashboard</router-link>
    <router-link to="/items">Items</router-link>
    <router-link to="/warehouses">Warehouses</router-link>
    <router-link to="/inventories">Inventories</router-link>
    <router-link to="/reports">Reports</router-link>
    <router-link to="/settings">Settings</router-link>
  </nav>
</template>

<script setup lang="ts"></script>

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
</style>
