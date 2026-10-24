// Minimal service worker for Sakhi app shell caching
const CACHE_NAME = "sakhi-shell-v1";
const SHELL_ASSETS = [
  "/",
  "/home",
  "/log",
  "/manifest.json",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/favicon.ico",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        SHELL_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn("[sw] Cache add failed:", url, err);
          }),
        ),
      );
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        }),
      );
    }),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only handle HTTP/HTTPS GET requests
  if (req.method !== "GET" || !req.url.startsWith("http")) return;

  // Navigation requests: Network first, fall back to cached page or app shell
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          if (cached) return cached;
          const fallbackHome = await caches.match("/home");
          if (fallbackHome) return fallbackHome;
          const fallbackRoot = await caches.match("/");
          if (fallbackRoot) return fallbackRoot;
          return new Response(
            '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Sakhi</title></head><body><h1>Offline</h1><p>Sakhi is running offline.</p></body></html>',
            { headers: { "Content-Type": "text/html" } },
          );
        }),
    );
    return;
  }

  // Static assets: cache first, then network fallback
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (res && res.status === 200 && req.url.startsWith(self.location.origin)) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return res;
        })
        .catch(() => cached);
    }),
  );
});
