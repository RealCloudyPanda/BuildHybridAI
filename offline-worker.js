const manifest = __SHELL_MANIFEST__;
const scope = new URL(self.registration.scope);
const cachePrefix = 'repro-shell-' + encodeURIComponent(scope.pathname) + '-';
const cacheName = cachePrefix + manifest.version;
const shellUrl = (path) => new URL(path, scope).href;
const readManifest = async () => manifest;
self.addEventListener('install', (event) => event.waitUntil((async () => {
  const m = await readManifest();
  const cache = await caches.open(cacheName);
  await cache.addAll(m.files.map((p) => new Request(shellUrl(p), { credentials: 'omit' })));
  await self.skipWaiting();
})()));
self.addEventListener('activate', (event) => event.waitUntil((async () => {
  const m = await readManifest();
  const names = await caches.keys();

  const own = names.filter((n) => n.startsWith(cachePrefix) || (scope.pathname === '/' && /^repro-shell-(?:[a-f0-9]{16}|obsolete)$/.test(n)));
  for (const n of own) if (n !== cacheName) await caches.delete(n);
  await self.clients.claim();
})()));
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.search || event.request.headers.has('Authorization')) return;
  if (!url.pathname.startsWith(scope.pathname)) return;
  const path = url.pathname === scope.pathname ? shellUrl('index.html') : url.href;
  event.respondWith((async () => {

    const cached = await (await caches.open(cacheName)).match(path);
    return cached || fetch(event.request);
  })());
});
