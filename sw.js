// sw.js
const CACHE_NAME = 'app-cache-v10';

const ASSETS = [
  './',
  './index.html',
  './manifest.json?v=10',
  './icons/icon-192.png?v=10',
  './icons/icon-512.png?v=10'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  return self.clients.claim();
});

// Always serve the SPA shell for navigations, and ignore query strings for cache hits
self.addEventListener('fetch', event => {
  const req = event.request;

  // App page loads and address bar navigations
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html', { ignoreSearch: true })
        .then(resp => resp || fetch('./index.html'))
        .catch(() => caches.match('./index.html', { ignoreSearch: true }))
    );
    return;
  }

  // Static files and API requests
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(resp => resp || fetch(req))
  );
});





