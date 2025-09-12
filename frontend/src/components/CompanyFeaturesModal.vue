<template>
  <transition name="fade">
    <div v-if="open" class="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" @click.self="emit('close')">
      <div class="w-full max-w-3xl bg-[#0b1020] border border-white/10 rounded-xl p-4">
        <div class="flex items-center justify-between mb-2">
          <h2 class="text-lg font-semibold">Abilitazioni – {{ company?.name || 'Azienda' }}</h2>
          <button class="p-2 rounded-lg hover:bg-white/10" @click="emit('close')" aria-label="Chiudi">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5"><path d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div v-if="loading" class="text-slate-400 text-sm py-2">Caricamento…</div>
        <div v-else class="grid gap-3 max-h-[70vh] overflow-auto pr-1">
          <div v-for="section in tree" :key="section.key" class="border border-white/10 rounded-lg">
            <div class="flex items-center justify-between px-3 py-2 bg-white/5">
              <label class="flex items-center gap-2">
                <input type="checkbox" :checked="sectionAllEnabled(section.key)" @change="toggleSection(section.key, $event)" />
                <span class="font-medium">{{ section.label }}</span>
              </label>
              <div class="text-xs text-slate-400">{{ enabledCount(section.key) }}/{{ section.children.length }} abilitati</div>
            </div>
            <div class="px-3 py-2 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              <label v-for="leaf in section.children" :key="leaf.key" class="flex items-center gap-2 py-1">
                <input type="checkbox" :checked="isEnabled(section.key, leaf.key)" @change="toggleLeaf(section.key, leaf.key, $event)" />
                <span>{{ leaf.label }}</span>
              </label>
            </div>
          </div>
        </div>

        <div class="flex justify-end items-center gap-2 pt-3">
          <button class="px-3 py-2 rounded-lg text-sm bg-white/5 hover:bg-white/10" @click="emit('close')">Chiudi</button>
          <button class="px-3 py-2 rounded-lg text-sm bg-fuchsia-600 hover:bg-fuchsia-500 text-white" :disabled="saving" @click="save">Salva</button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import api from '../services/api';
import { FEATURES_TREE as tree, FeaturesMap, mergeWithDefaults } from '../config/features';

const props = defineProps<{ open: boolean; company: { id: number; name: string } | null }>();
const emit = defineEmits<{ (e: 'close'): void; (e: 'saved'): void }>();

const loading = ref(false);
const saving = ref(false);
const features = ref<FeaturesMap | null>(null);

async function load() {
  if (!props.company) return;
  loading.value = true;
  try {
    const { data } = await api.get(`/auth/companies/${props.company.id}/features`);
    features.value = mergeWithDefaults(data || {});
  } catch {
    features.value = mergeWithDefaults({});
  } finally {
    loading.value = false;
  }
}

watch(() => props.open, (o) => { if (o) load(); });

function isEnabled(section: string, leaf: string) {
  return !!features.value?.[section]?.[leaf];
}
function sectionAllEnabled(section: string) {
  const s = features.value?.[section] || {};
  const total = tree.find(t => t.key === section)?.children.length || 0;
  const enabled = Object.values(s).filter(Boolean).length;
  return enabled === total && total > 0;
}
function enabledCount(section: string) {
  const s = features.value?.[section] || {};
  return Object.values(s).filter(Boolean).length;
}
function toggleLeaf(section: string, leaf: string, ev: Event) {
  const checked = (ev.target as HTMLInputElement).checked;
  features.value = features.value || {} as FeaturesMap;
  features.value[section] = features.value[section] || {};
  features.value[section][leaf] = !!checked;
}
function toggleSection(section: string, ev: Event) {
  const checked = (ev.target as HTMLInputElement).checked;
  const sec = tree.find(t => t.key === section);
  if (!sec) return;
  features.value = features.value || {} as FeaturesMap;
  features.value[section] = features.value[section] || {};
  for (const leaf of sec.children) features.value[section][leaf.key] = !!checked;
}

async function save() {
  if (!props.company || !features.value) return;
  saving.value = true;
  try {
    await api.put(`/auth/companies/${props.company.id}/features`, { features: features.value });
    emit('saved');
    emit('close');
  } catch {}
  finally { saving.value = false; }
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity .2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>

