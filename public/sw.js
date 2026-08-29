// Minimal service worker — it exists mainly to satisfy Chrome's "installable
// as an app" requirement (a registered service worker with a fetch handler).
// Deliberately does NOT cache anything: this is a CMS-backed site where
// content changes through the admin at any time, and a cached response
// would silently show old boards/products again — the exact bug already
// hit once with the homepage's static rendering. Freshness over offline
// support, for now.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
