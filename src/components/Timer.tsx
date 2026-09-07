import { memo, useCallback } from 'react'
import { PictureInPicture2 } from 'lucide-react'
import type { TimerStatus, PhaseId, TimerMode } from '../types'
import type { ThemeId } from '../themes'
import { useTranslation } from '../hooks/useTranslation'
import { playMicroClick } from '../lib/sound'
import { useFlowTimerTick, useTimerTick } from '../hooks/useTimerTick'

interface Props {
  themeId?: ThemeId
  phase?: PhaseId
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

const WAVE_FRAMES = [
  '[ ───==█==─── ]',
  '[ ────==█==── ]',
  '[ ─────==█==─ ]',
  '[ ──────==█== ]',
  '[ ─────==█==─ ]',
  '[ ────==█==── ]',
  '[ ───==█==─── ]',
  '[ ──==█==──── ]',
  '[ ─==█==───── ]',
  '[ ==█==────── ]',
  '[ ─==█==───── ]',
  '[ ──==█==──── ]',
]
const FLOW_BAR_PAUSED = '[ ──███████── ]'

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

  // Pomodoro ASCII progress bar (deterministic countdown)
  const totalBlocks = 18
  const currentProgress = Math.min(1, Math.max(0, activeProgress))
  const filledBlocks = Math.min(totalBlocks, Math.max(0, Math.round(currentProgress * totalBlocks)))
  const emptyBlocks = totalBlocks - filledBlocks
  const asciiBar = `[${'█'.repeat(filledBlocks)}${'░'.repeat(emptyBlocks)}] ${Math.round(currentProgress * 100)}%`

  // Flow ASCII status activity scanner
  const animPos = flowSeconds % WAVE_FRAMES.length
  const flowAsciiBar =
    flowStatus === 'running'
      ? WAVE_FRAMES[animPos]
      : flowStatus === 'paused'
        ? FLOW_BAR_PAUSED
        : `[ ${'─'.repeat(11)} ]`

  const running = isFlow ? flowStatus === 'running' : status === 'running'
  const paused = isFlow ? flowStatus === 'paused' : status === 'paused'
  const currentRoundIndex = completedFocusInCycle % roundsBeforeLongBreak

  const shownLabel = isFlow ? t.timer.flow : phaseLabel
  const shownTime = isFlow ? activeFlowTime : activeTime

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
      className={`group relative flex w-full flex-col items-center justify-between transition-[background-color,border-color,box-shadow,border-radius,opacity] duration-300 ${
        borderless
          ? 'max-w-xl gap-4 p-0 bg-transparent border-0 shadow-none'
          : 'card border border-outline-variant/15 dark:border-white/[0.05] max-w-md 2xl:max-w-lg gap-3 sm:gap-4 p-5 sm:p-6'
      }`}
    >
      {task && (
        <div className="inline-flex max-w-full items-center gap-2 px-3.5 py-1.5 text-xs shadow-sm transition-all duration-300 rounded-badge border border-line/70 bg-surface/80 text-fg font-mono">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
          <span className="max-w-[180px] sm:max-w-[280px] truncate font-medium leading-none">
            {task}
          </span>
          {tag && (
            <span className="shrink-0 px-1.5 py-0.5 text-[11px] font-medium leading-none rounded-badge border border-tag-border bg-tag-bg text-tag-text">
              #{tag}
            </span>
          )}
        </div>
      )}

