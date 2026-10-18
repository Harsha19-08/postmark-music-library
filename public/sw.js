/* Postmark service worker: lets the app open with no connection.
   Songs you download are stored in IndexedDB by the app itself, so audio is never handled here. */
const V = 'pm-v1';
const SHELL = ['/', '/search', '/library', '/upload', '/settings', '/manifest.webmanifest'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => Promise.all(SHELL.map(u => fetch(u, { credentials: 'same-origin' }).then(r => (r.ok && !r.redirected ? c.put(u, r) : null)).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/') || url.pathname === '/sw.js') return;
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok) { const c = r.clone(); caches.open(V).then(x => x.put(req, c)); } return r; })));
    return;
  }
  e.respondWith(
    fetch(req).then(r => { if (r.ok && !r.redirected) { const c = r.clone(); caches.open(V).then(x => x.put(req, c)); } return r; })
      .catch(() => caches.match(req).then(hit => hit || (req.mode === 'navigate' ? caches.match('/') : undefined) || new Response('Offline', { status: 503, headers: { 'content-type': 'text/plain' } }))),
  );
});
