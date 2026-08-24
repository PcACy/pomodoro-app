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
  try {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      void navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification(title, {
          body,
          icon: '/icon-192.svg',
          actions,
        } as NotificationOptions & { actions?: NotificationActionConfig[] })
      })
      return
    }
    // Fallback: in non-SW context, do not pass actions array to avoid TypeError in Chromium
    new Notification(title, {
      body,
      icon: '/icon-192.svg',
    })
  } catch {
    /* notification display failed */
  }
}