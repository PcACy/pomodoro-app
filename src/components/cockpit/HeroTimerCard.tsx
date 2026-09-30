import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { RotateCcw, SkipForward, Plus } from 'lucide-react'
import type { PhaseId, TimerMode, TimerStatus, TodoItem } from '../../types'
import { useTranslation } from '../../hooks/useTranslation'
import { useFlowTimerTick, useTimerTick } from '../../hooks/useTimerTick'
import { playMicroClick } from '../../lib/sound'
import { GlyphTimeDisplay } from './GlyphTimeDisplay'
import { HeroDotGridCanvas } from './HeroDotGridCanvas'
import { SlidingSegmentedControl, type SlidingSegmentOption } from '../SlidingSegmentedControl'

interface HeroTimerCardProps {
  phase?: PhaseId
  phaseLabel: string
  status: TimerStatus
  time?: string
  mode: TimerMode
  flowStatus: TimerStatus
  flowTime?: string
  completedFocusInCycle: number
  roundsBeforeLongBreak: number
  activeTodo?: TodoItem | null
  onModeChange: (m: TimerMode) => void
  onToggle: () => void
  onSkip: () => void
  onReset: () => void
  onAddTime?: (minutes: number) => void
  className?: string
}

const TOTAL_SEGMENTS = 28

// Module-level so the reference is stable across renders — an inline literal
// here would defeat the memo() on SlidingSegmentedControl.
const MODE_OPTIONS: readonly SlidingSegmentOption<'pomodoro' | 'flow'>[] = [
  { value: 'pomodoro', label: 'Pomo' },
  { value: 'flow', label: 'Flow' },
]

