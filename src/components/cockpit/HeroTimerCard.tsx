import { memo, useCallback, useEffect, useState } from 'react'
import { RotateCcw, SkipForward, Plus } from 'lucide-react'
import type { TimerMode, TimerStatus } from '../../types'
import { useTranslation } from '../../hooks/useTranslation'
import { useFlowTimerTick, useTimerTick } from '../../hooks/useTimerTick'
import { playMicroClick } from '../../lib/sound'
import { GlyphTimeDisplay } from './GlyphTimeDisplay'
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

  const handleToggleClick = useCallback(() => {
    playMicroClick(running ? 'tick' : 'pop')
    onToggle()
  }, [running, onToggle])

  const handleResetClick = useCallback(() => {
    playMicroClick('tap')
    onReset()
  }, [onReset])

  const handleSkipClick = useCallback(() => {
    playMicroClick('toggle')
    onSkip()
  }, [onSkip])

  const handleAddFive = useCallback(() => {
    playMicroClick('tap')
    onAddTime?.(5)
  }, [onAddTime])

  const locale = lang === 'de' ? 'de-DE' : 'en-US'
  const dayName = localDate.toLocaleDateString(locale, { weekday: 'long' })
  const dateFormatted = localDate.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()

  return (
    <div
      className={`relative overflow-hidden rounded-card bg-surface border border-line p-5 sm:p-6 lg:p-7 flex flex-col justify-between select-none ${className}`}
    >
      {/* Signature Nothing Dot-Matrix Canvas Grid - Subtle & non-distracting */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04] dark:opacity-[0.07] [background-image:radial-gradient(currentColor_1px,transparent_1px)] [background-size:14px_14px] text-fg"
        aria-hidden="true"
      />

      {/* Header Bar */}
      <div className="relative z-10 flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full transition-colors ${
              running ? 'bg-accent animate-pulse' : 'bg-line'
            }`}
          />
          <span className="font-mono text-[10px] sm:text-xs tracking-widest text-muted uppercase">
            POMODORO // INSTRUMENT
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
      <div className="relative z-10 flex-1 flex flex-col justify-center py-2 sm:py-3">
        {/* Glyph Dot-Matrix Clock with Red Status Dot */}
        <div className="my-1 flex justify-center">
          <GlyphTimeDisplay time={shownTime} isRunning={running} />
        </div>

        {/* Date & Phase Info */}
        <div className="mt-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex flex-col">
            <span className="font-sans font-medium text-base text-fg">
              {dayName}
            </span>
            <span className="font-mono text-xs text-muted tracking-wider uppercase">
              {dateFormatted}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-line bg-canvas text-fg font-mono text-xs uppercase tracking-wider">
              <span className={`h-1.5 w-1.5 rounded-full ${running ? 'bg-accent animate-pulse' : 'bg-muted'}`} />
              {shownLabel}
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted tracking-wider">
              <span>ROUND {(completedFocusInCycle % safeRounds) + 1} / {safeRounds}</span>
              <div className="flex items-center gap-1 ml-0.5" title={`Cycle: ${(completedFocusInCycle % safeRounds) + 1} of ${safeRounds}`}>
                {Array.from({ length: safeRounds }).map((_, rIdx) => {
                  const currentRoundIdx = completedFocusInCycle % safeRounds
                  const isCompleted = rIdx < currentRoundIdx
                  const isCurrent = rIdx === currentRoundIdx
                  return (
                    <span
                      key={rIdx}
                      className={`h-1.5 w-1.5 rounded-full transition-colors ${
                        isCompleted
                          ? 'bg-fg'
                          : isCurrent
                          ? running
                            ? 'bg-accent animate-pulse'
                            : 'bg-accent/80'
                          : 'border border-line bg-canvas'
                      }`}
                    />
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 20-Segment Mechanical Progress Bar */}
        <div
          className="mt-6 flex h-2 w-full gap-0.5"
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
                className={`flex-1 transition-colors duration-150 ${
                  isFilled
                    ? running
                      ? 'bg-accent'
                      : 'bg-fg'
                    : 'bg-line/40'
                }`}
              />
            )
          })}
        </div>
      </div>

      {/* Action Controls Bar */}
      <div className="relative z-10 mt-6 flex items-center justify-between gap-3 pt-4 border-t border-line/60">
        <div className="flex items-center gap-2">
          {/* Main Start / Pause Trigger */}
          <button
            type="button"
            onClick={handleToggleClick}
            className={`rounded-full px-6 sm:px-8 py-2.5 font-mono text-xs tracking-widest uppercase font-semibold transition-all active:scale-[0.98] cursor-pointer ${
              running
                ? 'bg-accent text-white hover:bg-accent/90'
                : 'bg-fg text-canvas hover:opacity-90'
            }`}
          >
            {running ? t.timer.pause : t.timer.start}
          </button>

          {/* Quick +5 Min Adder (when in pomodoro mode) */}
          {!isFlow && onAddTime && (
            <button
              type="button"
              onClick={handleAddFive}
              title="+5 minutes"
              className="rounded-full px-3 py-2 border border-line bg-canvas hover:border-fg/40 text-muted hover:text-fg font-mono text-[10px] tracking-wider uppercase transition-colors flex items-center gap-1 cursor-pointer"
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
            className="rounded-full p-2.5 border border-line bg-canvas hover:border-fg/40 text-muted hover:text-fg transition-colors cursor-pointer"
          >
            <RotateCcw size={14} />
          </button>
          <button
            type="button"
            onClick={handleSkipClick}
            title={t.shortcuts.skip}
            aria-label={t.shortcuts.skip}
            className="rounded-full p-2.5 border border-line bg-canvas hover:border-fg/40 text-muted hover:text-fg transition-colors cursor-pointer"
          >
            <SkipForward size={14} />
          </button>
        </div>
      </div>
    </div>
  )
})
