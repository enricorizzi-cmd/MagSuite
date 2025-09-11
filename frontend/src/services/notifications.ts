import { ref } from 'vue';
import api from './api';

export const unreadCount = ref(0);
export const items = ref<Array<{ title: string; body?: string; time?: string }>>([]);

let es: EventSource | null = null;

export function connectNotifications() {
  if (es) return;
  // Build stream URL relative to API base
  const base = (api.defaults.baseURL as string) || '';
  const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
  const companyId = localStorage.getItem('companyId');
  const params = new URLSearchParams();
  if (token) params.set('access_token', token);
  if (companyId) params.set('company_id', companyId);
  const url = base.replace(/\/$/, '') + '/notifications/stream' + (params.toString() ? `?${params}` : '');
  es = new EventSource(url, { withCredentials: false });
  es.onmessage = (evt) => {
    try {
      const data = JSON.parse(evt.data);
      items.value.unshift(data);
      unreadCount.value += 1;
    } catch {}
  };
  es.onerror = () => {
    // Auto-reconnect by closing and resetting so connect can be called again later
    if (es) {
      es.close();
      es = null;
    }
    setTimeout(connectNotifications, 5000);
  };
}

export function markAllRead() {
  unreadCount.value = 0;
}
