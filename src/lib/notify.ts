export interface NotificationActionConfig {
  action: string
  title: string
}

export function notificationsSupported(): boolean {
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
    const options: NotificationOptions & { actions?: NotificationActionConfig[] } = {
      body,
      icon: '/icon-192.svg',
      actions,
    }
    new Notification(title, options)
  } catch {
    /* some browsers require a service worker registration; ignore */
  }
}