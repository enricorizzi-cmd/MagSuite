import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import Dashboard from './pages/dashboard/Dashboard.vue';
import ItemList from './pages/items/ItemList.vue';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/dashboard',
    name: 'dashboard',
    component: Dashboard
  },
  {
    path: '/items',
    name: 'items',
    component: ItemList
  }
];

export default createRouter({
  history: createWebHistory(),
  routes
});
