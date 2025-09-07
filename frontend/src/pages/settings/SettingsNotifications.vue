<template>
  <div class="settings-notifications">
    <label>
      Email From
      <input v-model="notifications.emailFrom" />
    </label>
    <div class="actions">
      <button @click="save">Save</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const notifications = ref<{ emailFrom: string }>({ emailFrom: '' });

onMounted(async () => {
  try {
    const res = await fetch('/settings');
    if (res.ok) {
      const data = await res.json();
      notifications.value = data.notifications || { emailFrom: '' };
    }
  } catch (err) {
    console.error('Failed to load settings', err);
  }
});

async function save() {
  try {
    await fetch('/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notifications: notifications.value })
    });
  } catch (err) {
    console.error('Failed to save settings', err);
  }
}
</script>

<style scoped>
.settings-notifications {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.actions {
  margin-top: 1rem;
}
</style>
