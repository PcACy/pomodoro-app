import { useCallback, useEffect, useRef, useState } from 'react'
import type { TimerStatus } from '../types'
import { getTickerWorker } from '../lib/tickerWorker'
import { fmtElapsed } from '../lib/time'

export interface FlowStopResult {
  start: number
  end: number
  elapsedMs: number
}

export interface FlowTimerApi {
  status: TimerStatus
  elapsedMs: number
  time: string
  start: () => void
  pause: () => void
  toggle: () => void
  stop: () => FlowStopResult | null
  reset: () => void
}

/** Open-ended count-up stopwatch. `stop()` returns the measured interval and resets. */
export function useFlowTimer(): FlowTimerApi {
  const [status, setStatus] = useState<TimerStatus>('idle')
  const [elapsedMs, setElapsedMs] = useState(0)
  const statusRef = useRef(status)
  const elapsedRef = useRef(elapsedMs)
  const segStartRef = useRef<number | null>(null)
  const baseRef = useRef(0)

  useEffect(() => {
    statusRef.current = status
  }, [status])
  useEffect(() => {
    elapsedRef.current = elapsedMs
  }, [elapsedMs])

  const start = useCallback(() => {
    if (statusRef.current === 'running') return
    baseRef.current = elapsedRef.current
    segStartRef.current = Date.now()
    setStatus('running')
  }, [])

  const pause = useCallback(() => {
    if (statusRef.current !== 'running' || segStartRef.current == null) return
    setElapsedMs(baseRef.current + (Date.now() - segStartRef.current))
    segStartRef.current = null
    setStatus('paused')
  }, [])

  const toggle = useCallback(() => {
    if (statusRef.current === 'running') pause()
    else start()
  }, [start, pause])

  const stop = useCallback((): FlowStopResult | null => {
    const segStart = segStartRef.current
    const total = segStart != null ? baseRef.current + (Date.now() - segStart) : elapsedRef.current
    segStartRef.current = null
    setElapsedMs(0)
    setStatus('idle')
    if (total <= 0) return null
    const end = Date.now()
    return { start: end - total, end, elapsedMs: total }
  }, [])

  const reset = useCallback(() => {
    segStartRef.current = null
    baseRef.current = 0
    setElapsedMs(0)
    setStatus('idle')
  }, [])

  // Keep the shared worker running only while the flow timer runs.
  useEffect(() => {
    const w = getTickerWorker()
    w.postMessage({ type: status === 'running' ? 'start' : 'stop' })
  }, [status])

  // Count up on every tick while running. Idempotent: base + segment delta,
  // so elapsed grows 1:1 with wall-clock time instead of accumulating twice.
  useEffect(() => {
    const w = getTickerWorker()
    const handler = (e: MessageEvent) => {
      if (e.data && e.data.type === 'tick') {
        const now = e.data.now as number
        if (statusRef.current === 'running' && segStartRef.current != null) {
          setElapsedMs(baseRef.current + (now - segStartRef.current))
        }
      }
    }
    w.addEventListener('message', handler)
    return () => w.removeEventListener('message', handler)
  }, [])

  return { status, elapsedMs, time: fmtElapsed(elapsedMs), start, pause, toggle, stop, reset }
}