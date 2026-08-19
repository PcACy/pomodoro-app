import { useCallback, useEffect, useRef, useState } from 'react'

export interface ServiceWorkerState {
  updateAvailable: boolean
  reload: () => void
}

export function useServiceWorker(): ServiceWorkerState {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const reloadingRef = useRef(false)
  const reloadOnControlRef = useRef(false)

  const reload = useCallback(() => {
    if (reloadingRef.current) return
    reloadingRef.current = true
    window.location.reload()
  }, [])

  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return

    let registration: ServiceWorkerRegistration | null = null
    let disposed = false

    // A new worker only counts as an update if there is already a controller
    // (avoids a pointless reload on the very first installation).
    const onUpdateFound = () => {
      const worker = registration?.installing
      if (!worker) return
      if (navigator.serviceWorker.controller) reloadOnControlRef.current = true
      worker.addEventListener('statechange', () => {
        if (worker.state === 'activated' && navigator.serviceWorker.controller) {
          setUpdateAvailable(true)
        }
      })
    }

    const onControllerChange = () => {
      setUpdateAvailable(false)
      if (reloadOnControlRef.current) reload()
    }

    const checkForUpdates = () => {
      if (registration) registration.update().catch(() => {})
    }

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        if (disposed) return
        registration = reg
        reg.addEventListener('updatefound', onUpdateFound)
        checkForUpdates()
      })
      .catch(() => {})

    const onVisibility = () => {
      if (document.visibilityState === 'visible') checkForUpdates()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      disposed = true
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [reload])

  return { updateAvailable, reload }
}