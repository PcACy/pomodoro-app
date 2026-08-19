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

export function notify(title: string, body: string): void {
  if (!notificationsSupported() || Notification.permission !== 'granted') return
  try {
    new Notification(title, { body, icon: '/icon-192.svg' })
  } catch {
    /* some browsers require a service worker registration; ignore */
  }
}