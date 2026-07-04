// Barbershop Vuk — service worker
// Hand-rolled (no Workbox/Serwist dependency) — small surface area, easy to inspect.
// Strategy:
//   - Static assets (icons, fonts, legacy)         → cache-first
//   - Public navigations (/, /shop, /zakazivanje)  → network-first, cache fallback, /offline last resort
//   - /admin/* and /api/*                          → network-only (never cache auth-bound or mutation traffic)
//   - Cross-origin (Supabase Storage, Resend, etc) → pass-through, no cache

const VERSION = "vuk-sw-v1";
const STATIC_CACHE = `${VERSION}-static`;
const RUNTIME_CACHE = `${VERSION}-runtime`;

// Pre-cache the absolute essentials so the offline page works on first navigation.
const PRECACHE = [
  "/offline",
  "/manifest.json",
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

// ── Web Push ─────────────────────────────────────────
//
// Notifications fired from src/lib/push/server.ts when a new booking
// lands (public booking flow, admin walk-in, shop order). Payload shape:
//   { title, body, url?, tag? }
// `url` defaults to /admin/termini so tapping the notification opens the
// admin dashboard at the right place. `tag` collapses repeats so a burst
// of three new bookings in 30 seconds shows one stacked notification
// instead of three.

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch (_) {
    payload = { title: "Barbershop Vuk", body: event.data.text() };
  }
  const title = payload.title || "Barbershop Vuk";
  const options = {
    body: payload.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: payload.tag || "vuk-default",
    renotify: true,
    data: { url: payload.url || "/admin/termini" },
    requireInteraction: false,
    vibrate: [120, 60, 120],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/admin/termini";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      // If an admin tab/PWA window is already open, focus it and navigate.
      for (const w of wins) {
        const wUrl = new URL(w.url);
        if (wUrl.origin === self.location.origin && "focus" in w) {
          w.focus();
          if ("navigate" in w) {
            try { w.navigate(targetUrl); } catch (_) { /* older Chromium */ }
          }
          return;
        }
      }
      // Otherwise open a fresh window straight to the deep link.
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
