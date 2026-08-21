import { useCallback, useEffect, useRef, useState } from 'react'

export interface ServiceWorkerState {
  updateAvailable: boolean
  reload: () => void
}

const CHECK_INTERVAL_MS = 15 * 60 * 1000 // Check every 15 minutes

export function useServiceWorker(): ServiceWorkerState {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const waitingWorkerRef = useRef<ServiceWorker | null>(null)
  const reloadingRef = useRef(false)
  const initialVersionRef = useRef<string | null>(
    typeof __APP_BUILD_VERSION__ !== 'undefined' ? __APP_BUILD_VERSION__ : null,
  )

  const reload = useCallback(() => {
    if (reloadingRef.current) return
    reloadingRef.current = true

    if (waitingWorkerRef.current) {
      waitingWorkerRef.current.postMessage({ type: 'SKIP_WAITING' })
    }
    setTimeout(() => {
      window.location.reload()
    }, 100)
  }, [])

  useEffect(() => {
    let disposed = false
    let registration: ServiceWorkerRegistration | null = null

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
      if (registration) {
        registration.update().catch(() => {})
      }
      void checkVersionJson()
    }

    const handleWaitingWorker = (worker: ServiceWorker) => {
      waitingWorkerRef.current = worker
      setUpdateAvailable(true)
    }

    const onUpdateFound = () => {
      const newWorker = registration?.installing
      if (!newWorker) return

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          handleWaitingWorker(newWorker)
        }
      })
    }

    const onControllerChange = () => {
      if (reloadingRef.current) {
        window.location.reload()
      }
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          if (disposed) return
          registration = reg

          // If there is already a worker waiting from a previous background check
          if (reg.waiting && navigator.serviceWorker.controller) {
            handleWaitingWorker(reg.waiting)
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
    const onOnline = () => checkForUpdates()

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('online', onOnline)

    const intervalId = setInterval(checkForUpdates, CHECK_INTERVAL_MS)

    return () => {
      disposed = true
      clearInterval(intervalId)
      registration?.removeEventListener('updatefound', onUpdateFound)
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
      }
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('online', onOnline)
    }
  }, [])

  return { updateAvailable, reload }
}