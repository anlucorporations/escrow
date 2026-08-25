/* Service Worker básico de TrueKeate (M13): cache-first para assets estáticos. */
const CACHE = 'truekeate-v1'
const STATIC = ['/', '/manifest.webmanifest', '/icon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(STATIC)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) return
  // No cachear llamadas API
  if (request.url.includes('/api/')) return
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone()
            caches.open(CACHE).then((c) => c.put(request, clone))
          }
          return response
        })
        .catch(() => cached)
      return cached || network
    })
  )
})
