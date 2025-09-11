<template>
  <div class="min-h-screen bg-gradient-to-br from-[#0a0f1d] via-[#111827] to-[#1f2937] text-slate-100">
    <router-view />
  </div>
  <div class="pointer-events-none fixed inset-0 opacity-30 mix-blend-screen select-none">
    <div class="absolute -top-20 -left-20 h-80 w-80 rounded-full blur-3xl bg-fuchsia-600"></div>
    <div class="absolute bottom-0 right-0 h-80 w-80 rounded-full blur-3xl bg-cyan-500"></div>
  </div>
  
</template>

<script setup lang="ts">
// Root application component (minimal)
</script>

<style>
body {
  margin: 0;
}
</style>
