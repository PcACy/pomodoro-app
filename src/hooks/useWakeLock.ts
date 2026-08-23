import { useEffect, useRef } from 'react'

export function wakeLockSupported(): boolean {
  return typeof navigator !== 'undefined' && 'wakeLock' in navigator
}

/**
 * Keeps the screen awake while `active` is true (e.g. a running timer).
 * Browsers auto-release the lock when the tab becomes hidden, so it is
 * transparently re-acquired on every `visibilitychange` back to visible.
 * Unsupported browsers / permission denials are handled silently.
 */
export function useWakeLock(active: boolean): void {
  const sentinelRef = useRef<WakeLockSentinel | null>(null)
  const activeRef = useRef(active)
  activeRef.current = active

  useEffect(() => {
    if (!wakeLockSupported()) return

    const acquire = async (): Promise<void> => {
      if (!activeRef.current || sentinelRef.current) return
      try {
        const sentinel = await navigator.wakeLock.request('screen')
        // Another acquire() may have resolved first while we were awaiting –
        // release the surplus sentinel instead of leaking an untracked lock.
        if (!activeRef.current || sentinelRef.current) {
          void sentinel.release().catch(() => {})
          return
        }
        sentinelRef.current = sentinel
        sentinel.addEventListener(
          'release',
          () => {
            if (sentinelRef.current === sentinel) sentinelRef.current = null
          },
          { once: true },
        )
      } catch {
        /* wake lock denied / unavailable – non-fatal */
      }
    }

    const release = async (): Promise<void> => {
      const s = sentinelRef.current
      if (!s) return
      sentinelRef.current = null
      try {
        await s.release()
      } catch {
        /* already released */
      }
    }

    const onVisibility = (): void => {
      if (document.visibilityState === 'visible') void acquire()
      else void release()
    }

    if (active) void acquire()
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      void release()
    }
  }, [active])
}