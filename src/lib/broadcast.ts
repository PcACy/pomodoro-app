import type { PhaseId, TimerStatus } from '../types'
import { uid } from './uid'

interface TimerBroadcastPayload {
  status: TimerStatus
  phase: PhaseId
  totalMs: number
  remainingMs: number
  targetEnd: number | null
  completedFocusInCycle: number
  phaseStartedAt?: number
  senderId: string
  seq: number
}

type BroadcastMessage = { type: 'timer_state'; payload: TimerBroadcastPayload }

const CHANNEL_NAME = 'pomau_sync_channel'
const TAB_INSTANCE_ID = uid().slice(0, 8)

// Monotonic per-tab sequence counter: when two tabs drive the timer at once,
// receivers apply last-writer-wins per sender instead of flapping between
// interleaved stale and fresh states.
let broadcastSeq = 0
// Last applied seq per sender tab; bounded below to avoid unbounded growth
// from short-lived tabs (e.g. repeatedly opened tabs/refresh cycles).
const lastSeqBySender = new Map<string, number>()

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

export function broadcastTimerState(state: Omit<TimerBroadcastPayload, 'senderId' | 'seq'>): void {
  try {
    broadcastSeq += 1
    const ch = getChannel()
    ch?.postMessage({
      type: 'timer_state',
      payload: { ...state, senderId: TAB_INSTANCE_ID, seq: broadcastSeq },
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
      (p.targetEnd === null || typeof p.targetEnd === 'number') &&
      (p.seq === undefined || typeof p.seq === 'number')
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
    // Drop stale/out-of-order states per sender: without this, two tabs
    // driving the timer at once flap between old and new states.
    // Messages without a seq (older app versions) are always applied.
    const seq = (data.payload as { seq?: unknown }).seq
    if (typeof sender === 'string' && typeof seq === 'number') {
      const last = lastSeqBySender.get(sender)
      if (last !== undefined && seq <= last) return
      lastSeqBySender.set(sender, seq)
      if (lastSeqBySender.size > 100) lastSeqBySender.clear()
    }
    callback(data)
  }

  ch.addEventListener('message', handler)
  return () => {
    ch.removeEventListener('message', handler)
  }
}
