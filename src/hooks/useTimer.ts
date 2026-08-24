import { useCallback, useEffect, useRef, useState } from 'react'
import type { PhaseId, Session, Settings, TimerStatus } from '../types'
import { MS_PER_MINUTE } from '../lib/time'
import { getTickerWorker } from '../lib/tickerWorker'
import { playChime, initAudio } from '../lib/sound'
import { notify } from '../lib/notify'
import { fmtTime } from '../lib/time'
import { getLang, translations } from '../lib/i18n'
import { useTranslation } from './useTranslation'
import { broadcastTimerState, subscribeBroadcast } from '../lib/broadcast'
import { setTimerTickSnapshot } from '../lib/timerStore'

interface Options {
  settings: Settings
  task: string
  tag: string
  onFocusComplete: (session: Omit<Session, 'id' | 'notes'>) => void
}

interface CoarseTimerState {
  phase: PhaseId
  status: TimerStatus
  totalMs: number
  completedFocusInCycle: number
}

const phaseDuration = (settings: Settings, phase: PhaseId): number =>
  settings.phases[phase] * MS_PER_MINUTE

const initialMachine = (settings: Settings): CoarseTimerState => ({
  phase: 'focus',
  status: 'idle',
  totalMs: phaseDuration(settings, 'focus'),
  completedFocusInCycle: 0,
})

