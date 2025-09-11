<template>
  <div class="min-h-screen flex items-center justify-center px-4 py-8">
    <div class="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Welcome / Branding -->
      <div class="hidden md:flex flex-col justify-center p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-xl">
        <div class="flex items-center gap-3 mb-6">
          <span class="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-fuchsia-500 to-cyan-400 text-white text-2xl font-black shadow-[0_0_20px_rgba(236,72,153,0.6)]">M</span>
          <h1 class="text-2xl font-bold tracking-tight">MagSuite</h1>
        </div>
        <p class="text-slate-300 leading-relaxed">
          Benvenuto! Interfaccia minimale, prestazioni top, stile gaming. Crea subito la tua azienda e il tuo utente oppure accedi per continuare.
        </p>
        <div class="mt-6 grid grid-cols-2 gap-3 text-sm text-slate-300">
          <div class="flex items-center gap-2"><span class="h-2 w-2 rounded-full bg-emerald-400"></span>PWA ready</div>
          <div class="flex items-center gap-2"><span class="h-2 w-2 rounded-full bg-pink-400"></span>Mobile first</div>
          <div class="flex items-center gap-2"><span class="h-2 w-2 rounded-full bg-cyan-400"></span>Token Auth</div>
          <div class="flex items-center gap-2"><span class="h-2 w-2 rounded-full bg-violet-400"></span>UX snella</div>
        </div>
      </div>

      <!-- Forms Card -->
      <div class="p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-2xl">
        <div class="flex mb-6 rounded-xl p-1 bg-white/5 border border-white/10">
          <button :class="tab==='login' ? activeTabClass : tabClass" @click="tab='login'">Accedi</button>
          <button :class="tab==='register' ? activeTabClass : tabClass" @click="tab='register'">Registrati</button>
        </div>

        <form v-if="tab==='login'" class="space-y-4" @submit.prevent="login">
          <div>
            <label class="block text-sm mb-1">Email</label>
            <input v-model="email" type="email" required
                   class="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/60 focus:border-fuchsia-400/60"
                   placeholder="you@company.com" />
          </div>
          <div>
            <label class="block text-sm mb-1">Password</label>
            <input v-model="password" type="password" required
                   class="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/60 focus:border-fuchsia-400/60"
                   placeholder="••••••••" />
          </div>
          
          <div class="flex items-center justify-between text-sm">
            <label class="inline-flex items-center gap-2 select-none">
              <input type="checkbox" v-model="remember" class="h-4 w-4 rounded border-white/20 bg-white/10" />
              <span class="text-slate-300">Rimani connesso</span>
            </label>
          </div>
          <button class="btn-arcade w-full" type="submit" :disabled="loading">Entra</button>
          <p class="text-sm text-rose-400" v-if="error">{{ error }}</p>
        </form>

        <form v-else class="space-y-4" @submit.prevent="register">
          <div>
            <label class="block text-sm mb-1">Nome Azienda</label>
            <input v-model="companyName" required
                   class="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/60 focus:border-fuchsia-400/60"
                   placeholder="La Mia Azienda Srl" />
            <div class="mt-2 flex gap-4 text-sm text-slate-300">
              <label class="inline-flex items-center gap-2">
                <input type="radio" value="existing" v-model="companyMode" class="h-4 w-4" />
                <span>Azienda esistente</span>
              </label>
              <label class="inline-flex items-center gap-2">
                <input type="radio" value="new" v-model="companyMode" class="h-4 w-4" />
                <span>Crea nuova azienda</span>
              </label>
            </div>
            <p v-if="companyMode==='existing' && companyName && companyChecked && !companyExists" class="text-xs text-amber-400 mt-1">
              Attenzione: azienda non esistente. Controlla il nome o seleziona "Crea nuova azienda".
            </p>
          </div>
          <div>
            <label class="block text-sm mb-1">Email</label>
            <input v-model="email" type="email" required
                   class="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/60 focus:border-fuchsia-400/60"
                   placeholder="admin@azienda.it" />
          </div>
          <div>
            <label class="block text-sm mb-1">Password</label>
            <input v-model="password" type="password" required
                   class="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/60 focus:border-fuchsia-400/60"
                   placeholder="Almeno 8 caratteri, simboli, numeri" />
            <p class="text-xs text-slate-400 mt-1">Maiuscole, minuscole, numero e simbolo.</p>
          </div>
          <button class="btn-arcade w-full" type="submit" :disabled="loading || (companyMode==='existing' && companyName && companyChecked && !companyExists)">
            {{ companyMode==='new' ? 'Crea azienda e account' : 'Crea account' }}
          </button>
          <p class="text-sm text-rose-400" v-if="error">{{ error }}</p>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watchEffect } from 'vue';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();
