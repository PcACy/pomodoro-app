interface NotificationActionConfig {
  action: string
  title: string
}

function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

const NOTIFY_KEY = 'pomodoro.notifications'

/** Stored opt-out flag. Defaults to ON (notifications sent unless disabled). */
export function readNotifyFlag(): boolean {
  try {
    if (typeof localStorage === 'undefined') return true
    return localStorage.getItem(NOTIFY_KEY) !== 'false'
  } catch {
    return true
  }
}

import { writeFlag } from './flagsStore'

export function writeNotifyFlag(value: boolean): void {
  writeFlag(NOTIFY_KEY, value)
}

/**
 * Effective state for UI toggles: the stored flag AND a granted permission.
 * A single shared initializer keeps Settings and Quick Settings in sync.
 */
export function isNotifyEffective(): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) return false
  try {
    return Notification.permission === 'granted' && readNotifyFlag()
  } catch {
    return false
  }
}

export async function requestNotificationPermission(): Promise<void> {
  if (!notificationsSupported() || Notification.permission !== 'default') return
  try {
    await Notification.requestPermission()
  } catch {
    /* best effort */
  }
}

export function notify(
  title: string,
  body: string,
  actions: NotificationActionConfig[] = [],
): void {
  if (!notificationsSupported() || Notification.permission !== 'granted') return
  try {
    // The flag read itself can throw (SecurityError with blocked cookies),
    // so it must live inside the try — it previously crashed timer
    // phase-change callbacks from outside any error boundary.
    if (!readNotifyFlag()) return
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      void navigator.serviceWorker.ready
        .then((reg) => {
          const shown = reg.showNotification(title, {
            body,
            icon: '/icon-192.svg',
            actions,
          } as NotificationOptions & { actions?: NotificationActionConfig[] })
          // showNotification returns a promise in modern browsers: a rejection
          // (e.g. permission revoked mid-flight) must not become unhandled.
          if (shown && typeof (shown as Promise<void>).catch === 'function') {
            ;(shown as Promise<void>).catch(() => {
              /* best effort */
            })
          }
        })
        .catch(() => {
          /* service worker not ready */
        })
      return
    }
    // Fallback: in non-SW context, do not pass actions array to avoid TypeError in Chromium
    const fallback = new Notification(title, {
      body,
      icon: '/icon-192.svg',
    })
    fallback.onclick = () => window.focus()
  } catch {
    /* notification display failed */
  }
}