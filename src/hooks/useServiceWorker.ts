import { useCallback, useEffect, useRef, useState } from 'react'

interface ServiceWorkerState {
  updateAvailable: boolean
  reload: () => void
}

const CHECK_INTERVAL_MS = 5 * 60 * 1000 // Check every 5 minutes

export function useServiceWorker(): ServiceWorkerState {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const waitingWorkerRef = useRef<ServiceWorker | null>(null)
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null)
  const reloadingRef = useRef(false)
  const initialVersionRef = useRef<string | null>(
    typeof __APP_BUILD_VERSION__ !== 'undefined' ? __APP_BUILD_VERSION__ : null,
  )

  const reload = useCallback(() => {
    if (reloadingRef.current) return
    reloadingRef.current = true

    const waiting = waitingWorkerRef.current
    if (waiting) {
      waiting.postMessage({ type: 'SKIP_WAITING' })
      // Give the new worker a moment to activate (controllerchange reloads).
      // Fallback: navigation is network-first, so even a plain reload loads
      // the fresh index.html + hashed assets.
      setTimeout(() => {
        if (reloadingRef.current) {
          reloadingRef.current = false
          window.location.reload()
        }
      }, 1500)
    } else {
      // Update seen via version.json before the new worker finished
      // installing: a plain reload fetches the new bundle (network-first).
      reloadingRef.current = false
      window.location.reload()
    }
  }, [])

  useEffect(() => {
    let disposed = false

    const handleWaitingWorker = (worker: ServiceWorker) => {
      waitingWorkerRef.current = worker
      if (!disposed) setUpdateAvailable(true)
    }

    const trackedCleanups = new Set<() => void>()

    // Tracks an installing worker through to 'installed'. The upfront state
    // check covers the race where register() itself triggered the update and
    // the worker already finished installing before updatefound was observed.
    const trackInstalling = (worker: ServiceWorker) => {
      if (worker.state === 'installed') {
        if (navigator.serviceWorker.controller) handleWaitingWorker(worker)
        return
      }
      let detach = () => {}
      const onStateChange = () => {
        if (disposed) {
          detach()
          return
        }
        if (worker.state === 'installed') {
          detach()
          if (navigator.serviceWorker.controller) handleWaitingWorker(worker)
        }
      }
      detach = () => {
        worker.removeEventListener('statechange', onStateChange)
        trackedCleanups.delete(detach)
      }
      trackedCleanups.add(detach)
      worker.addEventListener('statechange', onStateChange)
    }

    const checkVersionJson = async () => {
      if (!initialVersionRef.current) return
      try {
        const res = await fetch(`/version.json?_t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        })
        if (!res.ok) return
        const data = (await res.json()) as { version?: string }
        if (data.version && data.version !== initialVersionRef.current && !disposed) {
          setUpdateAvailable(true)
        }
      } catch {
        /* best effort */
      }
    }

    const checkForUpdates = () => {
      registrationRef.current?.update().catch(() => {})
      void checkVersionJson()
    }

    const onUpdateFound = () => {
      const worker = registrationRef.current?.installing
      if (worker) trackInstalling(worker)
    }

    const onControllerChange = () => {
      if (reloadingRef.current) {
        // Consume the flag: without this, reload() and this handler would
        // each trigger a full page reload.
        reloadingRef.current = false
        window.location.reload()
      }
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          if (disposed) return
          registrationRef.current = reg

          // Worker already waiting from a previous background check, or
          // install triggered by register() itself (missed updatefound race).
          if (reg.waiting && navigator.serviceWorker.controller) {
            handleWaitingWorker(reg.waiting)
          } else if (reg.installing) {
            trackInstalling(reg.installing)
          }

          reg.addEventListener('updatefound', onUpdateFound)
          checkForUpdates()
        })
        .catch(() => {})
    } else {
      // In environments without ServiceWorker, still check version.json
      void checkVersionJson()
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') checkForUpdates()
    }

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('online', checkForUpdates)
    window.addEventListener('focus', checkForUpdates)
    window.addEventListener('pageshow', checkForUpdates)

    const intervalId = setInterval(checkForUpdates, CHECK_INTERVAL_MS)

    return () => {
      disposed = true
      clearInterval(intervalId)
      trackedCleanups.forEach((fn) => fn())
      trackedCleanups.clear()
      registrationRef.current?.removeEventListener('updatefound', onUpdateFound)
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
      }
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('online', checkForUpdates)
      window.removeEventListener('focus', checkForUpdates)
      window.removeEventListener('pageshow', checkForUpdates)
    }
  }, [])

  return { updateAvailable, reload }
}
