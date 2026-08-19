import { useCallback, useEffect, useRef, useState } from 'react'

export interface ServiceWorkerState {
  updateAvailable: boolean
  reload: () => void
}

export function useServiceWorker(): ServiceWorkerState {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const waitingWorkerRef = useRef<ServiceWorker | null>(null)
  const reloadingRef = useRef(false)

  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return

    const onControllerChange = () => {
      if (reloadingRef.current) window.location.reload()
    }

    const onUpdateFound = (registration: ServiceWorkerRegistration) => {
      const worker = registration.installing
      if (!worker) return
      worker.addEventListener('statechange', () => {
        if (worker.state === 'activated' && navigator.serviceWorker.controller) {
          waitingWorkerRef.current = worker
          setUpdateAvailable(true)
        }
      })
    }

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        registration.addEventListener('updatefound', () => onUpdateFound(registration))
      })
      .catch(() => {})

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
    }
  }, [])

  const reload = useCallback(() => {
    reloadingRef.current = true
    if (waitingWorkerRef.current) waitingWorkerRef.current.postMessage({ type: 'SKIP_WAITING' })
    window.location.reload()
  }, [])

  return { updateAvailable, reload }
}