import { ref } from 'vue';
import api from './api';

export const unreadCount = ref(0);
export const items = ref<Array<{ title: string; body?: string; time?: string; type?: string; user_id?: number; url?: string }>>([]);

let es: EventSource | null = null;

export function canRequestNotificationPermission(): boolean {
  return typeof Notification !== 'undefined' && Notification.permission === 'default';
}

export async function requestNotificationPermission(): Promise<'granted'|'denied'|'default'|'unsupported'> {
  if (typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission as any;
  try {
    const res = await Notification.requestPermission();
    return res as any;
  } catch {
    return 'denied';
  }
}

function maybeShowOsNotification(data: { title?: string; body?: string; url?: string }) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const title = data.title || 'Nuova notifica';
  const options: NotificationOptions = {
    body: data.body,
    icon: '/icons/icons-192.png',
    badge: '/icons/icons-192.png',
    data: { url: data.url || '/' }
  };
  try {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg && 'showNotification' in reg) reg.showNotification(title, options);
        else new Notification(title, options);
      });
    } else {
      new Notification(title, options);
    }
  } catch {}
}

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
      if (data && data.type === 'user_approval_resolved' && data.user_id) {
        // remove associated pending notifications
        items.value = items.value.filter(n => !(n.type === 'user_approval_pending' && n.user_id === data.user_id));
        return;
      }
      items.value.unshift(data);
      unreadCount.value += 1;
      // Try to surface OS-level notification if allowed
      maybeShowOsNotification(data);
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
