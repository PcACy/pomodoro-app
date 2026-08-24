import { useCallback, useEffect, useRef, useState } from 'react'
import type { Session, TimerStatus } from '../types'
import { getTickerWorker } from '../lib/tickerWorker'
import { fmtFlowTime } from '../lib/time'
import { setFlowTickSnapshot } from '../lib/timerStore'

const MIN_FLOW_SESSION_MS = 60_000

interface FlowTimerApi {
  status: TimerStatus
  elapsedMs: number
  time: string
  start: () => void
  pause: () => void
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
    setFlowTickSnapshot({
      elapsedMs: elapsedRef.current,
      time: fmtFlowTime(elapsedRef.current),
    })
    setStatus('running')
  }, [])

  const pause = useCallback(() => {
    if (statusRef.current !== 'running' || segStartRef.current == null) return
    const delta = Math.max(0, Date.now() - segStartRef.current)
    const total = baseRef.current + delta
    elapsedRef.current = total
    baseRef.current = total
    segStartRef.current = null
    setFlowTickSnapshot({
      elapsedMs: total,
      time: fmtFlowTime(total),
    })
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
    segStartRef.current = null
    baseRef.current = 0
    elapsedRef.current = 0
    setFlowTickSnapshot({
      elapsedMs: 0,
      time: '00:00',
    })
    setStatus('idle')
    if (total < MIN_FLOW_SESSION_MS) return
    const end = Date.now()
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
    setFlowTickSnapshot({
      elapsedMs: 0,
      time: '00:00',
    })
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

  const curElapsed = elapsedRef.current

  return {
    status,
    elapsedMs: curElapsed,
    time: fmtFlowTime(curElapsed),
    start,
    pause,
    toggle,
    finishSession,
    resetTimer,
  }
}