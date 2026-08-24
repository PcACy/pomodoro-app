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

let timerTickSnapshot: TimerTickSnapshot = {
  remainingMs: 0,
  time: '00:00',
  progress: 0,
}

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
