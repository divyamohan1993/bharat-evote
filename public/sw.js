// Bharat eVote service worker. Stale-while-revalidate for shell, network-first for /api.
const VERSION = 'be-v1';
const SHELL = [
  '/',
  '/auth.html',
  '/vote.html',
  '/results.html',
  '/audit.html',
  '/admin.html',
  '/404.html',
  '/css/main.css',
  '/js/app.js',
  '/i18n/en.json',
  '/i18n/hi.json',
  '/icons/icon.svg',
  '/manifest.webmanifest'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL).catch(() => {})));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  if (e.request.method !== 'GET') return;

  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/v1/') || url.pathname.startsWith('/health')) {
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response(JSON.stringify({ error: { code: 'offline', message: 'You are offline' } }), {
          status: 503, headers: { 'content-type': 'application/json' }
        }))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(hit => {
      const fetchPromise = fetch(e.request).then(resp => {
        if (resp && resp.status === 200) {
          const copy = resp.clone();
          caches.open(VERSION).then(c => c.put(e.request, copy));
        }
        return resp;
      }).catch(() => hit);
      return hit || fetchPromise;
    })
  );
});
