// FactuYa! Service Worker
// Strategy:
//  - Static assets (JS/CSS/icons): stale-while-revalidate so the app loads
//    instantly online AND offline.
//  - HTML navigations: network-first with cache fallback so users still see
//    the app shell when their phone has no signal.
//  - API requests: always go to the network. Offline reads of business data
//    are handled by IndexedDB inside the React layer (services/offlineDb.js),
//    not here.

const CACHE_VERSION = 'v4-offline';
const CACHE_NAME = `factuya-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-48.png',
  '/icon-72.png',
  '/icon-96.png',
  '/icon-144.png',
  '/icon-152.png',
  '/icon-167.png',
  '/icon-180.png',
  '/icon-192.png',
  '/icon-256.png',
  '/icon-384.png',
  '/icon-512.png',
  '/icon-maskable-192.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png',
  '/favicon.ico',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name.startsWith('factuya-') && name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (!request.url.startsWith('http')) return;

  const url = new URL(request.url);

  // API requests: never cache; let the React layer handle offline via IndexedDB.
  if (url.pathname.startsWith('/api/')) return;

  // Navigations (HTML): network-first, fall back to cached index.html so the
  // app shell still loads when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const shell = await caches.match('/index.html');
          return (
            shell ||
            new Response('Offline', { status: 503, statusText: 'Offline' })
          );
        })
    );
    return;
  }

  // Everything else (JS/CSS/images/fonts): stale-while-revalidate.
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
