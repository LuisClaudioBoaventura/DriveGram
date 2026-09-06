// Service Worker for DriveGram Mobile
if (typeof self !== 'undefined' && self.location && (self.location.hostname === 'tauri.localhost' || self.location.protocol === 'tauri:')) {
  if (self.registration && typeof self.registration.unregister === 'function') {
    self.registration.unregister().catch(() => {});
  }
}

const CACHE_NAME = 'drivegram-app-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // If running in Tauri desktop, Capacitor, or local dev, NEVER intercept
  if (
    requestUrl.hostname === 'tauri.localhost' ||
    requestUrl.protocol === 'tauri:' ||
    self.location.hostname === 'tauri.localhost' ||
    self.location.protocol === 'tauri:' ||
    requestUrl.hostname === 'localhost' ||
    requestUrl.hostname === '127.0.0.1' ||
    requestUrl.pathname.startsWith('/api') || 
    requestUrl.pathname.startsWith('/@') || 
    requestUrl.pathname.startsWith('/src') || 
    requestUrl.pathname.startsWith('/node_modules') || 
    event.request.headers.get('range')
  ) {
    return;
  }

  // Network-first strategy for dynamic pages, fallback to cache
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone).catch(() => {});
          });
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});
