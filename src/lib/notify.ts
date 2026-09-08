interface NotificationActionConfig {
  action: string
  title: string
}

function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
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
  if (typeof localStorage !== 'undefined' && localStorage.getItem('pomodoro.notifications') === 'false') return
  try {
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