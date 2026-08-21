const CACHE = '__CACHE_VERSION__'
const API_CACHE = 'pomodoro-api-v1'

function isSupabaseUrl(url) {
  try {
    const host = new URL(url).hostname
    return (
      host.includes('supabase.co') ||
      host.includes('supabase.in') ||
      url.includes('/rest/v1/') ||
      url.includes('/auth/v1/')
    )
  } catch {
    return false
  }
}

function simpleHash(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 16777619) >>> 0
  }
  return h.toString(16)
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(['./', '/index.html', '/manifest.webmanifest'])),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE && k !== API_CACHE).map((k) => caches.delete(k))),
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

// Supabase responses are per-user, so key the cache by URL + auth headers.
function apiCacheKey(request) {
  const url = new URL(request.url)
  const auth = request.headers.get('authorization') || ''
  const key = request.headers.get('apikey') || ''
  url.searchParams.set('__auth', simpleHash(auth + '|' + key))
  return url.toString()
}

/** Network-first for Supabase GETs with an offline fallback to cached data. */
async function apiNetworkFirst(request) {
  const cache = await caches.open(API_CACHE)
  const key = apiCacheKey(request)
  try {
    const response = await fetch(request)
    if (response && response.ok) cache.put(key, response.clone())
    return response
  } catch {
    const cached = await cache.match(key)
    if (cached) return cached
    return new Response(null, { status: 503, statusText: 'Offline' })
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  // Writes (upsert/delete) go straight to the network so the sync queue
  // observes real failures instead of faked successes.
  if (request.method !== 'GET') return
  if (isSupabaseUrl(request.url)) {
    event.respondWith(apiNetworkFirst(request))
    return
  }
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request))
    return
  }
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