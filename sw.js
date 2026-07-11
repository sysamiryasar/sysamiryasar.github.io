const CACHE_NAME = "samir-yasar-v3";
const ASSETS = [
  "/",
  "/index.html",
  "/soar.html",
  "/sirat.html",
  "/404.html",
  "/css/style.css",
  "/js/script.js",
  "/js/chat.js",
  "/js/github.js",
  "/js/main.js",
  "/js/scroll.js",
  "/js/cursor.js",
  "/js/navbar.js",
  "/js/animations.js",
  "/js/teaser.js",
  "/css/variables.css",
  "/css/animations.css",
  "/css/styles.css",
  "/assets/logo_favicon.png",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;

  const isDocument = event.request.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname === "/";

  if (isDocument) {
    // Network-first for HTML so content updates show up on the next load
    // instead of being stuck behind a stale cache indefinitely.
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => cached);
    })
  );
});
