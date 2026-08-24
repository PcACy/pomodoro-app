import { useEffect, useRef } from 'react'

type NotificationActionId = 'start-break' | 'start-focus' | 'add-5'

interface Handlers {
  onStartPhase: (action: NotificationActionId) => void
  onAddTime: () => void
}

/**
 * Listens for messages posted by the service worker when the user clicks a
 * notification action (works even while the tab is in the background).
 */
export function useNotificationActions({ onStartPhase, onAddTime }: Handlers): void {
  const ref = useRef({ onStartPhase, onAddTime })
  ref.current = { onStartPhase, onAddTime }

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const handler = (event: MessageEvent) => {
      const msg = event.data as { type?: string; action?: string } | null
      if (!msg || msg.type !== 'notification-action') return
      if (msg.action === 'add-5') ref.current.onAddTime()
      else if (msg.action === 'start-break' || msg.action === 'start-focus') {
        ref.current.onStartPhase(msg.action)
      }
    }
    navigator.serviceWorker.addEventListener('message', handler)
    return () => navigator.serviceWorker.removeEventListener('message', handler)
  }, [])
}