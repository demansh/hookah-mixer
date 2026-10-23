---
layout: null
---
const BUILD_ID = '{{ site.github.build_revision | default: "local" }}';
const CACHE_NAME = `hookah-mixer-${BUILD_ID}`;
const PRECACHE_URLS = [
  './',
  './manifest.webmanifest',
{%- for file in site.static_files %}{% if file.path contains '/assets/' %}
  '.{{ file.path }}',
{%- endif %}{% endfor %}
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(PRECACHE_URLS.map((url) => new Request(url, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {
    return;
  }
  event.respondWith(fetchFreshWithOfflineFallback(request));
});

async function fetchFreshWithOfflineFallback(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request, { cache: 'no-cache' });
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) {
      return cached;
    }
    throw error;
  }
}
