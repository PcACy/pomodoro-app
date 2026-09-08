import { memo, useCallback } from 'react'
import { PictureInPicture2 } from 'lucide-react'
import type { TimerStatus, TimerMode } from '../types'
import { useTranslation } from '../hooks/useTranslation'
import { playMicroClick } from '../lib/sound'
import { useFlowTimerTick, useTimerTick } from '../hooks/useTimerTick'

interface Props {
  phaseLabel: string
  status: TimerStatus
  time?: string
  progress?: number
  large?: boolean
  completedFocusInCycle: number
  roundsBeforeLongBreak: number
  mode: TimerMode
  flowStatus: TimerStatus
  flowTime?: string
  onModeChange: (m: TimerMode) => void
  onToggle: () => void
  onSkip: () => void
  onReset: () => void
  pipSupported: boolean
  pipOpen: boolean
  onPipToggle: () => void
  isZenMode?: boolean
  onToggleZen?: () => void
  borderless?: boolean
  task?: string
  tag?: string
}

const MODES: TimerMode[] = ['pomodoro', 'flow']
const TOTAL_SEGMENTS = 20

export const Timer = memo(function Timer({
  phaseLabel,
  status,
  time,
  progress,
  large = false,
  completedFocusInCycle,
  roundsBeforeLongBreak,
  mode,
  flowStatus,
  flowTime,
  onModeChange,
  onToggle,
  onSkip,
  onReset,
  pipSupported,
  pipOpen,
  onPipToggle,
  isZenMode = false,
  onToggleZen,
  borderless = false,
  task,
  tag,
}: Props) {
  const { t } = useTranslation()
  const timerTick = useTimerTick()
  const flowTick = useFlowTimerTick()

  const isFlow = mode === 'flow'
  const activeTime = time ?? (isFlow ? flowTick.time : timerTick.time)
  const activeProgress = progress ?? (isFlow ? 0 : timerTick.progress)
  const activeFlowTime = flowTime ?? flowTick.time

  const flowParts = (activeFlowTime || '00:00').split(':').map(Number)
  let flowSeconds = 0
  if (flowParts.length === 3) {
    flowSeconds = (flowParts[0] || 0) * 3600 + (flowParts[1] || 0) * 60 + (flowParts[2] || 0)
  } else if (flowParts.length === 2) {
    flowSeconds = (flowParts[0] || 0) * 60 + (flowParts[1] || 0)
  }
  const flowMinutes = Math.floor(flowSeconds / 60)

  const running = isFlow ? flowStatus === 'running' : status === 'running'
  const safeRounds = Number.isFinite(roundsBeforeLongBreak) && roundsBeforeLongBreak > 0
    ? Math.floor(roundsBeforeLongBreak)
    : 1
  const currentRoundIndex = completedFocusInCycle % safeRounds

  const shownLabel = isFlow ? t.timer.flow : phaseLabel
  const shownTime = isFlow ? activeFlowTime : activeTime

  // Mechanical Segmented Progress Calculation (20 discrete blocks, 2px gaps)
  const currentProgress = Math.min(1, Math.max(0, activeProgress))
  const filledSegments = Math.min(
    TOTAL_SEGMENTS,
    Math.max(0, Math.round(currentProgress * TOTAL_SEGMENTS)),
  )

  // Flow scanner position (sweeps across segments while running)
  const flowActiveIndex = flowSeconds % TOTAL_SEGMENTS

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

  return (
    <section
      className={`group relative flex w-full flex-col items-center justify-between select-none ${
        borderless
          ? 'max-w-xl gap-4 p-0 bg-transparent border-0 shadow-none'
          : 'card max-w-md 2xl:max-w-lg gap-4 p-6 sm:p-7'
      }`}
    >
      {/* Active Task / Tag Pill */}
      {task && (
        <div className="inline-flex max-w-full items-center gap-2 px-3 py-1 text-xs rounded-full border border-line bg-canvas text-fg font-mono">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
          <span className="max-w-[180px] sm:max-w-[280px] truncate font-medium leading-none">
            {task}
          </span>
          {tag && (
            <span className="shrink-0 px-2 py-0.5 text-[10px] font-mono tracking-wider uppercase rounded-full border border-line text-muted">
              #{tag}
            </span>
          )}
        </div>
      )}

      {/* Nothing Segmented Control: Timer Mode */}
      <div
        role="tablist"
        aria-label="Timer Modus"
        className="inline-flex items-center p-1 rounded-full border border-line bg-canvas font-mono text-xs select-none"
      >
        {MODES.map((m) => {
          const isSelected = mode === m
          return (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => onModeChange(m)}
              className={`px-4 py-1 rounded-full uppercase tracking-wider text-[11px] font-bold transition-colors cursor-pointer ${
                isSelected ? 'bg-fg text-canvas' : 'text-muted hover:text-fg'
              }`}
            >
              {m}
            </button>
          )
        })}
      </div>

      {/* Nothing Hardware Widget Display */}
      <div className="flex flex-col items-center justify-between w-full my-1 text-center select-none">
        {/* Top Phase Header with Status Dot */}
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-muted">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              running ? 'bg-accent animate-pulse' : 'bg-muted/40'
            }`}
          />
          <span>
            {isFlow
              ? `FLOW // ${running ? 'ACTIVE' : flowStatus === 'paused' ? 'PAUSED' : 'READY'}`
              : `POMODORO // ${shownLabel}`}
          </span>
        </div>

        {/* Hero Time in Doto Dot-Matrix Font */}
        <span
          className={`font-display font-medium tabular-nums leading-none tracking-tight text-fg my-4 ${
            large ? 'text-7xl sm:text-8xl' : 'text-6xl sm:text-7xl'
          }`}
        >
          {shownTime}
        </span>

        {/* Sub-Metadata: Round Indicator or Flow Milestones */}
        <div className="h-5 flex items-center justify-center font-mono text-[11px] text-muted tracking-wider uppercase mb-3">
          {isFlow ? (
            <div className="flex items-center gap-2">
              {[25, 50, 75].map((m) => {
                const reached = flowMinutes >= m
                return (
                  <span
                    key={m}
                    className={reached ? 'text-fg font-bold' : 'text-muted/60'}
                  >
                    {reached ? '●' : '○'} {m}M
                  </span>
                )
              })}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span>
                ROUND {String(currentRoundIndex + 1).padStart(2, '0')} / {String(safeRounds).padStart(2, '0')}
              </span>
              <span className="text-muted/40">·</span>
              <span className="text-fg font-bold tabular-nums">
                {Math.round(currentProgress * 100)}%
              </span>
            </div>
          )}
        </div>

        {/* Mechanical Segmented Progress Bar (Discrete Rectangular Blocks) */}
        <div
          role="progressbar"
          aria-valuenow={Math.round(currentProgress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={shownLabel}
          className="flex items-center w-full h-2.5 gap-[2px] px-1 py-0.5 rounded-sm bg-canvas border border-line/60"
        >
          {Array.from({ length: TOTAL_SEGMENTS }).map((_, idx) => {
            let isFilled = false
            let isHighlight = false

            if (isFlow) {
              if (running) {
                isFilled = idx <= flowActiveIndex
                isHighlight = idx === flowActiveIndex
              } else if (flowStatus === 'paused') {
                isFilled = idx % 2 === 0
              }
            } else {
              isFilled = idx < filledSegments
            }

            return (
              <div
                key={idx}
                className={`flex-1 h-full rounded-none transition-colors duration-150 ${
                  isHighlight
                    ? 'bg-accent'
                    : isFilled
                      ? 'bg-fg'
                      : 'bg-surface-raised/40'
                }`}
              />
            )
          })}
        </div>
      </div>

      {/* Action Buttons: Nothing Pill Buttons (999px radius, Space Mono ALL CAPS) */}
      <div className="grid grid-cols-3 gap-2.5 w-full font-mono select-none mt-1">
        <button
          type="button"
          onClick={handleResetClick}
          title={isFlow ? `${t.flow.discard} (R)` : `${t.shortcuts.reset} (R)`}
          aria-label={isFlow ? t.flow.discard : t.shortcuts.reset}
          className="btn-secondary w-full py-2.5 px-3 text-xs font-bold tracking-wider uppercase active:scale-95"
        >
          RESET
        </button>

        <button
          type="button"
          onClick={handleToggleClick}
          title={running ? t.timer.pause : t.timer.start}
          aria-label={running ? t.timer.pause : t.timer.start}
          className="btn-primary w-full py-2.5 px-3 text-xs font-bold tracking-wider uppercase active:scale-95"
        >
          {running ? 'PAUSE' : 'START'}
        </button>

        <button
          type="button"
          onClick={handleSkipClick}
          title={isFlow ? `${t.flow.finish} (F)` : `${t.shortcuts.skip} (N)`}
          aria-label={isFlow ? t.flow.finish : t.shortcuts.skip}
          className="btn-secondary w-full py-2.5 px-3 text-xs font-bold tracking-wider uppercase active:scale-95"
        >
          {isFlow ? 'FINISH' : 'SKIP'}
        </button>
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div
        className={`flex items-center justify-center gap-2 text-[10px] text-muted font-mono tracking-wider uppercase mt-1 select-none transition-opacity duration-200 [@media(hover:none)]:hidden ${
          running ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
      >
        <span>SPACE: START/PAUSE</span>
        <span className="text-muted/40">·</span>
        <span>R: RESET</span>
        <span className="text-muted/40">·</span>
        <span>{isFlow ? 'F: FINISH' : 'N: SKIP'}</span>
        <span className="text-muted/40">·</span>
        <button
          type="button"
          onClick={onToggleZen}
          title={isZenMode ? t.zen.exitHint : t.zen.enterHint}
          aria-label={isZenMode ? t.zen.exitHint : t.zen.enterHint}
          className="hover:text-fg transition-colors cursor-pointer"
        >
          Z: ZEN
        </button>
      </div>

      {/* PiP Button */}
      {pipSupported && (
        <div className="group/pip absolute bottom-3 right-3 z-10">
          <button
            type="button"
            onClick={onPipToggle}
            aria-label={pipOpen ? t.pip.close : t.pip.open}
            className={`rounded-full p-2 border transition-all duration-200 ${
              pipOpen
                ? 'border-accent bg-accent/15 text-accent opacity-100'
                : 'border-line text-muted opacity-60 hover:opacity-100 hover:text-fg hover:border-fg'
            }`}
          >
            <PictureInPicture2 size={15} />
          </button>
          <span
            role="tooltip"
            className="pointer-events-none absolute bottom-full right-0 mb-2 whitespace-nowrap rounded-sm border border-line bg-surface px-2 py-1 font-mono text-[10px] uppercase text-fg opacity-0 transition-opacity duration-150 group-hover/pip:opacity-100"
          >
            {pipOpen ? t.pip.close : t.pip.open}
          </span>
        </div>
      )}
    </section>
  )
})
