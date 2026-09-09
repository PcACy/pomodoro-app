import { memo, useEffect, useState } from 'react'
import { RotateCcw, SkipForward, Plus } from 'lucide-react'
import type { TimerMode, TimerStatus } from '../../types'
import { useTranslation } from '../../hooks/useTranslation'
import { useFlowTimerTick, useTimerTick } from '../../hooks/useTimerTick'
import { playMicroClick } from '../../lib/sound'
import { GlyphTimeDisplay } from './GlyphTimeDisplay'
import { HeroDotGridCanvas } from './HeroDotGridCanvas'
import { SlidingSegmentedControl } from '../SlidingSegmentedControl'

interface HeroTimerCardProps {
  phaseLabel: string
  status: TimerStatus
  time?: string
  progress?: number
  mode: TimerMode
  flowStatus: TimerStatus
  flowTime?: string
  completedFocusInCycle: number
  roundsBeforeLongBreak: number
  onModeChange: (m: TimerMode) => void
  onToggle: () => void
  onSkip: () => void
  onReset: () => void
  onAddTime?: (minutes: number) => void
  className?: string
}

const TOTAL_SEGMENTS = 20

export const HeroTimerCard = memo(function HeroTimerCard({
  phaseLabel,
  status,
  time,
  progress,
  mode,
  flowStatus,
  flowTime,
  completedFocusInCycle,
  roundsBeforeLongBreak,
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
  // Always use reactive timer tick so countdown runs smoothly without being frozen by stale props
  const activeTime = isFlow ? (flowTime ?? flowTick.time) : (timerTick.time || time || '25:00')
  const activeProgress = isFlow ? 0 : (timerTick.progress ?? progress ?? 1)
  const activeFlowTime = flowTime ?? flowTick.time

  const running = isFlow ? flowStatus === 'running' : status === 'running'
  const shownLabel = isFlow ? t.timer.flow : phaseLabel
  const shownTime = isFlow ? activeFlowTime : activeTime
  const safeRounds = Number.isFinite(roundsBeforeLongBreak) && roundsBeforeLongBreak > 0
    ? Math.floor(roundsBeforeLongBreak)
    : 1

  // Mechanical Segmented Progress (20 discrete blocks, 2px gap)
  // Fills additively from left to right (0% -> 100%)
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
  // Benchmark 25 mins (= 1500 sec) for full 20-block flow bar (1 block every 75 sec)
  const flowRatio = Math.min(1, flowSeconds / 1500)
  const flowFilledSegments = Math.min(
    TOTAL_SEGMENTS,
    Math.max(0, Math.round(flowRatio * TOTAL_SEGMENTS)),
  )

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

  const locale = lang === 'de' ? 'de-DE' : 'en-US'
  const dayName = localDate.toLocaleDateString(locale, { weekday: 'long' })
  const dateFormatted = localDate.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()

  return (
    <div
      className={`relative overflow-hidden rounded-card bg-surface border border-line p-4 sm:p-5 flex flex-col justify-between select-none ${className}`}
    >
      {/* Interactive Dot-Matrix background (proximity ripple, hero only) */}
      <HeroDotGridCanvas />

      {/* Header Bar */}
      <div className="relative z-10 flex h-7 items-center justify-between gap-2 mb-2 shrink-0">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full shrink-0 transition-colors ${
              running ? 'bg-accent animate-pulse' : 'bg-line'
            }`}
          />
          <span className="font-mono text-[10px] sm:text-xs tracking-widest text-muted uppercase">
            {isFlow ? 'FLOW' : 'POMODORO'}
          </span>
        </div>

        {/* Mode Selector Pill (Pomodoro / Flow) */}
        <SlidingSegmentedControl<'pomodoro' | 'flow'>
          options={[
            { value: 'pomodoro', label: 'Pomo' },
            { value: 'flow', label: 'Flow' },
          ]}
          value={mode === 'flow' ? 'flow' : 'pomodoro'}
          onChange={(newMode) => onModeChange(newMode)}
          size="sm"
          ariaLabel="Timer Mode"
        />
      </div>

      {/* Hero Glyph Display */}
      <div className="relative z-10 flex-1 flex flex-col justify-center py-1 sm:py-1.5">
        {/* Glyph Dot-Matrix Clock */}
        <div className="my-0.5 flex justify-center">
          <GlyphTimeDisplay time={shownTime} />
        </div>

        {/* Date & Phase Info */}
        <div className="mt-2 flex min-h-[36px] items-center justify-between gap-4 flex-wrap shrink-0">
          <div className="flex flex-col">
            <span className="font-sans font-medium text-sm sm:text-base text-fg leading-snug">
              {dayName}
            </span>
            <span className="font-mono text-[11px] text-muted tracking-wider uppercase">
              {dateFormatted}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isFlow ? (
              <div className="inline-flex min-w-[110px] items-center font-mono text-xs tracking-wider uppercase text-fg">
                <span>{running ? 'FLOW ACTIVE' : 'FREE FLOW'}</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 font-mono text-xs tracking-wider uppercase">
                <span className="text-fg font-medium">{shownLabel}</span>
                <span className="text-muted/40">·</span>
                <span className="text-muted text-[10px] sm:text-xs">
                  ROUND {(completedFocusInCycle % safeRounds) + 1} / {safeRounds}
                </span>
                <div className="flex items-center gap-1 ml-0.5" title={`Cycle: ${(completedFocusInCycle % safeRounds) + 1} of ${safeRounds}`}>
                  {Array.from({ length: safeRounds }).map((_, rIdx) => {
                    const currentRoundIdx = completedFocusInCycle % safeRounds
                    // Same semantics as Timer.tsx: only completed rounds are
                    // filled; the current round gets its own pulsing style so
                    // done vs. active are distinguishable.
                    const isCompleted = rIdx < currentRoundIdx
                    const isCurrent = rIdx === currentRoundIdx
                    return (
                      <span
                        key={rIdx}
                        className={`h-1.5 w-1.5 rounded-full transition-colors ${
                          isCompleted
                            ? 'bg-fg'
                            : isCurrent
                              ? 'bg-accent'
                              : 'border border-line bg-canvas'
                        }`}
                      />
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 20-Segment Mechanical Progress Bar */}
        <div
          className="mt-3 flex h-2.5 w-full items-center gap-0.5 shrink-0"
          role="progressbar"
          aria-valuenow={Math.round((isFlow ? flowRatio : elapsedRatio) * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          {Array.from({ length: TOTAL_SEGMENTS }).map((_, i) => {
            const isFilled = isFlow ? i < flowFilledSegments : i < filledSegments
            return (
              <div
                key={i}
                className={`flex-1 h-1.5 rounded-full transition-colors duration-150 ${
                  isFilled ? 'bg-fg' : 'bg-line/40'
                }`}
              />
            )
          })}
        </div>
      </div>

      {/* Action Controls Bar */}
      <div className="relative z-10 mt-3 flex items-center justify-between gap-3 pt-3 border-t border-line/60 shrink-0">
        <div className="flex items-center gap-2">
          {/* Main Start / Pause Trigger */}
          <button
            type="button"
            onClick={handleToggleClick}
            className="h-10 w-[180px] sm:w-[200px] inline-flex items-center justify-center rounded-full border border-fg px-4 sm:px-6 font-mono text-xs leading-none tracking-widest uppercase font-semibold transition-colors cursor-pointer bg-fg text-canvas hover:opacity-90 active:opacity-80 shrink-0"
          >
            {running ? t.timer.pause : t.timer.start}
          </button>

          {/* Quick +5 Min Adder (when in pomodoro mode) */}
          {!isFlow && onAddTime && (
            <button
              type="button"
              onClick={handleAddFive}
              title="+5 minutes"
              className="h-10 rounded-full px-3 border border-line bg-canvas hover:border-fg/40 text-muted hover:text-fg font-mono text-[10px] tracking-wider uppercase transition-colors inline-flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Plus size={11} />
              5M
            </button>
          )}
        </div>

        {/* Secondary Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetClick}
            title={t.shortcuts.reset}
            aria-label={t.shortcuts.reset}
            className="h-10 w-10 flex items-center justify-center shrink-0 rounded-full border border-line bg-canvas hover:border-fg/40 text-muted hover:text-fg transition-colors cursor-pointer"
          >
            <RotateCcw size={13} />
          </button>
          <button
            type="button"
            onClick={handleSkipClick}
            title={t.shortcuts.skip}
            aria-label={t.shortcuts.skip}
            className="h-10 w-10 flex items-center justify-center shrink-0 rounded-full border border-line bg-canvas hover:border-fg/40 text-muted hover:text-fg transition-colors cursor-pointer"
          >
            <SkipForward size={13} />
          </button>
        </div>
      </div>
    </div>
  )
})
