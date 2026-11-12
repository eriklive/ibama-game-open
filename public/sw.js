// Service worker simples: guarda o que já foi aberto para o jogo abrir offline.
const CACHE = 'ibama-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith('http')) return;
  const sameOrigin = new URL(req.url).origin === self.location.origin;
  const fresh = req.mode === 'navigate' || req.url.endsWith('manifest.webmanifest');
  // páginas: rede primeiro (pega atualizações); o resto: cache primeiro
  e.respondWith(
    (fresh ? fetchAndCache(req).catch(() => caches.match(req)) : caches.match(req).then((hit) => hit || fetchAndCache(req)))
      .then((r) => r || (sameOrigin ? caches.match('./') : Response.error())),
  );
});

function fetchAndCache(req) {
  return fetch(req).then((res) => {
    if (res.ok || res.type === 'opaque') {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
    }
    return res;
  });
}
