const CACHE = '__CACHE_VERSION__'

const STATIC_ASSETS = [
  './',
  '/index.html',
  '/manifest.webmanifest',
  '/icon-192.svg',
  '/icon-512.svg',
]

/**
 * Security: Checks if a request targets Supabase, Auth, OAuth, or external APIs
 * and must NEVER be stored in Service Worker CacheStorage.
 */
function isNonCacheableRequest(request) {
  try {
    const url = typeof request === 'string' ? new URL(request) : new URL(request.url)
    const host = url.hostname

    // Explicit Supabase infrastructure
    const isSupabase =
      host === 'supabase.co' ||
      host.endsWith('.supabase.co') ||
      host === 'supabase.in' ||
      host.endsWith('.supabase.in') ||
      url.pathname.startsWith('/rest/v1/') ||
      url.pathname.startsWith('/auth/v1/') ||
      url.pathname.startsWith('/storage/v1/') ||
      url.pathname.startsWith('/functions/v1/') ||
      url.pathname.startsWith('/realtime/v1/')

    // Third-party APIs & OAuth
    const isExternalApi =
      host === 'api.github.com' ||
      host === 'github.com' ||
      url.pathname.includes('/oauth/')

    // Request-level Auth headers (if Request object provided)
    let hasAuthHeader = false
    if (typeof request === 'object' && request.headers) {
      hasAuthHeader =
        request.headers.has('authorization') ||
        request.headers.has('apikey') ||
        request.headers.has('x-client-info')
    }

    return isSupabase || isExternalApi || hasAuthHeader
  } catch {
    return true // Fail-safe: don't cache on URL parse error
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
  if (isNonCacheableRequest(request)) {
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

  // Only cache same-origin static assets; pass external requests directly
  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request))
  } else {
    event.respondWith(fetch(request))
  }
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