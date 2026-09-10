import { Capacitor, registerPlugin } from '@capacitor/core'

export interface StartTimerOptions {
  title: string
  content?: string
  targetTime: number
  isCountDown?: boolean
}

export interface TimerForegroundPlugin {
  startTimer(options: {
    title: string
    content?: string
    targetTime?: number
    remainingSeconds?: number
    isCountDown?: boolean
  }): Promise<void>
  stopTimer(): Promise<void>
  checkPermissions?(): Promise<{ notifications: string }>
  requestPermissions?(): Promise<{ notifications: string }>
}

export const TimerForeground = registerPlugin<TimerForegroundPlugin>('TimerForeground')

let isRunning = false
let operationChain: Promise<void> = Promise.resolve()

/**
 * Returns true if running natively on an Android device/emulator.
 */
export function isForegroundServiceSupported(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
}

async function ensurePermission(): Promise<void> {
  try {
    if (TimerForeground.checkPermissions && TimerForeground.requestPermissions) {
      const perm = await TimerForeground.checkPermissions()
      if (perm.notifications !== 'granted') {
        await TimerForeground.requestPermissions()
      }
    }
  } catch (e) {
    console.warn('[ForegroundTimer] Permission check/request error:', e)
  }
}

/**
 * Start or update the native Android Foreground Service with Chronometer Countdown.
 * Targets the status bar capsule (e.g. Xiaomi HyperOS Focus Notification / Dynamic Island).
 */
export function startForegroundTimer(options: StartTimerOptions): Promise<void> {
  if (!isForegroundServiceSupported()) {
    return Promise.resolve()
  }

  operationChain = operationChain
    .then(async () => {
      await ensurePermission()
      await TimerForeground.startTimer({
        title: options.title,
        content: options.content,
        targetTime: options.targetTime,
        isCountDown: options.isCountDown ?? true,
      })
      isRunning = true
    })
    .catch((err) => {
      console.warn('[ForegroundTimer] Failed to start foreground timer:', err)
    })

  return operationChain
}

/**
 * Stop the native Android Foreground Service and dismiss the notification/capsule.
 */
export function stopForegroundTimer(): Promise<void> {
  if (!isForegroundServiceSupported()) {
    return Promise.resolve()
  }

  operationChain = operationChain
    .then(async () => {
      if (!isRunning) return
      try {
        await TimerForeground.stopTimer()
      } catch (err) {
        console.warn('[ForegroundTimer] Failed to stop foreground timer:', err)
      } finally {
        isRunning = false
      }
    })
    .catch((err) => {
      console.warn('[ForegroundTimer] Failed during stopForegroundTimer:', err)
    })

  return operationChain
}

/**
 * Backward-compatible helper for simple title/body updates.
 */
export function updateForegroundTimer(title: string, body?: string): Promise<void> {
  if (!isForegroundServiceSupported()) {
    return Promise.resolve()
  }
  return startForegroundTimer({
    title,
    content: body,
    targetTime: Date.now(),
    isCountDown: true,
  })
}
