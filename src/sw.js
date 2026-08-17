import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

self.skipWaiting()
cleanupOutdatedCaches()

// Vite-plugin-pwa ersetzt dies beim Build durch die tatsächliche Precache-Liste.
precacheAndRoute(self.__WB_MANIFEST)

// ffmpeg-Kern (~25 MB) kommt vom CDN statt aus dem eigenen Build —
// nach dem ersten Laden dauerhaft cachen, damit er auch offline nutzbar bleibt.
registerRoute(
  ({ url }) => url.origin === 'https://unpkg.com' && url.pathname.includes('@ffmpeg/core'),
  new CacheFirst({
    cacheName: 'ffmpeg-core-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 30 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
)

// pdf.js-Worker (~2 MB) ist Teil des eigenen Builds, aber zu groß fürs Precaching auf
// Verdacht — wird stattdessen beim ersten Gebrauch (PDF → Bilder/Text) gecacht.
registerRoute(
  ({ url }) => url.pathname.includes('pdf.worker'),
  new CacheFirst({
    cacheName: 'pdf-worker-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 2, maxAgeSeconds: 60 * 60 * 24 * 30 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
)

const SHARED_FILE_CACHE = 'shared-files'
const SHARED_FILE_KEY = '/shared-file'

// Nimmt Dateien entgegen, die über den OS-Teilen-Dialog ("Teilen an Filetool")
// an die App geschickt werden. Da GitHub Pages keinen eigenen Server-Code
// erlaubt, fängt der Service Worker die POST-Anfrage ab, legt die Datei im
// Cache-Storage ab und leitet dann auf die App weiter, die sie dort abholt.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method === 'POST' && url.pathname.endsWith('/share-target/')) {
    event.respondWith(handleShareTarget(event))
  }
})

async function handleShareTarget(event) {
  try {
    const formData = await event.request.formData()
    const file = formData.get('file')
    if (file) {
      const cache = await caches.open(SHARED_FILE_CACHE)
      await cache.put(
        SHARED_FILE_KEY,
        new Response(file, {
          headers: {
            'Content-Type': file.type || 'application/octet-stream',
            'X-File-Name': encodeURIComponent(file.name || 'geteilte-datei'),
          },
        }),
      )
    }
  } catch {
    // Wenn das Teilen fehlschlägt, landet man einfach ohne vorausgefüllte Datei in der App.
  }
  return Response.redirect('./?shared=1', 303)
}
