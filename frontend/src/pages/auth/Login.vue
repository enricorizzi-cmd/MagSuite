<template>
  <div class="login">
    <h1>Accedi</h1>
    <form @submit.prevent="login">
      <label>
        Email
        <input v-model="email" type="email" required />
      </label>
      <label>
        Password
        <input v-model="password" type="password" required />
      </label>
      <label>
        MFA Token (se richiesto)
        <input v-model="mfaToken" />
      </label>
      <button type="submit" :disabled="loading">Login</button>
      <p class="error" v-if="error">{{ error }}</p>
    </form>
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

<style scoped>
.login { max-width: 360px; margin: 2rem auto; display: flex; flex-direction: column; gap: .75rem; }
form { display: flex; flex-direction: column; gap: .5rem; }
label { display: flex; flex-direction: column; gap: .25rem; }
.error { color: #b00020; }
</style>

