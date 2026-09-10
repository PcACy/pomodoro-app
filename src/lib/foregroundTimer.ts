import { Capacitor } from '@capacitor/core'
import { ForegroundService, Importance } from '@capawesome-team/capacitor-android-foreground-service'

const CHANNEL_ID = 'pomodoro_timer_channel'
const NOTIFICATION_ID = 1001
const SMALL_ICON = 'ic_stat_timer'

let isRunning = false
let isChannelCreated = false
let lastTitle = ''
let lastBody = ''
let operationChain: Promise<void> = Promise.resolve()

/**
 * Returns true if running natively on an Android device/emulator.
 */
export function isForegroundServiceSupported(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
}

async function ensureChannelAndPermission(): Promise<void> {
  if (!isChannelCreated) {
    try {
      await ForegroundService.createNotificationChannel({
        id: CHANNEL_ID,
        name: 'Pomodoro Timer',
        description: 'Laufender Countdown-Timer in der Statusleiste',
        importance: Importance.Low, // 2: LOW priority, no continuous vibration or sound
      })
      isChannelCreated = true
    } catch (e) {
      console.warn('[ForegroundTimer] Failed to create notification channel:', e)
    }
  }

  try {
    const perm = await ForegroundService.checkPermissions()
    if (perm.display !== 'granted') {
      await ForegroundService.requestPermissions()
    }
  } catch (e) {
    console.warn('[ForegroundTimer] Failed to request notification permission:', e)
  }
}

/**
 * Start or update the Android Foreground Service notification.
 * Uses Importance.Low (2) to update smoothly without alerting/vibrating repeatedly.
 */
export function updateForegroundTimer(title: string, body: string): Promise<void> {
  if (!isForegroundServiceSupported()) {
    return Promise.resolve()
  }

  // Deduplicate identical title and body updates
  if (isRunning && lastTitle === title && lastBody === body) {
    return Promise.resolve()
  }

  operationChain = operationChain
    .then(async () => {
      await ensureChannelAndPermission()

      const options = {
        id: NOTIFICATION_ID,
        title,
        body,
        smallIcon: SMALL_ICON,
        notificationChannelId: CHANNEL_ID,
        silent: true,
      }

      if (!isRunning) {
        await ForegroundService.startForegroundService(options)
        isRunning = true
      } else {
        try {
          await ForegroundService.updateForegroundService(options)
        } catch {
          // If update fails (e.g. service was killed), retry starting
          await ForegroundService.startForegroundService(options)
          isRunning = true
        }
      }

      lastTitle = title
      lastBody = body
    })
    .catch((err) => {
      console.warn('[ForegroundTimer] Failed to start/update foreground service:', err)
    })

  return operationChain
}

/**
 * Stop the Android Foreground Service and remove notification.
 */
export function stopForegroundTimer(): Promise<void> {
  if (!isForegroundServiceSupported()) {
    return Promise.resolve()
  }

  operationChain = operationChain
    .then(async () => {
      if (!isRunning) return
      try {
        await ForegroundService.stopForegroundService()
      } catch (err) {
        console.warn('[ForegroundTimer] Failed to stop foreground service:', err)
      } finally {
        isRunning = false
        lastTitle = ''
        lastBody = ''
      }
    })
    .catch((err) => {
      console.warn('[ForegroundTimer] Failed during stopForegroundTimer:', err)
    })

  return operationChain
}
