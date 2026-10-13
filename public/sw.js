// Prioriza a internet (sempre pega a versão nova do app); só usa o cache se estiver sem sinal.
// Os dados do Supabase nunca ficam em cache, então o saldo mostrado é sempre o atual.
const CACHE = 'fiado-v1'

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/', '/manifest.webmanifest', '/icon-192.png'])))
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const r = e.request
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return
  e.respondWith(
    fetch(r)
      .then((res) => {
        const copia = res.clone()
        caches.open(CACHE).then((c) => c.put(r, copia))
        return res
      })
      .catch(() => caches.match(r).then((m) => m || caches.match('/')))
  )
})
