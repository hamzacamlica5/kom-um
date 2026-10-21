// Apartmanca servis çalışanı: uygulama kabuğunu önbellekler, telefon bildirimlerini gösterir.
const VERSION = "__BUILD__";
const CACHE = "komsum-" + VERSION;
const SHELL = ["/", "/fonts/plus-jakarta-sans.woff2", "/app.js?v=" + VERSION, "/app.css?v=" + VERSION, "/api/config", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/badge-72.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("komsum-") && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Veri istekleri (Supabase) her zaman ağdan gelir.
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith("/api/") && url.pathname !== "/api/config") return;

  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put("/", cp)); return r; }).catch(() => caches.match("/")));
    return;
  }
  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req).then((r) => { if (r.ok) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); } return r; });
      return hit || net;
    })
  );
});

self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { title: "Apartmanca", body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || "Apartmanca", {
    body: d.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-72.png",
    tag: d.tag || undefined,
    data: { url: d.url || "/" },
  }));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of all) {
      if (new URL(c.url).origin === location.origin) {
        await c.focus();
        c.postMessage({ type: "navigate", url: target });
        return;
      }
    }
    await self.clients.openWindow(target);
  })());
});
