export interface TimerTickSnapshot {
  remainingMs: number
  time: string
  progress: number
}

export interface FlowTickSnapshot {
  elapsedMs: number
  time: string
}

type Listener = () => void

/**
 * Best-effort initial duration for first paint: the tick store starts at
 * 00:00 until useTimer's mount effect publishes the real phase duration,
 * which flashes "00:00" in the hero display, title and status bar on reload.
 * Reading the validated stored focus length keeps first paint correct.
 */
function initialRemainingMs(): number {
  const fallback = 25 * 60_000
  try {
    if (typeof localStorage === 'undefined') return fallback
    const raw = localStorage.getItem('pomodoro.settings')
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as { phases?: { focus?: unknown } } | null
    const focus = parsed?.phases?.focus
    if (typeof focus !== 'number' || !Number.isFinite(focus)) return fallback
    const clamped = Math.max(1, Math.min(180, Math.round(focus)))
    return clamped * 60_000
  } catch {
    return fallback
  }
}

function fmtInitial(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function initialTimerTickSnapshot(): TimerTickSnapshot {
  const remainingMs = initialRemainingMs()
  return { remainingMs, time: fmtInitial(remainingMs), progress: 1 }
}

let timerTickSnapshot: TimerTickSnapshot = initialTimerTickSnapshot()

let flowTickSnapshot: FlowTickSnapshot = {
  elapsedMs: 0,
  time: '00:00',
}

const timerListeners = new Set<Listener>()
const flowListeners = new Set<Listener>()

export function setTimerTickSnapshot(next: TimerTickSnapshot): void {
  if (
    timerTickSnapshot.remainingMs === next.remainingMs &&
    timerTickSnapshot.time === next.time &&
    timerTickSnapshot.progress === next.progress
  ) {
    return
  }
  timerTickSnapshot = next
  timerListeners.forEach((l) => l())
}

export function setFlowTickSnapshot(next: FlowTickSnapshot): void {
  if (
    flowTickSnapshot.elapsedMs === next.elapsedMs &&
    flowTickSnapshot.time === next.time
  ) {
    return
  }
  flowTickSnapshot = next
  flowListeners.forEach((l) => l())
}

export function getTimerTickSnapshot(): TimerTickSnapshot {
  return timerTickSnapshot
}

export function getFlowTickSnapshot(): FlowTickSnapshot {
  return flowTickSnapshot
}

export function subscribeTimerTick(listener: Listener): () => void {
  timerListeners.add(listener)
  return () => {
    timerListeners.delete(listener)
  }
}

export function subscribeFlowTick(listener: Listener): () => void {
  flowListeners.add(listener)
  return () => {
    flowListeners.delete(listener)
  }
}
