import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import Dashboard from './pages/dashboard/Dashboard.vue';
import ItemList from './pages/items/ItemList.vue';
import ItemDetail from './pages/items/ItemDetail.vue';
import WarehouseStock from './pages/warehouses/WarehouseStock.vue';

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
  },
  {
    path: '/items/:id',
    name: 'item-detail',
    component: ItemDetail,
    props: true
  },
  {
    path: '/warehouses/:id/stock',
    name: 'warehouse-stock',
    component: WarehouseStock,
    props: true
  }
];

export default createRouter({
  history: createWebHistory(),
  routes
});
