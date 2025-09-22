<template>
  <section class="space-y-6">
    <header>
      <h2 class="text-xl font-semibold text-slate-100">Impostazioni Business Planning</h2>
      <p class="text-sm text-slate-400">Indicatori, pesi, destinatari report e configurazione push.</p>
    </header>

    <div v-if="settings.loading" class="rounded-lg border border-white/10 bg-slate-900/60 p-6 text-center text-sm text-slate-300">
      Caricamento impostazioni...
    </div>
    <div v-else-if="settings.error" class="rounded-lg border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">{{ settings.error }}</div>
    <div v-else class="grid gap-6 lg:grid-cols-2">
      <form class="space-y-5 rounded-2xl border border-white/10 bg-slate-900/60 p-5" @submit.prevent="save">
        <div>
          <label class="block space-y-1 text-sm text-slate-300">
            <span class="font-medium">Indicatori monitorati</span>
            <textarea v-model="form.indicators" rows="3" class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100" placeholder="VSS, Telefonate, AppFatti"></textarea>
            <span class="text-xs text-slate-500">Elenco separato da virgola, utilizzato per dashboard e KPI.</span>
          </label>
        </div>

        <div>
          <label class="block space-y-1 text-sm text-slate-300">
            <span class="font-medium">Pesi leaderboard (JSON)</span>
            <textarea v-model="form.weights" rows="4" class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-100" placeholder='{"VSS": 1.2, "Telefonate": 0.4}'></textarea>
            <span class="text-xs text-slate-500">Chiave = indicatore, valore = peso numerico.</span>
          </label>
        </div>

        <div class="grid gap-3 md:grid-cols-3">
          <label class="space-y-1 text-sm text-slate-300">
            <span class="font-medium">Provv. GI</span>
            <input v-model.number="form.commissions.gi" type="number" step="0.01" class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100" />
          </label>
          <label class="space-y-1 text-sm text-slate-300">
            <span class="font-medium">Provv. VSD Junior</span>
            <input v-model.number="form.commissions.vsdJunior" type="number" step="0.01" class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100" />
          </label>
          <label class="space-y-1 text-sm text-slate-300">
            <span class="font-medium">Provv. VSD Senior</span>
            <input v-model.number="form.commissions.vsdSenior" type="number" step="0.01" class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100" />
          </label>
        </div>

        <div class="grid gap-3 md:grid-cols-3">
          <label class="space-y-1 text-sm text-slate-300">
            <span class="font-medium">Report TO</span>
            <textarea v-model="form.recipients.to" rows="3" class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-100" placeholder="nome@azienda.it"></textarea>
          </label>
          <label class="space-y-1 text-sm text-slate-300">
            <span class="font-medium">Report CC</span>
            <textarea v-model="form.recipients.cc" rows="3" class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-100"></textarea>
          </label>
          <label class="space-y-1 text-sm text-slate-300">
            <span class="font-medium">Report BCC</span>
            <textarea v-model="form.recipients.bcc" rows="3" class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-100"></textarea>
          </label>
        </div>

        <div v-if="form.error" class="rounded border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{{ form.error }}</div>

        <div class="flex justify-end gap-2">
          <button
            type="submit"
            class="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-900 shadow hover:bg-cyan-400 disabled:opacity-60"
            :disabled="settings.saving"
          >{{ settings.saving ? 'Salvataggio...' : 'Salva impostazioni' }}</button>
        </div>
      </form>

      <div class="space-y-4 rounded-2xl border border-white/10 bg-slate-900/60 p-5 text-sm text-slate-200">
        <h3 class="text-base font-semibold text-slate-100">Push & ambiente</h3>
        <div>
          <p class="text-xs uppercase tracking-wide text-slate-400">VAPID public key</p>
          <div class="mt-1 rounded border border-white/10 bg-black/30 px-3 py-2 text-xs text-slate-300 break-all">
            {{ settings.vapidPublicKey || 'Non configurata' }}
          </div>
        </div>
        <div>
          <p class="text-xs uppercase tracking-wide text-slate-400">Ultimo aggiornamento</p>
          <p class="mt-1 text-sm text-slate-200">{{ settings.data?.updatedAt ? formatDate(settings.data.updatedAt) : 'Mai' }}</p>
        </div>
        <div class="rounded border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
          Ricorda di configurare le variabili d'ambiente <code>VAPID_PUBLIC_KEY</code>, <code>VAPID_PRIVATE_KEY</code> e <code>VAPID_SUBJECT</code> sul backend per abilitare le notifiche push.
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, watch } from 'vue';
import { useBpStore } from '../../../stores/bp';

const store = useBpStore();
const settings = store.settings;

const form = reactive({
  indicators: '',
  weights: '',
  commissions: { gi: 0, vsdJunior: 0, vsdSenior: 0 },
  recipients: { to: '', cc: '', bcc: '' },
  error: ''
});

watch(() => settings.data, (value) => {
  if (!value) return;
  form.indicators = value.indicators.join(', ');
  form.weights = JSON.stringify(value.weights || {}, null, 2);
  form.commissions = {
    gi: Number(value.commissions?.gi ?? 0),
    vsdJunior: Number(value.commissions?.vsdJunior ?? value.commissions?.vsd_junior ?? 0),
    vsdSenior: Number(value.commissions?.vsdSenior ?? value.commissions?.vsd_senior ?? 0)
  };
  form.recipients = {
    to: (settings.recipients.to || []).join('\n'),
    cc: (settings.recipients.cc || []).join('\n'),
    bcc: (settings.recipients.bcc || []).join('\n')
  };
}, { immediate: true });

onMounted(() => {
  store.loadSettings().catch(() => undefined);
});

function parseWeights(raw: string) {
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

function parseList(raw: string) {
  return raw
    .split(/[,\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

async function save() {
  form.error = '';
  try {
    const indicators = form.indicators
      .split(',')
      .map((indicator) => indicator.trim())
      .filter(Boolean);
    const weights = parseWeights(form.weights);
    const commissions = {
      gi: Number(form.commissions.gi) || 0,
      vsdJunior: Number(form.commissions.vsdJunior) || 0,
      vsdSenior: Number(form.commissions.vsdSenior) || 0
    };
    const recipients = {
      to: parseList(form.recipients.to),
      cc: parseList(form.recipients.cc),
      bcc: parseList(form.recipients.bcc)
    };
    await store.saveSettings({ indicators, weights, commissions }, recipients);
  } catch (error: any) {
    form.error = error?.message || 'Errore salvataggio impostazioni';
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}
</script>
