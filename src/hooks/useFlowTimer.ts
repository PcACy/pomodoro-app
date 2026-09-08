import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { Session, TimerStatus } from '../types'
import { getTickerWorker } from '../lib/tickerWorker'
import { fmtFlowTime } from '../lib/time'
import { getFlowTickSnapshot, setFlowTickSnapshot, subscribeFlowTick } from '../lib/timerStore'

const MIN_FLOW_SESSION_MS = 60_000

interface FlowTimerApi {
  status: TimerStatus
  elapsedMs: number
  time: string
  toggle: () => void
  finishSession: () => void
  resetTimer: () => void
}

interface FlowTimerOptions {
  task: string
  tag: string
  onFinish: (session: Omit<Session, 'id' | 'notes'>) => void
}

/** Open-ended count-up stopwatch. `finishSession()` logs the interval, `resetTimer()` discards it. */
export function useFlowTimer({ task, tag, onFinish }: FlowTimerOptions): FlowTimerApi {
  const [status, setStatus] = useState<TimerStatus>('idle')
  const statusRef = useRef(status)
  const elapsedRef = useRef(0)
  const segStartRef = useRef<number | null>(null)
  const baseRef = useRef(0)
  // Wall-clock moment of the last pause: finishing while paused must attribute
  // the session end to the pause (when work actually stopped), not to the
  // much later finish click.
  const pausedAtRef = useRef<number | null>(null)
  const taskRef = useRef(task)
  const tagRef = useRef(tag)
  const onFinishRef = useRef(onFinish)
  statusRef.current = status
  taskRef.current = task
  tagRef.current = tag
  onFinishRef.current = onFinish

  // Initialize flow tick snapshot
  useEffect(() => {
    setFlowTickSnapshot({
      elapsedMs: 0,
      time: '00:00',
    })
  }, [])

  const start = useCallback(() => {
    if (statusRef.current === 'running') return
    baseRef.current = elapsedRef.current
    segStartRef.current = Date.now()
    pausedAtRef.current = null
    setFlowTickSnapshot({
      elapsedMs: elapsedRef.current,
      time: fmtFlowTime(elapsedRef.current),
    })
    // Sync the ref immediately: setStatus re-renders async, so a second
    // toggle in the same tick would otherwise read the stale status.
    statusRef.current = 'running'
    setStatus('running')
  }, [])

  const pause = useCallback(() => {
    if (statusRef.current !== 'running' || segStartRef.current == null) return
    const now = Date.now()
    const delta = Math.max(0, now - segStartRef.current)
    const total = baseRef.current + delta
    elapsedRef.current = total
    baseRef.current = total
    segStartRef.current = null
    pausedAtRef.current = now
    setFlowTickSnapshot({
      elapsedMs: total,
      time: fmtFlowTime(total),
    })
    statusRef.current = 'paused'
    setStatus('paused')
  }, [])

  const toggle = useCallback(() => {
    if (statusRef.current === 'running') pause()
    else start()
  }, [start, pause])

  /** Capture the current elapsed time, save the session (>= 1 min) and reset to ready. */
  const finishSession = useCallback(() => {
    const segStart = segStartRef.current
    const total = segStart != null ? baseRef.current + Math.max(0, Date.now() - segStart) : elapsedRef.current
    // When finishing from pause, the work ended at the pause moment, not now.
    const end = segStart != null ? Date.now() : (pausedAtRef.current ?? Date.now())
    segStartRef.current = null
    baseRef.current = 0
    elapsedRef.current = 0
    pausedAtRef.current = null
    setFlowTickSnapshot({
      elapsedMs: 0,
      time: '00:00',
    })
    statusRef.current = 'idle'
    setStatus('idle')
    if (total < MIN_FLOW_SESSION_MS) return
    onFinishRef.current({
      start: end - total,
      end,
      durationMs: total,
      task: taskRef.current,
      tag: tagRef.current,
      mode: 'flow',
    })
  }, [])

  /** Discard an accidentally started session without saving anything. */
  const resetTimer = useCallback(() => {
    segStartRef.current = null
    baseRef.current = 0
    elapsedRef.current = 0
    pausedAtRef.current = null
    setFlowTickSnapshot({
      elapsedMs: 0,
      time: '00:00',
    })
    statusRef.current = 'idle'
    setStatus('idle')
  }, [])

  // Keep the shared worker running only while the flow timer runs.
  useEffect(() => {
    const w = getTickerWorker()
    w.postMessage({ type: status === 'running' ? 'start' : 'stop', id: 'flow' })
    return () => {
      w.postMessage({ type: 'stop', id: 'flow' })
    }
  }, [status])

  // Reconcile elapsed time when tab becomes visible again or gains focus.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && statusRef.current === 'running' && segStartRef.current != null) {
        const delta = Math.max(0, Date.now() - segStartRef.current)
        const total = baseRef.current + delta
        elapsedRef.current = total
        setFlowTickSnapshot({
          elapsedMs: total,
          time: fmtFlowTime(total),
        })
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', onVisibility)
    }
  }, [])

  // Count up on every tick while running.
  useEffect(() => {
    const w = getTickerWorker()
    const handler = (e: MessageEvent) => {
      if (e.data && e.data.type === 'tick') {
        const now = e.data.now as number
        if (statusRef.current === 'running' && segStartRef.current != null) {
          const delta = Math.max(0, now - segStartRef.current)
          const total = baseRef.current + delta
          elapsedRef.current = total
          setFlowTickSnapshot({
            elapsedMs: total,
            time: fmtFlowTime(total),
          })
        }
      }
    }
    w.addEventListener('message', handler)
    return () => w.removeEventListener('message', handler)
  }, [])

  // The tick store is the live source of truth while counting: reading
  // elapsedRef during render would freeze `elapsedMs`/`time` at the value from
  // the last status change, since ticks never re-render this hook.
  const liveFlow = useSyncExternalStore(subscribeFlowTick, getFlowTickSnapshot)
  const liveElapsed = status === 'idle' ? 0 : liveFlow.elapsedMs

  return {
    status,
    elapsedMs: liveElapsed,
    time: fmtFlowTime(liveElapsed),
    toggle,
    finishSession,
    resetTimer,
  }
}