const tab = ref<'login' | 'register'>('login');

const email = ref('');
const password = ref('');

const companyName = ref('');
const loading = ref(false);
const error = ref('');
const remember = ref(true);
const companyMode = ref<'existing' | 'new'>('existing');
const companyExists = ref<boolean>(false);
const companyChecked = ref<boolean>(false);

const tabClass =
  'flex-1 text-center py-2 rounded-lg text-slate-300 hover:text-white transition';
const activeTabClass =
  'flex-1 text-center py-2 rounded-lg bg-gradient-to-r from-fuchsia-600 to-cyan-500 text-white shadow-[0_0_20px_rgba(236,72,153,0.5)]';

async function login() {
  loading.value = true;
  error.value = '';
  try {
    const { default: api } = await import('../../services/api');
    const { data } = await api.post('/auth/login', { email: email.value, password: password.value, remember: remember.value });
    if (!data?.accessToken) throw new Error('Credenziali non valide');
    if (remember.value) {
      localStorage.setItem('token', data.accessToken);
    } else {
      sessionStorage.setItem('token', data.accessToken);
      localStorage.removeItem('token');
    }
    const redirect = (route.query.redirect as string) || '/dashboard';
    router.push(redirect);
  } catch (e: any) {
    error.value = e?.response?.data?.error || e?.message || 'Errore di login';
  } finally {
    loading.value = false;
  }
}

async function register() {
  loading.value = true;
  error.value = '';
  try {
    const { default: api } = await import('../../services/api');
    const res = await api.post('/auth/register', {
      email: email.value,
      password: password.value,
      company_name: companyName.value,
      company_mode: companyMode.value
    });
    if (res.status !== 201) throw new Error('Registrazione non riuscita');
    const loginRes = await api.post('/auth/login', { email: email.value, password: password.value });
    const token = loginRes.data?.accessToken;
    if (!token) throw new Error('Login non riuscito');
    localStorage.setItem('token', token);
    router.push('/dashboard');
  } catch (e: any) {
    error.value = e?.response?.data?.error || e?.message || 'Errore di registrazione';
  } finally {
    loading.value = false;
  }
}

// Validate company existence in 'existing' mode
watchEffect(async () => {
  const name = companyName.value.trim();
  companyChecked.value = false;
  if (!name || companyMode.value !== 'existing') return;
  try {
    const { default: api } = await import('../../services/api');
    const { data } = await api.get('/auth/company-exists', { params: { name } });
    companyExists.value = !!data?.exists;
  } catch {
    companyExists.value = false;
  } finally {
    companyChecked.value = true;
  }
});
</script>

<style scoped>
.btn-arcade {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border-radius: 0.75rem;
  padding: 0.5rem 1rem;
  font-weight: 600;
  color: #fff;
  transition: filter .2s ease;
  background: linear-gradient(135deg, #ec4899 0%, #06b6d4 100%);
  box-shadow: 0 0 20px rgba(236, 72, 153, 0.4), 0 0 30px rgba(6, 182, 212, 0.25);
}
.btn-arcade:hover {
  filter: brightness(1.08);
}
</style>
