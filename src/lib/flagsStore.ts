export const SOUND_KEY = 'pomodoro.sound'
export const AUTO_BREAKS_KEY = 'pomodoro.auto_breaks'
export const NOTIFY_KEY = 'pomodoro.notifications'

const FLAG_EVENT = 'pomodoro:flag-change'

export function readFlag(key: string, expectTrue: boolean): boolean {
  try {
    if (typeof localStorage === 'undefined') return !expectTrue
    const raw = localStorage.getItem(key)
    return expectTrue ? raw === 'true' : raw !== 'false'
  } catch {
    return !expectTrue
  }
}

export function writeFlag(key: string, value: boolean): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, String(value))
    }
  } catch {
    /* storage unavailable */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(FLAG_EVENT, { detail: { key, value } }))
  }
}

/**
 * Subscribes to flag changes across the same tab (via CustomEvent)
 * AND across multiple tabs (via storage event).
 */
export function subscribeFlags(callback: (key?: string) => void): () => void {
  if (typeof window === 'undefined') return () => {}

  const handleCustom = (e: Event) => {
    const custom = e as CustomEvent<{ key?: string }>
    callback(custom.detail?.key)
  }

  const handleStorage = (e: StorageEvent) => {
    if (e.key === SOUND_KEY || e.key === AUTO_BREAKS_KEY || e.key === NOTIFY_KEY) {
      callback(e.key)
    }
  }

  window.addEventListener(FLAG_EVENT, handleCustom)
  window.addEventListener('storage', handleStorage)

  return () => {
    window.removeEventListener(FLAG_EVENT, handleCustom)
    window.removeEventListener('storage', handleStorage)
  }
}

