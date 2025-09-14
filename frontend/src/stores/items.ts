import { defineStore } from 'pinia';
import api from '../services/api';

export const useItemStore = defineStore('items', {
  state: () => ({
    items: [] as any[],
    lastFetch: null as Date | null,
    loading: false,
    error: null as string | null
  }),
  
  getters: {
    isStale: (state) => {
      if (!state.lastFetch) return true;
      return Date.now() - state.lastFetch.getTime() > 300000; // 5 minutes
    },
    
    getItemById: (state) => (id: number) => {
      return state.items.find(item => item.id === id);
    }
  },
  
  actions: {
    async fetchItems(force = false) {
      // Skip if data is fresh and not forced
      if (!force && !this.isStale && this.items.length > 0) {
        return this.items;
      }
      
      this.loading = true;
      this.error = null;
      
      try {
        const response = await api.get('/items');
        this.items = response.data.items || response.data;
        this.lastFetch = new Date();
        return this.items;
      } catch (error: any) {
        this.error = error.message || 'Failed to fetch items';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    async createItem(itemData: any) {
      try {
        const response = await api.post('/items', itemData);
        this.items.push(response.data);
        this.lastFetch = new Date(); // Invalidate cache
        return response.data;
      } catch (error: any) {
        this.error = error.message || 'Failed to create item';
        throw error;
      }
    },
    
    async updateItem(id: number, itemData: any) {
      try {
        const response = await api.put(`/items/${id}`, itemData);
        const index = this.items.findIndex(item => item.id === id);
        if (index !== -1) {
          this.items[index] = response.data;
        }
        return response.data;
      } catch (error: any) {
        this.error = error.message || 'Failed to update item';
        throw error;
      }
    },
    
    async deleteItem(id: number) {
      try {
        await api.delete(`/items/${id}`);
        this.items = this.items.filter(item => item.id !== id);
        return true;
      } catch (error: any) {
        this.error = error.message || 'Failed to delete item';
        throw error;
      }
    },
    
    clearCache() {
      this.items = [];
      this.lastFetch = null;
      this.error = null;
    }
  }
});
