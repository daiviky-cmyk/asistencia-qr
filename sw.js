// Service Worker - SIEMPRE red primero, sin caché del HTML principal
const CACHE_NAME = 'assistant-day-v3';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  // Borrar TODOS los cachés viejos
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = event.request.url;
  
  // index.html y manifest: SIEMPRE desde red, nunca caché
  if (url.endsWith('/') || url.includes('index.html') || url.includes('manifest.json')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // CDN (charts, qrcode): caché primero para velocidad
  if (url.includes('cdn.jsdelivr') || url.includes('fonts.googleapis') || url.includes('fonts.gstatic')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }

  // Todo lo demás: red primero
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
