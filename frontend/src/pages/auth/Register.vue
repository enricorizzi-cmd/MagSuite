<template>
  <div class="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4">
    <div class="card w-full max-w-md p-6">
      <div class="flex items-center gap-2 mb-4">
        <span class="inline-flex h-9 w-9 items-center justify-center rounded bg-brand text-white font-semibold">M</span>
        <h1 class="text-xl font-semibold">Registrazione</h1>
      </div>
      <form class="space-y-3" @submit.prevent="register">
        <div>
          <label class="block text-sm mb-1">Azienda</label>
          <input v-model="companyName" required class="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" />
        </div>
        <div>
          <label class="block text-sm mb-1">Email</label>
          <input v-model="email" type="email" required class="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" />
        </div>
        <div>
          <label class="block text-sm mb-1">Password</label>
          <input v-model="password" type="password" required class="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" />
          <p class="text-xs text-slate-500 mt-1">Minimo 8 caratteri, maiuscole, minuscole, numero e simbolo.</p>
        </div>
        <button class="btn-primary w-full" type="submit" :disabled="loading">Crea account</button>
        <p class="text-sm text-red-600" v-if="error">{{ error }}</p>
        <p class="text-sm">Hai già un account? <router-link class="link" to="/login">Accedi</router-link></p>
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
const companyName = ref('');
const loading = ref(false);
const error = ref('');

async function register() {
  loading.value = true;
  error.value = '';
  try {
    const { default: api } = await import('../../services/api');
    // Create company + admin user
    const res = await api.post('/auth/register', {
      email: email.value,
      password: password.value,
      company_name: companyName.value,
      role: 'admin'
    });
    if (res.status !== 201) throw new Error('Registrazione non riuscita');
    // Auto-login
    const login = await api.post('/auth/login', { email: email.value, password: password.value });
    const token = login.data?.accessToken;
    if (!token) throw new Error('Login non riuscito');
    localStorage.setItem('token', token);
    router.push('/dashboard');
  } catch (e: any) {
    error.value = e?.response?.data?.error || e?.message || 'Errore di registrazione';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped></style>

