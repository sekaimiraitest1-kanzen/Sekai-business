// Berbernica Triša — service worker
// Hand-rolled (no Workbox/Serwist dependency) — small surface area, easy to inspect.
// Strategy:
//   - Static assets (icons, fonts, legacy)         → cache-first
//   - Public navigations (/, /shop, /zakazivanje)  → network-first, cache fallback, /offline last resort
//   - /admin/* and /api/*                          → network-only (never cache auth-bound or mutation traffic)
//   - Cross-origin (Supabase Storage, Resend, etc) → pass-through, no cache

const VERSION = "trisa-sw-v3";
const STATIC_CACHE = `${VERSION}-static`;
const RUNTIME_CACHE = `${VERSION}-runtime`;

// Pre-cache the absolute essentials so the offline page works on first navigation.
const PRECACHE = [
  "/offline",
  "/manifest.json",
  "/logo.svg",
  "/logo-120.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll(PRECACHE).catch(() => {
        // Don't block install if one asset fails — log and move on.
        return undefined;
      })
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

function isStatic(url) {
  return (
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/legacy/") ||
    url.pathname.startsWith("/_next/static/") ||
    /\.(?:woff2?|ttf|svg|png|jpg|jpeg|webp|gif|ico|css|js)$/i.test(url.pathname)
  );
}

function isAdminOrApi(url) {
  return url.pathname.startsWith("/admin") || url.pathname.startsWith("/api");
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Cross-origin: don't intervene.
  if (url.origin !== self.location.origin) return;

  // /admin/* and /api/*: never cache, never fall back.
  if (isAdminOrApi(url)) return;

  // Static assets: cache-first.
  if (isStatic(url)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(req, clone));
          }
          return res;
        }).catch(() => cached || new Response("", { status: 504 }));
      })
    );
    return;
  }

  // Navigations + everything else: network-first, cache fallback, then /offline.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && req.mode === "navigate") {
          const clone = res.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(req, clone));
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        if (req.mode === "navigate") {
          const offline = await caches.match("/offline");
          if (offline) return offline;
        }
        return new Response("Offline", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      })
  );
});