export const HeroTimerCard = memo(function HeroTimerCard({
  phase,
  phaseLabel,
  status,
  time,
  mode,
  flowStatus,
  flowTime,
  completedFocusInCycle,
  roundsBeforeLongBreak,
  activeTodo,
  onModeChange,
  onToggle,
  onSkip,
  onReset,
  onAddTime,
  className = '',
}: HeroTimerCardProps) {
  const { t, lang } = useTranslation()
  const timerTick = useTimerTick()
  const flowTick = useFlowTimerTick()

  // Local live clock for date display (minute precision is enough; refresh
  // on visibility return so the "NOW" label can't go stale in background tabs)
  const [localDate, setLocalDate] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setLocalDate(new Date()), 30_000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') setLocalDate(new Date())
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  const isFlow = mode === 'flow'
  const running = isFlow ? flowStatus === 'running' : status === 'running'
  // Always use the reactive tick while running so the display is not frozen by
  // the stale props: `flow.time` derives from the coarse flow state, which is
  // only published on start/pause/finish/reset and never on ticks, so preferring
  // it pinned the flow clock at its start value for the whole session.
  const activeTime = running ? timerTick.time : time || '25:00'
  const activeFlowTime = running ? flowTick.time : flowTime || '00:00'
  const activeProgress = isFlow ? 0 : timerTick.progress
  const shownLabel = isFlow ? t.timer.flow : phaseLabel
  const shownTime = isFlow ? activeFlowTime : activeTime
  const safeRounds =
    Number.isFinite(roundsBeforeLongBreak) && roundsBeforeLongBreak > 0
      ? Math.floor(roundsBeforeLongBreak)
      : 1

  // Mechanical Segmented Progress — fills additively from left to right
  const elapsedRatio = 1 - Math.min(1, Math.max(0, activeProgress))
  const filledSegments = Math.min(
    TOTAL_SEGMENTS,
    Math.max(0, Math.round(elapsedRatio * TOTAL_SEGMENTS)),
  )

  const flowParts = (activeFlowTime || '00:00').split(':').map(Number)
  let flowSeconds = 0
  if (flowParts.length === 3) {
    flowSeconds = (flowParts[0] || 0) * 3600 + (flowParts[1] || 0) * 60 + (flowParts[2] || 0)
  } else if (flowParts.length === 2) {
    flowSeconds = (flowParts[0] || 0) * 60 + (flowParts[1] || 0)
  }
  // Defensive: a malformed time string must not poison the progress bar
  // (NaN would render aria-valuenow={NaN} and an empty bar).
  if (!Number.isFinite(flowSeconds) || flowSeconds < 0) flowSeconds = 0
  // Benchmark 25 mins (= 1500 sec) for the full flow bar
  const flowRatio = Math.min(1, flowSeconds / 1500)
  const flowFilledSegments = Math.min(
    TOTAL_SEGMENTS,
    Math.max(0, Math.round(flowRatio * TOTAL_SEGMENTS)),
  )
  const barRatio = isFlow ? flowRatio : elapsedRatio
  const barFilled = isFlow ? flowFilledSegments : filledSegments

  const handleToggleClick = () => {
    playMicroClick(running ? 'tick' : 'pop')
    onToggle()
  }

  const handleResetClick = () => {
    playMicroClick('tap')
    onReset()
  }

  const handleSkipClick = () => {
    playMicroClick('toggle')
    onSkip()
  }

  const handleAddFive = () => {
    playMicroClick('tap')
    onAddTime?.(5)
  }

  const handleModeSelect = useCallback(
    (m: 'pomodoro' | 'flow') => {
      onModeChange(m)
    },
    [onModeChange],
  )

  const locale = lang === 'de' ? 'de-DE' : 'en-US'
  const { dayName, dateFormatted } = useMemo(
    () => ({
      dayName: localDate.toLocaleDateString(locale, { weekday: 'long' }),
      dateFormatted: localDate.toLocaleDateString(locale, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
    }),
    [localDate, locale],
  )

  const currentRoundIdx = completedFocusInCycle % safeRounds
  const roundText = isFlow
    ? running
      ? lang === 'de'
        ? 'Flow aktiv'
        : 'Flow active'
      : lang === 'de'
        ? 'Freier Flow'
        : 'Free flow'
    : phase === 'longBreak'
      ? lang === 'de'
        ? `Zyklus komplett · ${safeRounds}/${safeRounds}`
        : `Cycle complete · ${safeRounds}/${safeRounds}`
      : lang === 'de'
        ? `Runde ${currentRoundIdx + 1} von ${safeRounds}`
        : `Round ${currentRoundIdx + 1} of ${safeRounds}`

  return (
    <div
      className={`panel group relative flex min-h-0 flex-col overflow-hidden p-4 select-none sm:p-6 ${className}`}
    >
      {/* Interactive Dot-Matrix background (proximity ripple, hero only) */}
      <HeroDotGridCanvas />

      {/* ── Header: mode readout + mode selector ───────────────────────── */}
      <header className="relative z-10 mb-4 flex shrink-0 items-center justify-between gap-3 sm:mb-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden="true"
            className={`dot transition-colors duration-200 ${
              running ? 'bg-accent animate-pulse' : 'bg-fg/20'
            }`}
          />
          <span className="label text-fg/80">
            {isFlow ? 'FLOW' : 'POMODORO'}
          </span>
        </div>

        <SlidingSegmentedControl<'pomodoro' | 'flow'>
          options={MODE_OPTIONS}
          value={mode === 'flow' ? 'flow' : 'pomodoro'}
          onChange={handleModeSelect}
          size="sm"
          ariaLabel="Timer Mode"
        />
      </header>

      {/* ── Stage: glyph clock, centered and breathing ─────────────────── */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center gap-3 sm:gap-4">
        <GlyphTimeDisplay time={shownTime} className="min-h-[72px] flex-1" />

        {activeTodo ? (
          <div className="flex max-w-full items-center justify-center">
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-line bg-canvas/60 py-1 pl-2.5 pr-3">
              <span
                aria-hidden="true"
                className="dot bg-accent animate-pulse"
              />
              <span className="truncate text-xs font-medium leading-none text-fg">
                {activeTodo.title}
              </span>
              {activeTodo.tag ? (
                <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted">
                  #{activeTodo.tag}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="w-full max-w-md shrink-0">
          {/* 28-Segment Mechanical Progress */}
          <div
            className="flex h-2 w-full items-stretch gap-[2px]"
            role="progressbar"
            aria-label={shownLabel}
            aria-valuenow={Math.round(barRatio * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            {Array.from({ length: TOTAL_SEGMENTS }).map((_, i) => (
              <div
                key={i}
                className={`h-full flex-1 rounded-[1px] transition-colors duration-150 ${
                  i < barFilled
                    ? running
                      ? 'bg-accent'
                      : 'bg-fg'
                    : 'bg-fg/10'
                }`}
              />
            ))}
          </div>

          {/* Date · phase · cycle — one centered meta row */}
          <div className="mt-3 flex items-center justify-center gap-2 sm:gap-3">
            <span className="truncate text-xs text-muted">
              {dayName}, {dateFormatted}
            </span>
            <span aria-hidden="true" className="text-fg/20">
              ·
            </span>
            <span className="shrink-0 text-xs font-medium text-fg">{shownLabel}</span>
            <span aria-hidden="true" className="text-fg/20">
              ·
            </span>
            <span className="num shrink-0 text-[11px] tracking-wide text-muted">
              {roundText}
            </span>

            {!isFlow ? (
              <div
                className="ml-0.5 hidden shrink-0 items-center gap-1 sm:flex"
                title={roundText}
                aria-hidden="true"
              >
                {Array.from({ length: safeRounds }).map((_, rIdx) => {
                  const isLongBreak = phase === 'longBreak'
                  const isCompleted = isLongBreak ? true : rIdx < currentRoundIdx
                  const isCurrent = isLongBreak ? false : rIdx === currentRoundIdx
                  return (
                    <span
                      key={rIdx}
                      className={`h-1.5 w-1.5 rounded-full transition-colors ${
                        isCompleted
                          ? 'bg-fg/60'
                          : isCurrent
                            ? running
                              ? 'bg-accent animate-pulse'
                              : 'bg-accent'
                            : 'bg-fg/15'
                      }`}
                    />
                  )
                })}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── Transport ──────────────────────────────────────────────────── */}
      <footer className="relative z-10 mt-5 flex shrink-0 items-center gap-2.5 border-t border-line/60 pt-5 sm:mt-6 sm:gap-3">
        <button
          type="button"
          onClick={handleToggleClick}
          className={`h-12 min-h-[48px] flex-1 px-6 sm:flex-none sm:w-[220px] ${
            running ? 'btn-secondary' : 'btn-primary'
          }`}
        >
          {running ? t.timer.pause : t.timer.start}
        </button>

        {!isFlow && onAddTime ? (
          <button
            type="button"
            onClick={handleAddFive}
            title="+5 minutes"
            aria-label="Add 5 minutes"
            className="btn-secondary h-12 min-h-[48px] shrink-0 gap-1.5 px-3.5 sm:px-4"
          >
            <Plus size={13} />
            <span className="num text-[11px]">5m</span>
          </button>
        ) : null}

        <div className="ml-auto flex shrink-0 items-center gap-2.5">
          <button
            type="button"
            onClick={handleResetClick}
            title={t.shortcuts.reset}
            aria-label={t.shortcuts.reset}
            className="icon-btn"
          >
            <RotateCcw size={15} />
          </button>
          <button
            type="button"
            onClick={handleSkipClick}
            title={t.shortcuts.skip}
            aria-label={t.shortcuts.skip}
            className="icon-btn"
          >
            <SkipForward size={15} />
          </button>
        </div>
      </footer>
    </div>
  )
})
