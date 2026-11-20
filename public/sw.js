/* global self, caches, clients */
// Alpha Console offline cache, served as /console-app/sw.js with scope /console-app/. This file is a template:
// scripts/publish-web.mts fills in the BUILD_ID and PRECACHE constants of the exported copy. Only caches named
// alpha-console-* are pruned, so the root /sw.js of the site keeps its own cache.
const BUILD_ID = "__BUILD_ID__";
const CACHE_PREFIX = "alpha-console-";
const CACHE_NAME = CACHE_PREFIX + BUILD_ID;
const SCOPE_PATH = "/console-app";
const SHELL = "/console-app/index.html";
const PRECACHE = __PRECACHE__;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME).map((name) => caches.delete(name))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname !== SCOPE_PATH && !url.pathname.startsWith(SCOPE_PATH + "/")) return;

  // Pages: network first, so a new deploy shows at once. Offline, every /console-app route gets the cached shell.
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(event, request));
    return;
  }
  // Hashed bundles and other exported assets: cache first.
  event.respondWith(cacheFirst(event, request));
});

async function networkFirst(event, request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) event.waitUntil(cache.put(SHELL, response.clone()));
    return response;
  } catch {
    const shell = await cache.match(SHELL);
    return shell || Response.error();
  }
}

async function cacheFirst(event, request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) event.waitUntil(cache.put(request, response.clone()));
  return response;
}
