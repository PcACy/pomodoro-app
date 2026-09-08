import type { PhaseId, TimerStatus } from '../types'

interface TimerBroadcastPayload {
  status: TimerStatus
  phase: PhaseId
  totalMs: number
  remainingMs: number
  targetEnd: number | null
  completedFocusInCycle: number
  phaseStartedAt?: number
  senderId: string
}

type BroadcastMessage = { type: 'timer_state'; payload: TimerBroadcastPayload }

const CHANNEL_NAME = 'pomau_sync_channel'
const TAB_INSTANCE_ID = Math.random().toString(36).slice(2, 9)

let channel: BroadcastChannel | null = null

function getChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return null
  if (!channel) {
    try {
      channel = new BroadcastChannel(CHANNEL_NAME)
    } catch {
      channel = null
    }
  }
  return channel
}

export function broadcastTimerState(state: Omit<TimerBroadcastPayload, 'senderId'>): void {
  try {
    const ch = getChannel()
    ch?.postMessage({
      type: 'timer_state',
      payload: { ...state, senderId: TAB_INSTANCE_ID },
    } satisfies BroadcastMessage)
  } catch {
    /* ignore */
  }
}

export function subscribeBroadcast(callback: (msg: BroadcastMessage) => void): () => void {
  const ch = getChannel()
  if (!ch) return () => {}

  // Strict shape check: the channel is shared per origin, so any object with
  // a `type` key (other libs, devtools) must not reach the timer consumer,
  // which reads payload fields unconditionally.
  const isTimerState = (d: unknown): d is BroadcastMessage => {
    if (!d || typeof d !== 'object') return false
    const m = d as Record<string, unknown>
    if (m.type !== 'timer_state') return false
    const p = m.payload as Record<string, unknown> | null | undefined
    return (
      !!p &&
      typeof p.remainingMs === 'number' &&
      typeof p.totalMs === 'number' &&
      typeof p.phase === 'string' &&
      typeof p.status === 'string' &&
      typeof p.completedFocusInCycle === 'number' &&
      (p.targetEnd === null || typeof p.targetEnd === 'number')
    )
  }

  const handler = (e: MessageEvent<BroadcastMessage>) => {
    if (!isTimerState(e.data)) return
    const data = e.data
    const sender =
      'payload' in data && data.payload && typeof data.payload === 'object'
        ? (data.payload as { senderId?: string }).senderId
        : 'senderId' in data
          ? (data as { senderId?: string }).senderId
          : null

    if (sender === TAB_INSTANCE_ID) {
      return // Ignore own messages
    }
    callback(data)
  }

  ch.addEventListener('message', handler)
  return () => {
    ch.removeEventListener('message', handler)
  }
}
