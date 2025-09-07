<template>
  <div class="report-list">
    <h2>Reports</h2>
    <ul>
      <li v-for="type in reportTypes" :key="type">
        <router-link :to="`/reports/${type}`">{{ type }}</router-link>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
const reportTypes = ['inventory', 'sales'];
</script>

<style scoped>
.report-list {
  padding: 1rem;
}

ul {
  list-style: none;
  padding: 0;
}

li {
  margin-bottom: 0.5rem;
}
</style>
