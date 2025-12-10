// sw.js
const CACHE_NAME = "vocab-cache-v5";

const base = new URL(self.registration.scope);
const toAbs = p => new URL(p, base).toString();

const CORE = [
  toAbs("./vocabulary.html"),
  toAbs("./manifest.json"),
  toAbs("./icons/icon-192.png"),
  toAbs("./icons/icon-512.png"),
];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    for (const url of CORE) {
      try {
        await cache.add(new Request(url, { cache: "reload" }));
      } catch (err) {
        console.error("[SW] failed to precache", url, err);
      }
    }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin http(s) GET
  if (req.method !== "GET") return;
  if (url.protocol !== "http:" && url.protocol !== "https:") return;
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const net = await fetch(req);
        // keep a fresh shell if possible
        cache.put(toAbs("./vocabulary.html"), net.clone()).catch(()=>{});
        return net;
      } catch {
        const shell = await cache.match(toAbs("./vocabulary.html"), { ignoreSearch: true });
        return shell || new Response("Offline", { status: 503 });
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(req, { ignoreSearch: true });
    if (cached) return cached;

    try {
      const net = await fetch(req);
      const copy = net.clone();
      const cache = await caches.open(CACHE_NAME);
      cache.put(req, copy).catch(()=>{});
      return net;
    } catch {
      return cached || new Response("Offline", { status: 503 });
    }
  })());
});
