<template>
  <header class="bg-white/90 dark:bg-slate-900/80 backdrop-blur border-b border-slate-200/60 dark:border-slate-800">
    <div class="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
      <router-link to="/dashboard" class="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-100">
        <span class="inline-flex h-8 w-8 items-center justify-center rounded bg-brand text-white">M</span>
        MagSuite
      </router-link>
      <nav class="hidden md:flex items-center gap-4 ml-6 text-sm">
        <router-link class="link" to="/items">Items</router-link>
        <router-link class="link" to="/warehouses">Warehouses</router-link>
        <router-link class="link" to="/inventories">Inventories</router-link>
        <router-link class="link" to="/reports">Reports</router-link>
        <router-link class="link" to="/settings">Settings</router-link>
      </nav>
      <div class="ml-auto flex items-center gap-2">
        <button class="btn-secondary" @click="toggleDark">{{ isDark ? 'Light' : 'Dark' }}</button>
        <button class="btn-secondary" v-if="!hasToken" @click="$router.push('/login')">Login</button>
        <button class="btn-primary" v-else @click="logout">Logout</button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const hasToken = computed(() => !!localStorage.getItem('token'));
const isDark = computed(() => document.documentElement.classList.contains('dark'));
function toggleDark() {
  const el = document.documentElement;
  el.classList.toggle('dark');
  localStorage.setItem('theme', el.classList.contains('dark') ? 'dark' : 'light');
}
function logout() {
  localStorage.removeItem('token');
  router.push('/login');
}

// initialize theme
if (localStorage.getItem('theme') === 'dark') {
  document.documentElement.classList.add('dark');
}
</script>

<style scoped>
 .link { @apply text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white; }
</style>
