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

type BroadcastMessage =
  | { type: 'timer_state'; payload: TimerBroadcastPayload }
  | { type: 'session_recorded'; id: string; senderId: string }

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

  const handler = (e: MessageEvent<BroadcastMessage>) => {
    if (e.data && typeof e.data === 'object' && 'type' in e.data) {
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
  }

  ch.addEventListener('message', handler)
  return () => {
    ch.removeEventListener('message', handler)
  }
}
