import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import Dashboard from './pages/dashboard/Dashboard.vue';
import Items from './pages/items/Items.vue';
import ItemDetail from './pages/items/ItemDetail.vue';
import Warehouses from './pages/warehouses/Warehouses.vue';
import WarehouseStock from './pages/warehouses/WarehouseStock.vue';
import TransferList from './pages/transfers/TransferList.vue';
import TransferForm from './pages/transfers/TransferForm.vue';
import MovementList from './components/MovementList.vue';
import MovementForm from './components/MovementForm.vue';
import Inventories from './pages/inventories/Inventories.vue';
import InventoryWizard from './components/InventoryWizard.vue';
import Documents from './pages/documents/Documents.vue';
import Mrp from './pages/mrp/Mrp.vue';
import PurchaseOrderList from './pages/purchase-orders/PurchaseOrderList.vue';
import PurchaseOrderForm from './pages/purchase-orders/PurchaseOrderForm.vue';
import SupplierList from './pages/suppliers/SupplierList.vue';
import SupplierForm from './pages/suppliers/SupplierForm.vue';
import CustomerList from './pages/customers/CustomerList.vue';
import CustomerForm from './pages/customers/CustomerForm.vue';
import LabelGenerator from './pages/labels/LabelGenerator.vue';
import ReportList from './pages/reports/ReportList.vue';
import ReportView from './pages/reports/ReportView.vue';
import Settings from './pages/settings/Settings.vue';
import SystemStatus from './pages/system/SystemStatus.vue';
import ImportLogList from './pages/system/ImportLogList.vue';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/dashboard',
    name: 'dashboard',
    component: Dashboard
  },
  {
    path: '/items',
    name: 'items',
    component: Items
  },
  {
    path: '/items/:id',
    name: 'item-detail',
    component: ItemDetail,
    props: true
  },
  {
    path: '/warehouses',
    name: 'warehouses',
    component: Warehouses
  },
  {
    path: '/warehouses/:id/stock',
    name: 'warehouse-stock',
    component: WarehouseStock,
    props: true
  },
  {
    path: '/transfers',
    name: 'transfers',
    component: TransferList
  },
  {
    path: '/transfers/:id',
    name: 'transfer-form',
    component: TransferForm,
    props: true
  },
  {
    path: '/movements/:type',
    name: 'movements',
    component: MovementList,
    props: true
  },
  {
    path: '/movements/:type/:id',
    name: 'movement-form',
    component: MovementForm,
    props: true
  },
  {
    path: '/inventories',
    name: 'inventories',
    component: Inventories
  },
  {
    path: '/inventories/:id',
    name: 'inventory-wizard',
    component: InventoryWizard,
    props: true
  },
  {
    path: '/mrp',
    name: 'mrp',
    component: Mrp
  },
  {
    path: '/documents',
    name: 'documents',
    component: Documents
  },
  {
    path: '/purchase-orders',
    name: 'purchase-orders',
    component: PurchaseOrderList
  },
  {
    path: '/purchase-orders/:id',
    name: 'purchase-order-form',
    component: PurchaseOrderForm,
    props: true
  },
  {
    path: '/suppliers',
    name: 'suppliers',
    component: SupplierList
  },
  {
    path: '/suppliers/:id',
    name: 'supplier-form',
    component: SupplierForm,
    props: true
  },
  {
    path: '/customers',
    name: 'customers',
    component: CustomerList
  },
  {
    path: '/customers/:id',
    name: 'customer-form',
    component: CustomerForm,
    props: true
  },
  {
    path: '/reports',
    name: 'reports',
    component: ReportList
  },
  {
    path: '/reports/:type',
    name: 'report-view',
    component: ReportView,
    props: true
  },
  {
    path: '/labels',
    name: 'labels',
    component: LabelGenerator
  },
  {
    path: '/settings',
    name: 'settings',
    component: Settings
  },
  {
    path: '/system/status',
    name: 'system-status',
    component: SystemStatus
  },
  {
    path: '/system/imports',
    name: 'system-imports',
    component: ImportLogList
  },
  {
    path: '/system/imports/:id',
    name: 'import-log',
    component: ImportLogList,
    props: true
  }
];

export default createRouter({
  history: createWebHistory(),
  routes
});
