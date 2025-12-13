const CACHE_NAME = 'vocab-app-v4';

const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.json',
  './helpers.js',
  './theme_voice.js',
  './rules.js',
  './ui.js',
  './word_of_day.js',
  './app.js',
  './quiz.js',
  './export_import.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    })
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then(networkResponse => {
          const cloned = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, cloned);
          });
          return networkResponse;
        })
        .catch(() => {
          // If offline and not in cache, just fail normally
          return caches.match('./index.html');
        });
    })
  );
});
