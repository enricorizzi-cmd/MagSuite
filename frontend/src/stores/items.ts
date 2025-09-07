import { defineStore } from 'pinia';
import api from '../services/api';

export const useItemStore = defineStore('items', {
  state: () => ({
    items: [] as any[]
  }),
  actions: {
    async fetchItems() {
      const response = await api.get('/items');
      this.items = response.data;
    }
  }
});
