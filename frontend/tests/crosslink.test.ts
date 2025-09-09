import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';

let mockRoute: any;
let mockRouter: any;

vi.mock('vue-router', () => ({
  useRoute: () => mockRoute,
  useRouter: () => mockRouter
}));

import ItemDetail from '../src/pages/items/ItemDetail.vue';
import WarehouseStock from '../src/pages/warehouses/WarehouseStock.vue';

describe('cross-link navigation', () => {
  beforeEach(() => {
    mockRoute = { params: {}, query: {} };
    mockRouter = { push: vi.fn() };
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ stock: [] }) })
    ) as any;
  });

  it('goes to warehouse stock with sku filter', () => {
    mockRoute.params = { id: 'item1' };
    const wrapper = mount(ItemDetail);
    wrapper.vm.item.sku = 'SKU1';
    wrapper.vm.goToLotti('WH1');
    expect(mockRouter.push).toHaveBeenCalledWith({
      name: 'warehouse-stock',
      params: { id: 'WH1' },
      query: { sku: 'SKU1' }
    });
  });

  it('syncs sku from route and links to item detail', () => {
    mockRoute = { params: { id: 'WH1' }, query: { sku: 'SKU2' } };
    mockRouter = { push: vi.fn() };
    (global.fetch as any) = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ stock: [] }) })
    );
    const wrapper = mount(WarehouseStock);
    expect(wrapper.vm.filters.sku).toBe('SKU2');
    wrapper.vm.goToItem('SKU2');
    expect(mockRouter.push).toHaveBeenCalledWith({
      name: 'item-detail',
      params: { id: 'SKU2' },
      query: { warehouse: 'WH1' }
    });
  });
});
