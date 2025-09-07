<template>
  <div class="settings">
    <nav class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        :class="{ active: tab.key === current }"
        @click="current = tab.key"
      >
        {{ tab.label }}
      </button>
    </nav>
    <component :is="currentComponent" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import SettingsGeneral from './SettingsGeneral.vue';
import SettingsBarcode from './SettingsBarcode.vue';
import SettingsMrp from './SettingsMrp.vue';
import SettingsClassifiers from './SettingsClassifiers.vue';
import SettingsNotifications from './SettingsNotifications.vue';
import SettingsUsers from './SettingsUsers.vue';

const tabs = [
  { key: 'general', label: 'Generali', component: SettingsGeneral },
  { key: 'barcode', label: 'Barcode', component: SettingsBarcode },
  { key: 'mrp', label: 'MRP', component: SettingsMrp },
  { key: 'classifiers', label: 'Classificatori', component: SettingsClassifiers },
  { key: 'notifications', label: 'Notifiche', component: SettingsNotifications },
  { key: 'users', label: 'Utenti & Permessi', component: SettingsUsers }
];

const current = ref('general');
const currentComponent = computed(() => {
  const tab = tabs.find(t => t.key === current.value);
  return tab ? tab.component : null;
});
</script>

<style scoped>
.tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
.tabs button.active {
  font-weight: bold;
}
</style>
