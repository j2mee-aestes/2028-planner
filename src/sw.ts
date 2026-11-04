/// <reference lib="webworker" />
// 서비스 워커: 오프라인 캐시 + 휴대폰 알림(푸시) 수신
import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: (string | { url: string; revision: string | null })[] };

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html'), { denylist: [/^\/__/] }));
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({ cacheName: 'fonts', plugins: [new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 31536000 })] }),
);

// FCM 메시지: { notification: {title, body}, data: {...} } 또는 { data: {title, body, url} }
self.addEventListener('push', (event) => {
  let p: any = {};
  try { p = event.data?.json() ?? {}; } catch { p = { data: { body: event.data?.text() } }; }
  const n = p.notification ?? {};
  const d = p.data ?? {};
  const title = n.title ?? d.title ?? '2028 수능 플래너';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: n.body ?? d.body ?? '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: d.tag ?? 'planner',
      data: { url: d.url ?? '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data?.url as string) ?? '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) if ('focus' in c) { (c as WindowClient).navigate(url); return (c as WindowClient).focus(); }
      return self.clients.openWindow(url);
    }),
  );
});