export function useTimer({ settings, task, tag, onFocusComplete }: Options) {
  const { t } = useTranslation()
  const [machine, setMachine] = useState<CoarseTimerState>(() => initialMachine(settings))

  const machineRef = useRef(machine)
  const settingsRef = useRef(settings)
  machineRef.current = machine
  settingsRef.current = settings

  const initialDuration = phaseDuration(settings, 'focus')
  const remainingMsRef = useRef<number>(initialDuration)
  const totalMsRef = useRef<number>(initialDuration)

  const cycleRef = useRef(0)
  const endRef = useRef<number | null>(null)
  const phaseStartedAtRef = useRef<number>(0)
  const taskRef = useRef(task)
  const tagRef = useRef(tag)
  const onFocusCompleteRef = useRef(onFocusComplete)
  taskRef.current = task
  tagRef.current = tag
  onFocusCompleteRef.current = onFocusComplete

  // Initialize initial tick snapshot
  useEffect(() => {
    const d = phaseDuration(settingsRef.current, machineRef.current.phase)
    remainingMsRef.current = d
    totalMsRef.current = d
    setTimerTickSnapshot({
      remainingMs: d,
      time: fmtTime(d),
      progress: 1,
    })
  }, [])

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
        const sessionStart =
          phaseStartedAtRef.current > 0 ? phaseStartedAtRef.current : Math.max(0, now - durationMs)
        onFocusCompleteRef.current({
          start: sessionStart,
          end: now,
          durationMs,
          task: taskRef.current,
          tag: tagRef.current,
          mode: 'pomodoro',
        })
        try {
          playChime('focus')
        } catch {
          /* audio failure non-fatal */
        }
        try {
          const lang = getLang()
          const nn = translations[lang].notify
          notify(nn.focusDoneTitle, nn.focusDoneBody(nextCycle), [
            { action: 'start-break', title: nn.pauseStart },
            { action: 'add-5', title: nn.add5Min },
          ])
        } catch {
          /* notification failure non-fatal */
        }
      }
      const rounds = Math.max(1, Math.round(phases.roundsBeforeLongBreak) || 1)
      nextPhase = nextCycle % rounds === 0 ? 'longBreak' : 'shortBreak'
    } else {
      const isLong = m.phase === 'longBreak'
      nextPhase = 'focus'
      if (isLong) nextCycle = 0
      if (!skipped) {
        try {
          playChime('break')
        } catch {
          /* audio failure non-fatal */
        }
        try {
          const lang = getLang()
          const nn = translations[lang].notify
          notify(nn.breakOverTitle, nn.breakOverBody, [
            { action: 'start-focus', title: nn.focusStart },
            { action: 'add-5', title: nn.add5Min },
          ])
        } catch {
          /* notification failure non-fatal */
        }
      }
    }

    const d = phaseDuration(settingsRef.current, nextPhase)
    cycleRef.current = nextCycle
    phaseStartedAtRef.current = now
    endRef.current = now + d
    remainingMsRef.current = d
    totalMsRef.current = d

    setTimerTickSnapshot({
      remainingMs: d,
      time: fmtTime(d),
      progress: 1,
    })

    setMachine({
      phase: nextPhase,
      status: 'running',
      totalMs: d,
      completedFocusInCycle: nextCycle,
    })

    broadcastTimerState({
      status: 'running',
      phase: nextPhase,
      totalMs: d,
      remainingMs: d,
      targetEnd: now + d,
      completedFocusInCycle: nextCycle,
      phaseStartedAt: now,
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
        remainingMsRef.current = remaining
        const total = totalMsRef.current
        setTimerTickSnapshot({
          remainingMs: remaining,
          time: fmtTime(remaining),
          progress: total > 0 ? remaining / total : 0,
        })
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
    const targetEnd = now + Math.max(0, remainingMsRef.current)
    endRef.current = targetEnd

    const total = totalMsRef.current
    setTimerTickSnapshot({
      remainingMs: remainingMsRef.current,
      time: fmtTime(remainingMsRef.current),
      progress: total > 0 ? remainingMsRef.current / total : 0,
    })

    setMachine((prev) => (prev.status === 'running' ? prev : { ...prev, status: 'running' }))
    broadcastTimerState({
      status: 'running',
      phase: m.phase,
      totalMs: total,
      remainingMs: remainingMsRef.current,
      targetEnd,
      completedFocusInCycle: m.completedFocusInCycle,
      phaseStartedAt: phaseStartedAtRef.current,
    })
  }, [])

  const pause = useCallback(() => {
    const m = machineRef.current
    if (m.status !== 'running') return
    const remaining = Math.max(0, (endRef.current ?? Date.now()) - Date.now())
    endRef.current = null
    remainingMsRef.current = remaining

    const total = totalMsRef.current
    setTimerTickSnapshot({
      remainingMs: remaining,
      time: fmtTime(remaining),
      progress: total > 0 ? remaining / total : 0,
    })

    setMachine((prev) => ({ ...prev, status: 'paused' }))
    broadcastTimerState({
      status: 'paused',
      phase: m.phase,
      totalMs: total,
      remainingMs: remaining,
      targetEnd: null,
      completedFocusInCycle: m.completedFocusInCycle,
      phaseStartedAt: phaseStartedAtRef.current,
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
    phaseStartedAtRef.current = 0
    const m = machineRef.current
    const total = m.totalMs
    remainingMsRef.current = total
    totalMsRef.current = total

    setTimerTickSnapshot({
      remainingMs: total,
      time: fmtTime(total),
      progress: 1,
    })

    setMachine((prev) => ({ ...prev, status: 'idle' }))
    broadcastTimerState({
      status: 'idle',
      phase: m.phase,
      totalMs: total,
      remainingMs: total,
      targetEnd: null,
      completedFocusInCycle: m.completedFocusInCycle,
      phaseStartedAt: 0,
    })
  }, [])

  /** Extend the current phase (running or paused) by `ms`. */
  const addTime = useCallback((ms: number) => {
    const m = machineRef.current
    if (m.status === 'idle') return
    const safeMs = Math.max(0, ms)
    if (endRef.current != null) endRef.current += safeMs
    totalMsRef.current += safeMs
    remainingMsRef.current += safeMs

    const total = totalMsRef.current
    const rem = remainingMsRef.current

    setTimerTickSnapshot({
      remainingMs: rem,
      time: fmtTime(rem),
      progress: total > 0 ? rem / total : 0,
    })

    setMachine((prev) => ({
      ...prev,
      totalMs: prev.totalMs + safeMs,
    }))

    broadcastTimerState({
      status: m.status,
      phase: m.phase,
      totalMs: total,
      remainingMs: rem,
      targetEnd: endRef.current,
      completedFocusInCycle: m.completedFocusInCycle,
      phaseStartedAt: phaseStartedAtRef.current,
    })
  }, [])

  // Listen for multi-tab BroadcastChannel sync updates
  useEffect(() => {
    return subscribeBroadcast((msg) => {
      if (msg.type === 'timer_state') {
        const p = msg.payload
        endRef.current = p.targetEnd
        cycleRef.current = p.completedFocusInCycle
        remainingMsRef.current = p.remainingMs
        totalMsRef.current = p.totalMs

        setTimerTickSnapshot({
          remainingMs: p.remainingMs,
          time: fmtTime(p.remainingMs),
          progress: p.totalMs > 0 ? p.remainingMs / p.totalMs : 0,
        })

        if (p.phaseStartedAt != null) {
          phaseStartedAtRef.current = p.phaseStartedAt
        }
        setMachine({
          status: p.status,
          phase: p.phase,
          totalMs: p.totalMs,
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

  // Reconcile after the tab becomes visible again or gains window focus.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') handleTick(Date.now())
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', onVisibility)
    }
  }, [handleTick])

  // When phase durations change and the timer is idle, apply the new duration.
  useEffect(() => {
    setMachine((prev) => {
      if (prev.status !== 'idle') return prev
      const d = phaseDuration(settings, prev.phase)
      if (d === prev.totalMs) return prev
      totalMsRef.current = d
      remainingMsRef.current = d
      setTimerTickSnapshot({
        remainingMs: d,
        time: fmtTime(d),
        progress: 1,
      })
      return { ...prev, totalMs: d }
    })
  }, [settings])

  const roundsBeforeLongBreak = settings.phases.roundsBeforeLongBreak
  const curRem = remainingMsRef.current
  const curTot = machine.totalMs

  return {
    phase: machine.phase,
    status: machine.status,
    remainingMs: curRem,
    totalMs: curTot,
    completedFocusInCycle: machine.completedFocusInCycle,
    roundsBeforeLongBreak,
    progress: curTot > 0 ? Math.max(0, Math.min(1, curRem / curTot)) : 0,
    phaseLabel: t.phases[machine.phase],
    time: fmtTime(curRem),
    start,
    pause,
    toggle,
    skip,
    reset,
    addTime,
  }
}