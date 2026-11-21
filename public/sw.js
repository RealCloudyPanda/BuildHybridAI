/* Production shell cache only. No notes, settings, prompts, provider or API responses. */
let manifest;
const readManifest = async () => manifest ||= await (await fetch('/offline-manifest.json', { credentials: 'omit', cache: 'no-store' })).json();
self.addEventListener('install', (event) => event.waitUntil((async () => {
  const m = await readManifest();
  const cache = await caches.open(m.version);
  await cache.addAll(m.files.map((p) => new Request(p, { credentials: 'omit' })));
  await self.skipWaiting();
})()));
self.addEventListener('activate', (event) => event.waitUntil((async () => {
  const names = await caches.keys();
  // Keep only this worker's newest cache, determined by successful installation.
  const own = names.filter((n) => n.startsWith('repro-shell-'));
  for (const n of own.slice(0, -1)) await caches.delete(n);
  await self.clients.claim();
})()));
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.search || event.request.headers.has('Authorization')) return;
  const path = url.pathname === '/' ? '/index.html' : url.pathname;
  event.respondWith((async () => {
    // Exact cache membership is the allowlist, never runtime caching.
    const cached = await caches.match(path);
    return cached || fetch(event.request);
  })());
});
