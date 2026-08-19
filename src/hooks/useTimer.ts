import { useCallback, useEffect, useRef, useState } from 'react'
import type { PhaseId, Settings, TimerState } from '../types'
import { MS_PER_MINUTE } from '../lib/time'
import { getTickerWorker } from '../lib/tickerWorker'
import { playChime, initAudio } from '../lib/sound'
import { notify } from '../lib/notify'
import { fmtTime } from '../lib/time'
import { getLang, translations } from '../lib/i18n'
import { useTranslation } from './useTranslation'

export interface FocusSessionData {
  start: number
  end: number
  durationMs: number
  task: string
  tag: string
}

interface Options {
  settings: Settings
  task: string
  tag: string
  onFocusComplete: (session: FocusSessionData) => void
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
  useEffect(() => {
    machineRef.current = machine
  }, [machine])

  const settingsRef = useRef(settings)
  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

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
        const durationMs = phases.focus * MS_PER_MINUTE
        onFocusCompleteRef.current({
          start: phaseStartedAtRef.current,
          end: now,
          durationMs,
          task: taskRef.current,
          tag: tagRef.current,
        })
        playChime('focus')
        const lang = getLang()
        const nn = translations[lang].notify
        notify(nn.focusDoneTitle, nn.focusDoneBody(nextCycle), [
          { action: 'start-break', title: nn.pauseStart },
          { action: 'add-5', title: nn.add5Min },
        ])
      }
      nextPhase = nextCycle % phases.roundsBeforeLongBreak === 0 ? 'longBreak' : 'shortBreak'
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
  }, [])

  const handleTick = useCallback(
    (now: number) => {
      const end = endRef.current
      if (end == null) return
      const remaining = end - now
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
    endRef.current = now + m.remainingMs
    setMachine((prev) => (prev.status === 'running' ? prev : { ...prev, status: 'running' }))
  }, [])

  const pause = useCallback(() => {
    const m = machineRef.current
    if (m.status !== 'running') return
    const remaining = Math.max(0, (endRef.current ?? Date.now()) - Date.now())
    endRef.current = null
    setMachine((prev) => ({ ...prev, status: 'paused', remainingMs: remaining }))
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
    setMachine((prev) => ({ ...prev, status: 'idle', remainingMs: prev.totalMs }))
  }, [])

  /** Extend the current phase (running or paused) by `ms`. */
  const addTime = useCallback((ms: number) => {
    const m = machineRef.current
    if (m.status === 'idle') return
    if (endRef.current != null) endRef.current += ms
    setMachine((prev) => ({ ...prev, remainingMs: prev.remainingMs + ms }))
  }, [])

  // Keep the worker running only while the timer runs.
  useEffect(() => {
    const w = getTickerWorker()
    w.postMessage({ type: machine.status === 'running' ? 'start' : 'stop' })
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

  const progress = machine.totalMs > 0 ? machine.remainingMs / machine.totalMs : 0
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