      <div className="flex w-full flex-col items-center">
        {/* TUI Mode Switcher */}
        <div
          role="tablist"
          aria-label="Timer Modus"
          className="flex items-center justify-center gap-2 font-mono text-xs font-bold select-none"
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
                className={`px-3 py-1.5 border transition-colors cursor-pointer uppercase whitespace-nowrap shrink-0 ${
                  isSelected
                    ? 'border-accent bg-accent text-on-accent font-bold'
                    : 'border-line text-muted hover:border-fg hover:text-fg bg-surface'
                }`}
              >
                &lt;&nbsp;{isSelected ? `[${m.toUpperCase()}]` : m.toUpperCase()}&nbsp;&gt;
              </button>
            )
          })}
        </div>
      </div>

      {/* TUI Terminal Box with Identical Height & Symmetric Geometry in Both Modes */}
      <div className="flex flex-col items-center justify-between p-6 sm:p-7 border-2 border-line bg-canvas font-mono w-full max-w-sm min-h-[260px] mx-auto text-center select-none shadow-none my-2">
        {/* Row 1: Top Border with Mode / Phase Label */}
        <div className="text-xs font-bold text-accent uppercase tracking-widest flex items-center gap-2">
          <span className="text-line">┌──</span>
          <span>
            [&nbsp;{isFlow ? (running ? 'FLOW: ACTIVE' : paused ? 'FLOW: PAUSED' : 'FLOW: IDLE') : `POMODORO: ${shownLabel.toUpperCase()}`}&nbsp;]
          </span>
          <span className="text-line">──┐</span>
        </div>

        {/* Row 2: Giant Digits */}
        <span
          className={`font-mono font-bold tabular-nums leading-none tracking-tight text-fg my-1 ${
            large ? 'text-6xl sm:text-7xl' : 'text-5xl sm:text-6xl'
          }`}
        >
          {shownTime}
        </span>

        {/* Row 3: Slot 1 (Meta-Information / Milestones) */}
        <div className="h-[20px] flex items-center justify-center font-mono text-[11px] text-muted select-none">
          {isFlow ? (
            <div className="flex items-center justify-center gap-1.5">
              <span>[</span>
              {[25, 50, 75].map((m, idx) => {
                const reached = flowMinutes >= m
                return (
                  <span key={m} className="flex items-center">
                    <span className={reached ? 'text-accent font-bold' : 'text-muted'}>
                      {reached ? '★' : '☆'} {m}m
                    </span>
                    {idx < 2 && <span className="text-muted/60 mx-1">·</span>}
                  </span>
                )
              })}
              <span>]</span>
            </div>
          ) : (
            <span>[ ROUND: {currentRoundIndex + 1}/{roundsBeforeLongBreak} ]</span>
          )}
        </div>

        {/* Row 4: Slot 2 (Progress / Activity) */}
        <div className="flex items-center justify-center w-full font-mono text-xs select-none h-5 my-1">
          {isFlow ? (
            <span
              className={`tracking-wider tabular-nums ${
                running
                  ? 'text-primary'
                  : paused
                    ? 'text-accent/50 animate-pulse'
                    : 'text-text-muted/40'
              }`}
            >
              {flowAsciiBar}
            </span>
          ) : (
            <span className="font-bold text-accent tracking-wider">{asciiBar}</span>
          )}
        </div>

        {/* Row 5: Bottom Border */}
        <div className="text-xs text-muted flex items-center justify-center font-mono">
          <span className="text-line">└───────────────────────────────┘</span>
        </div>
      </div>

      {/* TUI 3-Column Action Buttons */}
      <div className="grid grid-cols-3 gap-2 w-full max-w-sm mx-auto font-mono select-none">
        <button
          type="button"
          onClick={handleResetClick}
          title={isFlow ? `${t.flow.discard} (R)` : `${t.shortcuts.reset} (R)`}
          aria-label={isFlow ? t.flow.discard : t.shortcuts.reset}
          className="tui-btn w-full whitespace-nowrap px-2 py-2 text-xs font-bold border border-line bg-surface text-fg hover:border-accent hover:text-accent transition-colors uppercase cursor-pointer active:scale-95 text-center justify-center"
        >
          [&nbsp;RESET&nbsp;]
        </button>

        <button
          type="button"
          onClick={handleToggleClick}
          className="tui-btn w-full whitespace-nowrap px-2 py-2 text-xs font-bold border border-accent bg-accent text-on-accent hover:opacity-90 transition-opacity uppercase cursor-pointer active:scale-95 text-center justify-center shadow-none"
          title={running ? t.timer.pause : t.timer.start}
          aria-label={running ? t.timer.pause : t.timer.start}
        >
          {running ? '[❚❚\u00A0PAUSE]' : '[▶\u00A0START]'}
        </button>

        {isFlow ? (
          <button
            type="button"
            onClick={handleSkipClick}
            title={`${t.flow.finish} (F)`}
            aria-label={t.flow.finish}
            className="tui-btn w-full whitespace-nowrap px-2 py-2 text-xs font-bold border border-line bg-surface text-fg hover:border-accent hover:text-accent transition-colors uppercase cursor-pointer active:scale-95 text-center justify-center"
          >
            [&nbsp;FINISH&nbsp;]
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSkipClick}
            title={`${t.shortcuts.skip} (N)`}
            aria-label={t.shortcuts.skip}
            className="tui-btn w-full whitespace-nowrap px-2 py-2 text-xs font-bold border border-line bg-surface text-fg hover:border-accent hover:text-accent transition-colors uppercase cursor-pointer active:scale-95 text-center justify-center"
          >
            [&nbsp;SKIP&nbsp;]
          </button>
        )}
      </div>

      {/* Keyboard shortcuts row */}
      <div
        className={`flex items-center justify-center gap-1.5 sm:gap-2.5 text-[11px] sm:text-xs text-text-muted mt-2 sm:mt-3 w-full flex-nowrap select-none transition-opacity duration-200 [@media(hover:none)]:hidden ${
          running ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
      >
        <span className="inline-flex items-center gap-1 whitespace-nowrap shrink-0">
          <kbd className="inline-flex items-center justify-center px-1.5 py-0.5 min-w-[20px] rounded text-[10px] font-mono font-medium shrink-0 border border-line bg-surface text-fg">Space</kbd>
          <span className="text-[10px] sm:text-[11px] font-mono opacity-80">Start/Pause</span>
        </span>
        <span className="text-text-muted/40 mx-0.5 shrink-0">·</span>
        {isFlow ? (
          <>
            <span className="inline-flex items-center gap-1 whitespace-nowrap shrink-0">
              <kbd className="inline-flex items-center justify-center px-1.5 py-0.5 min-w-[20px] rounded text-[10px] font-mono font-medium shrink-0 border border-line bg-surface text-fg">R</kbd>
              <span className="text-[10px] sm:text-[11px] font-mono opacity-80">Discard</span>
            </span>
            <span className="text-text-muted/40 mx-0.5 shrink-0">·</span>
            <span className="inline-flex items-center gap-1 whitespace-nowrap shrink-0">
              <kbd className="inline-flex items-center justify-center px-1.5 py-0.5 min-w-[20px] rounded text-[10px] font-mono font-medium shrink-0 border border-line bg-surface text-fg">F</kbd>
              <span className="text-[10px] sm:text-[11px] font-mono opacity-80">Finish</span>
            </span>
          </>
        ) : (
          <>
            <span className="inline-flex items-center gap-1 whitespace-nowrap shrink-0">
              <kbd className="inline-flex items-center justify-center px-1.5 py-0.5 min-w-[20px] rounded text-[10px] font-mono font-medium shrink-0 border border-line bg-surface text-fg">R</kbd>
              <span className="text-[10px] sm:text-[11px] font-mono opacity-80">Reset</span>
            </span>
            <span className="text-text-muted/40 mx-0.5 shrink-0">·</span>
            <span className="inline-flex items-center gap-1 whitespace-nowrap shrink-0">
              <kbd className="inline-flex items-center justify-center px-1.5 py-0.5 min-w-[20px] rounded text-[10px] font-mono font-medium shrink-0 border border-line bg-surface text-fg">N</kbd>
              <span className="text-[10px] sm:text-[11px] font-mono opacity-80">Skip</span>
            </span>
          </>
        )}
        <span className="text-text-muted/40 mx-0.5 shrink-0">·</span>
        <button
          type="button"
          onClick={onToggleZen}
          title={isZenMode ? t.zen.exitHint : t.zen.enterHint}
          aria-label={isZenMode ? t.zen.exitHint : t.zen.enterHint}
          className="inline-flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors hover:text-fg cursor-pointer"
        >
          <kbd className="inline-flex items-center justify-center px-1.5 py-0.5 min-w-[20px] rounded text-[10px] font-mono font-medium shrink-0 border border-line bg-surface text-fg">Z</kbd>
          <span className="text-[10px] sm:text-[11px] font-mono opacity-80">Zen</span>
        </button>
      </div>

      {pipSupported && (
        <div className="group/pip absolute bottom-3 right-3 z-10 sm:bottom-4 sm:right-4">
          <button
            type="button"
            onClick={onPipToggle}
            aria-label={pipOpen ? t.pip.close : t.pip.open}
            className={`rounded-lg p-2 transition-all duration-200 ${
              pipOpen
                ? 'bg-accent/15 text-accent opacity-100'
                : 'text-muted opacity-0 hover:bg-raised/50 hover:text-fg focus:opacity-100 group-hover:opacity-100'
            }`}
          >
            <PictureInPicture2 size={16} />
          </button>
          <span
            role="tooltip"
            className="pointer-events-none absolute bottom-full right-0 mb-2 whitespace-nowrap rounded-md border border-line bg-raised px-2 py-1 text-xs font-normal text-fg opacity-0 shadow-lg transition-opacity duration-150 group-hover/pip:opacity-100"
          >
            {pipOpen ? t.pip.close : t.pip.open}
          </span>
        </div>
      )}
    </section>
  )
})
