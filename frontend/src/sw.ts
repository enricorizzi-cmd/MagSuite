/* eslint-disable no-restricted-globals */
/// <reference lib="WebWorker" />

import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst, NetworkFirst } from 'workbox-strategies';

declare let self: ServiceWorkerGlobalScope & { __WB_MANIFEST: any };

// Immediately activate updated SW
self.skipWaiting();
clientsClaim();

// Precache assets injected at build time
precacheAndRoute(self.__WB_MANIFEST || []);

// Cache strategies for different types of content
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      {
        cacheKeyWillBeUsed: async ({ request }) => {
          return `${request.url}?v=1`;
        }
      }
    ]
  })
);

registerRoute(
  ({ request }) => request.destination === 'script' || request.destination === 'style',
  new StaleWhileRevalidate({
    cacheName: 'static-resources'
  })
);

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 3,
    plugins: [
      {
        cacheKeyWillBeUsed: async ({ request }) => {
          const url = new URL(request.url);
          return `${url.pathname}?${url.search}`;
        }
      }
    ]
  })
);

// SPA navigation fallback to index.html
const handler = createHandlerBoundToURL('index.html');
const navigationRoute = new NavigationRoute(handler);
registerRoute(navigationRoute);

// Background sync for offline actions
self.addEventListener('sync', (event: SyncEvent) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Handle offline actions when connection is restored
  console.log('Background sync triggered');
}

// Notification click: focus existing window or open URL
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  const url = (event.notification.data && (event.notification.data as any).url) || '/';
  event.notification.close();
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      let appClient: WindowClient | null = null;
      for (const client of allClients) {
        if ('focus' in client) {
          appClient = client as WindowClient;
          break;
        }
      }
      if (appClient) {
        await appClient.focus();
        try {
          // Attempt to navigate existing client
          (appClient as any).navigate && (appClient as any).navigate(url);
        } catch {}
        return;
      }
      await self.clients.openWindow(url);
    })()
  );
});

// Push event handling
self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icons/icons-192.png',
    badge: '/icons/icons-192.png',
    tag: data.tag || 'magsuite-notification',
    data: data.data || {}
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'MagSuite', options)
  );
});
