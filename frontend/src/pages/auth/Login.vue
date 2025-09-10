<template>
  <div class="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4">
    <div class="card w-full max-w-md p-6">
      <div class="flex items-center gap-2 mb-4">
        <span class="inline-flex h-9 w-9 items-center justify-center rounded bg-brand text-white font-semibold">M</span>
        <h1 class="text-xl font-semibold">Accedi</h1>
      </div>
      <form class="space-y-3" @submit.prevent="login">
        <div>
          <label class="block text-sm mb-1">Email</label>
          <input v-model="email" type="email" required class="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" />
        </div>
        <div>
          <label class="block text-sm mb-1">Password</label>
          <input v-model="password" type="password" required class="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" />
        </div>
        <div>
          <label class="block text-sm mb-1">MFA Token (se richiesto)</label>
          <input v-model="mfaToken" class="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" />
        </div>
        <button class="btn-primary w-full" type="submit" :disabled="loading">Login</button>
        <p class="text-sm">Non hai un account? <router-link class="link" to="/register">Registrati</router-link></p>
        <p class="text-sm text-red-600" v-if="error">{{ error }}</p>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const email = ref('');
const password = ref('');
const mfaToken = ref('');
const loading = ref(false);
const error = ref('');

async function login() {
  loading.value = true;
  error.value = '';
  try {
    const res = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value, password: password.value, mfaToken: mfaToken.value || undefined })
    });
    if (!res.ok) {
      throw new Error('Credenziali non valide');
    }
    const data = await res.json();
    if (!data.accessToken) throw new Error('Risposta non valida');
    localStorage.setItem('token', data.accessToken);
    router.push('/dashboard');
  } catch (e: any) {
    error.value = e?.message || 'Errore di login';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped></style>
