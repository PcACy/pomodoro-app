import { useCallback, useEffect, useRef, useState } from 'react'
import type { PhaseId, Session, Settings, TimerState } from '../types'
import { MS_PER_MINUTE } from '../lib/time'
import { getTickerWorker } from '../lib/tickerWorker'
import { playChime, initAudio } from '../lib/sound'
import { notify } from '../lib/notify'
import { fmtTime } from '../lib/time'
import { getLang, translations } from '../lib/i18n'
import { useTranslation } from './useTranslation'

import { broadcastTimerState, subscribeBroadcast } from '../lib/broadcast'

interface Options {
  settings: Settings
  task: string
  tag: string
  onFocusComplete: (session: Omit<Session, 'id' | 'notes'>) => void
}

const phaseDuration = (settings: Settings, phase: PhaseId): number =>
  settings.phases[phase] * MS_PER_MINUTE

const initialMachine = (settings: Settings): TimerState => ({
  phase: 'focus',
  status: 'idle',
  remainingMs: phaseDuration(settings, 'focus'),
  totalMs: phaseDuration(settings, 'focus'),
  completedFocusInCycle: 0,
})

export function useTimer({ settings, task, tag, onFocusComplete }: Options) {
  const { t } = useTranslation()
  const [machine, setMachine] = useState<TimerState>(() => initialMachine(settings))

  const machineRef = useRef(machine)
  const settingsRef = useRef(settings)
  // Update refs synchronously during render to avoid stale closures
  machineRef.current = machine
  settingsRef.current = settings

  const cycleRef = useRef(0)
  const endRef = useRef<number | null>(null)
  const phaseStartedAtRef = useRef<number>(0)
  const taskRef = useRef(task)
  const tagRef = useRef(tag)
  const onFocusCompleteRef = useRef(onFocusComplete)
  taskRef.current = task
  tagRef.current = tag
  onFocusCompleteRef.current = onFocusComplete

  const finishCurrentPhase = useCallback((now: number, skipped = false) => {
    const m = machineRef.current
    const phases = settingsRef.current.phases
    const cycle = cycleRef.current

    let nextPhase: PhaseId
    let nextCycle = cycle

    if (m.phase === 'focus') {
      if (!skipped) {
        nextCycle = cycle + 1
        const durationMs = Math.max(phases.focus * MS_PER_MINUTE, m.totalMs)
        onFocusCompleteRef.current({
          start: phaseStartedAtRef.current,
          end: now,
          durationMs,
          task: taskRef.current,
          tag: tagRef.current,
          mode: 'pomodoro',
        })
        playChime('focus')
        const lang = getLang()
        const nn = translations[lang].notify
        notify(nn.focusDoneTitle, nn.focusDoneBody(nextCycle), [
          { action: 'start-break', title: nn.pauseStart },
          { action: 'add-5', title: nn.add5Min },
        ])
      }
      // Guard against invalid imported settings (0/NaN would make `nextCycle % r`
      // NaN and skip long breaks forever).
      const rounds = Math.max(1, Math.round(phases.roundsBeforeLongBreak) || 1)
      nextPhase = nextCycle % rounds === 0 ? 'longBreak' : 'shortBreak'
    } else {
      const isLong = m.phase === 'longBreak'
      nextPhase = 'focus'
      if (isLong) nextCycle = 0
      if (!skipped) {
        playChime('break')
        const lang = getLang()
        const nn = translations[lang].notify
        notify(nn.breakOverTitle, nn.breakOverBody, [
          { action: 'start-focus', title: nn.focusStart },
          { action: 'add-5', title: nn.add5Min },
        ])
      }
    }

    const d = phaseDuration(settingsRef.current, nextPhase)
    cycleRef.current = nextCycle
    phaseStartedAtRef.current = now
    endRef.current = now + d
    setMachine({
      phase: nextPhase,
      status: 'running',
      totalMs: d,
      remainingMs: d,
      completedFocusInCycle: nextCycle,
    })
    broadcastTimerState({
      status: 'running',
      phase: nextPhase,
      totalMs: d,
      remainingMs: d,
      targetEnd: now + d,
      completedFocusInCycle: nextCycle,
    })
  }, [])

  const handleTick = useCallback(
    (now: number) => {
      const end = endRef.current
      if (end == null) return
      const remaining = Math.max(0, end - now)
      if (remaining <= 0) {
        finishCurrentPhase(now)
      } else {
        setMachine((m) => (m.status === 'running' ? { ...m, remainingMs: remaining } : m))
      }
    },
    [finishCurrentPhase],
  )

  const start = useCallback(() => {
    const m = machineRef.current
    if (m.status === 'running') return
    initAudio()
    const now = Date.now()
    if (m.status === 'idle') phaseStartedAtRef.current = now
    const targetEnd = now + Math.max(0, m.remainingMs)
    endRef.current = targetEnd
    setMachine((prev) => (prev.status === 'running' ? prev : { ...prev, status: 'running' }))
    broadcastTimerState({
      status: 'running',
      phase: m.phase,
      totalMs: m.totalMs,
      remainingMs: m.remainingMs,
      targetEnd,
      completedFocusInCycle: m.completedFocusInCycle,
    })
  }, [])

  const pause = useCallback(() => {
    const m = machineRef.current
    if (m.status !== 'running') return
    const remaining = Math.max(0, (endRef.current ?? Date.now()) - Date.now())
    endRef.current = null
    setMachine((prev) => ({ ...prev, status: 'paused', remainingMs: remaining }))
    broadcastTimerState({
      status: 'paused',
      phase: m.phase,
      totalMs: m.totalMs,
      remainingMs: remaining,
      targetEnd: null,
      completedFocusInCycle: m.completedFocusInCycle,
    })
  }, [])

  const toggle = useCallback(() => {
    const m = machineRef.current
    if (m.status === 'running') pause()
    else start()
  }, [pause, start])

  const skip = useCallback(() => {
    const m = machineRef.current
    if (m.status === 'idle') return
    finishCurrentPhase(Date.now(), true)
  }, [finishCurrentPhase])

  const reset = useCallback(() => {
    endRef.current = null
    const m = machineRef.current
    setMachine((prev) => ({ ...prev, status: 'idle', remainingMs: prev.totalMs }))
    broadcastTimerState({
      status: 'idle',
      phase: m.phase,
      totalMs: m.totalMs,
      remainingMs: m.totalMs,
      targetEnd: null,
      completedFocusInCycle: m.completedFocusInCycle,
    })
  }, [])

  /** Extend the current phase (running or paused) by `ms`. */
  const addTime = useCallback((ms: number) => {
    const m = machineRef.current
    if (m.status === 'idle') return
    const safeMs = Math.max(0, ms)
    if (endRef.current != null) endRef.current += safeMs
    setMachine((prev) => ({
      ...prev,
      totalMs: prev.totalMs + safeMs,
      remainingMs: prev.remainingMs + safeMs,
    }))
    broadcastTimerState({
      status: m.status,
      phase: m.phase,
      totalMs: m.totalMs + safeMs,
      remainingMs: m.remainingMs + safeMs,
      targetEnd: endRef.current,
      completedFocusInCycle: m.completedFocusInCycle,
    })
  }, [])

  // Listen for multi-tab BroadcastChannel sync updates
  useEffect(() => {
    return subscribeBroadcast((msg) => {
      if (msg.type === 'timer_state') {
        const p = msg.payload
        endRef.current = p.targetEnd
        cycleRef.current = p.completedFocusInCycle
        setMachine({
          status: p.status,
          phase: p.phase,
          totalMs: p.totalMs,
          remainingMs: p.remainingMs,
          completedFocusInCycle: p.completedFocusInCycle,
        })
      }
    })
  }, [])

  // Keep the worker running only while the timer runs.
  useEffect(() => {
    const w = getTickerWorker()
    w.postMessage({ type: machine.status === 'running' ? 'start' : 'stop', id: 'timer' })
    return () => {
      w.postMessage({ type: 'stop', id: 'timer' })
    }
  }, [machine.status])

  // Listen to worker ticks exactly once.
  useEffect(() => {
    const w = getTickerWorker()
    const handler = (e: MessageEvent) => {
      if (e.data && e.data.type === 'tick') handleTick(e.data.now)
    }
    w.addEventListener('message', handler)
    return () => w.removeEventListener('message', handler)
  }, [handleTick])

  // Reconcile after the tab becomes visible again (mobile sleep / heavy throttling).
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') handleTick(Date.now())
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [handleTick])

  // When phase durations change and the timer is idle, apply the new duration.
  useEffect(() => {
    setMachine((prev) => {
      if (prev.status !== 'idle') return prev
      const d = phaseDuration(settings, prev.phase)
      if (d === prev.totalMs) return prev
      return { ...prev, totalMs: d, remainingMs: d }
    })
  }, [settings])

  const progress = machine.totalMs > 0 ? Math.max(0, Math.min(1, machine.remainingMs / machine.totalMs)) : 0
  const roundsBeforeLongBreak = settings.phases.roundsBeforeLongBreak

  return {
    phase: machine.phase,
    status: machine.status,
    remainingMs: machine.remainingMs,
    totalMs: machine.totalMs,
    completedFocusInCycle: machine.completedFocusInCycle,
    roundsBeforeLongBreak,
    progress,
    phaseLabel: t.phases[machine.phase],
    time: fmtTime(machine.remainingMs),
    start,
    pause,
    toggle,
    skip,
    reset,
    addTime,
  }
}