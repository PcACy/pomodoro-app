const CACHE = '__CACHE_VERSION__'

const STATIC_ASSETS = [
  './',
  '/index.html',
  '/manifest.webmanifest',
  '/icon-192.svg',
  '/icon-512.svg',
]

function isSupabaseUrl(url) {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname
    const isSupabaseHost =
      host === 'supabase.co' ||
      host.endsWith('.supabase.co') ||
      host === 'supabase.in' ||
      host.endsWith('.supabase.in')
    return (
      isSupabaseHost ||
      parsed.pathname.startsWith('/rest/v1/') ||
      parsed.pathname.startsWith('/auth/v1/')
    )
  } catch {
    return false
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(STATIC_ASSETS)),
  )
})

self.addEventListener('activate', (event) => {
  // Purge any legacy or previous version caches (including old API_CACHE)
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      ),
  )
  self.clients.claim()
})

async function networkFirst(request) {
  const cache = await caches.open(CACHE)
  try {
    const response = await fetch(request)
    if (response && response.ok) {
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await cache.match(request)
    if (cached) return cached
    if (request.mode === 'navigate') {
      const index = (await cache.match('/index.html')) || (await cache.match('./'))
      if (index) return index
    }
    return new Response('Offline', { status: 503, statusText: 'Offline' })
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE)
  const cached = await cache.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    if (response && response.ok) {
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return cached || new Response('Offline', { status: 503, statusText: 'Offline' })
  }
}

/** Serve from cache immediately, refresh in the background. */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE)
  const cached = await cache.match(request)
  const network = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone())
      return response
    })
    .catch(() => undefined)
  if (cached) return cached
  const fresh = await network
  return fresh || new Response('Offline', { status: 503, statusText: 'Offline' })
}

self.addEventListener('fetch', (event) => {
  const { request } = event

  // Only handle standard GET requests
  if (request.method !== 'GET') return

  // Skip browser extensions, chrome-extension schemes, or non-http(s)
  if (!request.url.startsWith('http')) return

  const url = new URL(request.url)

  // Version and service worker files should always be fetched fresh
  if (
    url.pathname === '/version.json' ||
    url.pathname.endsWith('/version.json') ||
    url.pathname === '/sw.js' ||
    url.pathname.endsWith('/sw.js')
  ) {
    event.respondWith(fetch(request))
    return
  }

  // Security: Supabase API & Auth requests must NEVER be stored in Service Worker CacheStorage
  if (isSupabaseUrl(request.url)) {
    event.respondWith(fetch(request))
    return
  }

  // Navigation requests: Network-first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request))
    return
  }

  // Hashed build assets & Webfonts: Cache-First for instant (<50ms) repeat loads
  const isGoogleFonts =
    url.hostname === 'fonts.gstatic.com' ||
    url.hostname.endsWith('.fonts.gstatic.com') ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname.endsWith('.fonts.googleapis.com')

  if (
    url.pathname.startsWith('/assets/') ||
    isGoogleFonts ||
    url.pathname.endsWith('.woff2')
  ) {
    event.respondWith(cacheFirst(request))
    return
  }

  // General static assets: Stale-while-revalidate
  event.respondWith(staleWhileRevalidate(request))
})

// Notification action buttons -> forward to the running app (works in the background).
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const action = event.action || ''
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const target = clients.find((c) => c.focused) || clients[0]
      if (target) {
        target.postMessage({ type: 'notification-action', action })
        return target.focus()
      }
      return self.clients.openWindow(new URL('./', self.location.origin).href)
    }),
  )
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})