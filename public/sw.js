// Service worker mínimo de Team Fit
// Habilita la instalación como PWA. No cachea datos sensibles:
// la app siempre pide los datos frescos a Supabase cuando hay conexión.
const CACHE = 'teamfit-v1';
const BASE = ['/', '/alumno', '/login'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(BASE)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  // nunca interceptar llamadas a la API/datos: siempre red
  if (req.method !== 'GET' || req.url.includes('supabase')) return;
  e.respondWith(
    fetch(req).catch(() => caches.match(req).then((r) => r || caches.match('/')))
  );
});
