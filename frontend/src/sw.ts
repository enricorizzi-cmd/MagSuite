/* eslint-disable no-restricted-globals */
/// <reference lib="WebWorker" />

import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

declare let self: ServiceWorkerGlobalScope & { __WB_MANIFEST: any };

// Immediately activate updated SW
self.skipWaiting();
clientsClaim();

// Precache assets injected at build time
precacheAndRoute(self.__WB_MANIFEST || []);

// SPA navigation fallback to index.html
const handler = createHandlerBoundToURL('index.html');
const navigationRoute = new NavigationRoute(handler);
registerRoute(navigationRoute);

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
