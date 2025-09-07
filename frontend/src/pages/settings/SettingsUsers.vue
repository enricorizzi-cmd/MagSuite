<template>
  <div class="settings-users">
    <section v-if="!editing">
      <button @click="newUser">New User</button>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Role</th>
            <th>Warehouse</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.id">
            <td>{{ u.name }}</td>
            <td>{{ u.role }}</td>
            <td>{{ warehouseName(u.warehouseId) }}</td>
            <td><button @click="editUser(u)">Edit</button></td>
          </tr>
        </tbody>
      </table>
    </section>

    <section v-else class="user-form">
      <label>
        Name
        <input v-model="form.name" />
      </label>
      <label>
        Role
        <select v-model="form.role">
          <option value="user">user</option>
          <option value="admin">admin</option>
        </select>
      </label>
      <label>
        Warehouse
        <select v-model="form.warehouseId">
          <option value="">-</option>
          <option v-for="w in warehouses" :key="w.id" :value="w.id">{{ w.name }}</option>
        </select>
      </label>
      <div class="actions">
        <button @click="saveUser">Save</button>
        <button @click="cancel">Cancel</button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

interface User {
  id?: number | string;
  name: string;
  role: string;
  warehouseId?: number | string | null;
}

interface Warehouse {
  id: number | string;
  name: string;
}

const users = ref<User[]>([]);
const warehouses = ref<Warehouse[]>([]);
const editing = ref(false);
const form = ref<User>({ name: '', role: 'user', warehouseId: '' });

function warehouseName(id: any) {
  const w = warehouses.value.find(w => w.id === id);
  return w ? w.name : '';
}

async function fetchUsers() {
  try {
    const res = await fetch('/users');
    if (res.ok) {
      const data = await res.json();
      users.value = data.users || data.items || [];
    }
  } catch (err) {
    console.error('Failed to load users', err);
  }
}

async function fetchWarehouses() {
  try {
    const res = await fetch('/warehouses');
    if (res.ok) {
      const data = await res.json();
      warehouses.value = data.warehouses || data.items || [];
    }
  } catch (err) {
    console.error('Failed to load warehouses', err);
  }
}

function newUser() {
  form.value = { name: '', role: 'user', warehouseId: '' };
  editing.value = true;
}

function editUser(u: User) {
  form.value = { ...u };
  editing.value = true;
}

function cancel() {
  editing.value = false;
}

async function saveUser() {
  const method = form.value.id ? 'PUT' : 'POST';
  const url = form.value.id ? `/users/${form.value.id}` : '/users';
  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.value)
    });
    if (res.ok) {
      editing.value = false;
      fetchUsers();
    }
  } catch (err) {
    console.error('Failed to save user', err);
  }
}

onMounted(() => {
  fetchUsers();
  fetchWarehouses();
});
</script>

<style scoped>
.settings-users {
  padding: 1rem 0;
}
.user-form,
.settings-users table {
  margin-top: 1rem;
}
.user-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.actions {
  margin-top: 1rem;
}
</style>
