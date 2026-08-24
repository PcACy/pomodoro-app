import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { Check, Pause, PictureInPicture2, Play, RotateCcw, SkipForward } from 'lucide-react'
import type { TimerStatus, PhaseId, TimerMode } from '../types'
import type { ThemeId } from '../themes'
import { useTranslation } from '../hooks/useTranslation'
import { CatLogo } from './CatLogo'
import { playMicroClick } from '../lib/sound'

interface Props {
  themeId?: ThemeId
  phase: PhaseId
  phaseLabel: string
  status: TimerStatus
  time: string
  progress: number
  large?: boolean
  completedFocusInCycle: number
  roundsBeforeLongBreak: number
  mode: TimerMode
  flowStatus: TimerStatus
  flowTime: string
  durationMinutes?: number
  onDurationChange?: (minutes: number) => void
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

const PHASE_TEXT: Record<PhaseId, string> = {
  focus: 'text-accent',
  shortBreak: 'text-break',
  longBreak: 'text-long',
}

const RING: Record<PhaseId, string> = {
  focus: 'stroke-accent',
  shortBreak: 'stroke-break',
  longBreak: 'stroke-long',
}

const GLOW_VAR: Record<PhaseId, string> = {
  focus: '--c-accent',
  shortBreak: '--c-break',
  longBreak: '--c-long',
}

const MODES: TimerMode[] = ['pomodoro', 'flow']

const FLOW_BARS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
// Pre-computed continuous harmonic phase offsets (negative delays)
// Ensures the animation is already in continuous motion instantly without initial jumping
const FLOW_DELAYS = [
  '-0.00s',
  '-0.25s',
  '-0.50s',
  '-0.75s',
  '-1.00s',
  '-1.25s',
  '-1.00s',
  '-0.75s',
  '-0.50s',
  '-0.25s',
  '-0.00s',
]

/** 11-bar organic equalizer waveform for flow mode (GPU-composited). */
function Waveform({ status }: { status: TimerStatus }) {
  return (
    <div className="my-2.5 flex h-8 items-center justify-center gap-1.5 select-none" aria-hidden="true">
      {FLOW_BARS.map((i) => (
        <span
          key={i}
          className={`flow-bar ${
            status === 'running'
              ? 'flow-bar--running bg-accent'
              : status === 'paused'
                ? 'flow-bar--paused bg-accent/70'
                : 'flow-bar--idle bg-accent/30'
          }`}
          style={status === 'running' ? { animationDelay: FLOW_DELAYS[i] } : undefined}
        />
      ))}
    </div>
  )
}

export const Timer = memo(function Timer({
  themeId,
  phase,
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
  durationMinutes = 25,
  onDurationChange,
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
  const isFlow = mode === 'flow'
  const isIdle = status === 'idle'
  const isTui = themeId === 'gruvbox'

  // Parse flow elapsed time for seconds & milestone calculations
  const flowParts = (flowTime || '00:00').split(':').map(Number)
  let flowSeconds = 0
  if (flowParts.length === 3) {
    flowSeconds = (flowParts[0] || 0) * 3600 + (flowParts[1] || 0) * 60 + (flowParts[2] || 0)
  } else if (flowParts.length === 2) {
    flowSeconds = (flowParts[0] || 0) * 60 + (flowParts[1] || 0)
  }
  const flowMinutes = Math.floor(flowSeconds / 60)

  // Pomodoro ASCII progress bar (deterministic countdown)
  const totalBlocks = 18
  const currentProgress = Math.min(1, Math.max(0, progress))
  const filledBlocks = Math.min(totalBlocks, Math.max(0, Math.round(currentProgress * totalBlocks)))
  const emptyBlocks = totalBlocks - filledBlocks
  const asciiBar = `[${'█'.repeat(filledBlocks)}${'░'.repeat(emptyBlocks)}] ${Math.round(currentProgress * 100)}%`

  // Flow ASCII status activity scanner
  const waveFrames = [
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
  const animPos = flowSeconds % waveFrames.length
  const flowAsciiStatus =
    flowStatus === 'running'
      ? `${waveFrames[animPos]} TRACKING`
      : flowStatus === 'paused'
        ? '[ ── PAUSED ── ]'
        : '[ ─────────── ] IDLE'
  const running = isFlow ? flowStatus === 'running' : status === 'running'
  const paused = isFlow ? flowStatus === 'paused' : status === 'paused'
  const currentRoundIndex = completedFocusInCycle % roundsBeforeLongBreak

  const ringRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const [scrubbingMinutes, setScrubbingMinutes] = useState<number | null>(null)
  const isScrubbing = scrubbingMinutes != null

  // Completion relief impulse: a short, well-proportioned spring scale
  // (1 -> 1.02 -> 1) whenever the timer reaches 00:00 and advances the phase.
  const [pulseActive, setPulseActive] = useState(false)
  const prevPhaseRef = useRef(phase)
  const prevCycleRef = useRef(completedFocusInCycle)
  const pulseTimerRef = useRef<number | null>(null)
  useEffect(() => {
    const phaseChanged = prevPhaseRef.current !== phase
    const cycleChanged = prevCycleRef.current !== completedFocusInCycle
    prevPhaseRef.current = phase
    prevCycleRef.current = completedFocusInCycle
    if (!phaseChanged && !cycleChanged) return
    setPulseActive(false)
    // Re-trigger on the next frame so back-to-back completions replay cleanly.
    const raf = requestAnimationFrame(() => setPulseActive(true))
    if (pulseTimerRef.current != null) window.clearTimeout(pulseTimerRef.current)
    pulseTimerRef.current = window.setTimeout(() => setPulseActive(false), 340)
    return () => cancelAnimationFrame(raf)
  }, [phase, completedFocusInCycle])
  useEffect(
    () => () => {
      if (pulseTimerRef.current != null) window.clearTimeout(pulseTimerRef.current)
    },
    [],
  )

  const isM3 = themeId === 'material-you'
  const isIos = themeId === 'ios-26'

  const activeDuration = scrubbingMinutes ?? durationMinutes
  const scrubFraction = Math.max(5, Math.min(60, activeDuration)) / 60

  const size = large ? 380 : 300
  const stroke = isM3 ? 12 : isIos ? 14 : large ? 16 : 14
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r

  // When scrubbing in idle, preview the fraction of 60m; otherwise render smooth 1.0 -> 0.0 session countdown
  const effectiveProgress = isScrubbing ? scrubFraction : Math.min(1, Math.max(0, progress))
  const offset = circ * (1 - effectiveProgress)
  const glowVar = isFlow ? '--c-accent' : GLOW_VAR[phase]

  const shownLabel = isFlow ? t.timer.flow : phaseLabel
  const shownTime = isFlow
    ? flowTime
    : scrubbingMinutes != null
      ? `${String(scrubbingMinutes).padStart(2, '0')}:00`
      : time
  const shownStatus = running
    ? t.timer.status.running
    : paused
      ? t.timer.status.paused
      : null

  // Calculate Knob position on the circular arc (0 = top / 12 o'clock)
  const knobAngle = scrubFraction * 2 * Math.PI - Math.PI / 2
  const center = size / 2
  const knobX = center + r * Math.cos(knobAngle)
  const knobY = center + r * Math.sin(knobAngle)

  const calcMinutesFromPointer = useCallback((e: React.PointerEvent) => {
    if (!ringRef.current) return null
    const rect = ringRef.current.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = e.clientX - cx
    const dy = e.clientY - cy
    let rad = Math.atan2(dy, dx) + Math.PI / 2
    if (rad < 0) rad += 2 * Math.PI
    const frac = rad / (2 * Math.PI)
    const rawMins = frac * 60
    let snapped = Math.round(rawMins / 5) * 5
    if (snapped === 0) snapped = rawMins > 30 ? 60 : 5
    return Math.max(5, Math.min(60, snapped))
  }, [])

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isIdle || isFlow || !onDurationChange) return
    isDraggingRef.current = true
    playMicroClick('tick')
    const mins = calcMinutesFromPointer(e)
    if (mins) setScrubbingMinutes(mins)
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return
    const mins = calcMinutesFromPointer(e)
    if (mins && mins !== scrubbingMinutes) {
      playMicroClick('tick')
      setScrubbingMinutes(mins)
    }
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false
    playMicroClick('pop')
    const mins = calcMinutesFromPointer(e)
    const finalMins = mins ?? scrubbingMinutes
    if (finalMins != null && onDurationChange) {
      onDurationChange(finalMins)
    }
    setScrubbingMinutes(null)
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId)
    } catch {}
  }

  const playBtnColor =
    isFlow || phase === 'focus'
      ? 'bg-accent text-on-accent border border-white/10 active:border-accent/60 shadow-[0_0_24px_rgb(var(--c-accent)/calc(var(--glow-opacity,0.25)*1.5))]'
      : phase === 'shortBreak'
        ? 'bg-break text-on-accent border border-white/10 active:border-break/60 shadow-[0_0_24px_rgb(var(--c-break)/calc(var(--glow-opacity,0.25)*1.5))]'
        : 'bg-long text-on-accent border border-white/10 active:border-long/60 shadow-[0_0_24px_rgb(var(--c-long)/calc(var(--glow-opacity,0.25)*1.5))]'

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

  return (
    <section
      className={`group relative flex w-full flex-col items-center transition-[background-color,border-color,box-shadow,border-radius,opacity] duration-300 ${
        borderless
          ? 'max-w-xl gap-8 p-0 bg-transparent border-0 shadow-none'
          : isIos
            ? 'rounded-[36px] bg-white/75 dark:bg-white/[0.04] backdrop-blur-2xl border border-white/80 dark:border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-6 sm:p-8 2xl:p-10 relative overflow-hidden max-w-md 2xl:max-w-lg gap-6 2xl:gap-8'
            : 'card max-w-md 2xl:max-w-lg gap-6 2xl:gap-8 p-6 sm:p-8 2xl:p-10'
      }`}
    >
      {/* iOS 26 Ambient Backlight (Centered soft breathing glow behind display) */}
      {isIos && (
        <div
          className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-primary/10 blur-3xl transition-all duration-1000 ${
            running ? 'opacity-100 animate-pulse-slow' : paused ? 'opacity-40' : 'opacity-15'
          }`}
          aria-hidden="true"
        />
      )}

      {task && (
        <div
          className={`inline-flex max-w-full items-center gap-2 px-3.5 py-1.5 text-xs shadow-sm backdrop-blur-md transition-all duration-300 ${
            isIos
              ? 'rounded-full border border-black/[0.06] dark:border-white/15 bg-black/[0.04] dark:bg-white/10 text-zinc-700 dark:text-white/90 font-medium'
              : 'rounded-badge border border-line/70 bg-surface/80 text-fg'
          }`}
        >
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${isIos ? 'bg-primary shadow-[0_0_6px_rgba(var(--primary-rgb),0.8)]' : 'bg-accent'}`} />
          <span className="max-w-[180px] sm:max-w-[280px] truncate font-medium leading-none">
            {task}
          </span>
          {tag && (
            <span
              className={`shrink-0 px-1.5 py-0.5 text-[11px] font-medium leading-none ${
                isIos
                  ? 'rounded-full border border-black/[0.08] dark:border-white/20 bg-black/[0.04] dark:bg-white/10 text-zinc-600 dark:text-white/80'
                  : 'rounded-badge border border-tag-border bg-tag-bg text-tag-text'
              }`}
            >
              #{tag}
            </span>
          )}
        </div>
      )}

      <div className="flex w-full flex-col items-center">
        {isTui ? (
          /* TUI Mode Switcher */
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
        ) : isIos ? (
          /* iOS 26 Apple Inset Segmented Control */
          <div
            role="tablist"
            aria-label="Timer Modus"
            className={`bg-black/[0.05] dark:bg-black/40 p-1 rounded-full border border-black/[0.06] dark:border-white/10 backdrop-blur-xl inline-grid grid-cols-2 ${
              borderless ? 'w-60 sm:w-64' : 'w-full max-w-[240px]'
            } mx-auto relative select-none transition-opacity duration-500 ${
              running && borderless ? 'opacity-30 hover:opacity-100 focus-within:opacity-100' : 'opacity-100'
            }`}
          >
            {/* Sliding Glass Puck */}
            <div
              className="pointer-events-none absolute bottom-1 top-1 rounded-full bg-white dark:bg-white/15 border border-black/[0.04] dark:border-white/15 shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.25)] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform"
              style={{
                width: 'calc((100% - 8px - 4px) / 2)',
                left: '4px',
                transform: `translateX(calc(${mode === 'pomodoro' ? 0 : 1} * (100% + 4px)))`,
              }}
            />
            {MODES.map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                aria-label={t.timer[m]}
                onClick={() => onModeChange(m)}
                className={`relative z-10 flex min-h-[36px] items-center justify-center rounded-full py-1.5 text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer ${
                  mode === m
                    ? 'text-zinc-950 dark:text-white font-semibold'
                    : 'text-zinc-600 dark:text-white/60 hover:text-zinc-950 dark:hover:text-white'
                }`}
              >
                <span>{t.timer[m]}</span>
              </button>
            ))}
          </div>
        ) : (
          /* Standard / M3 Segmented Control Track */
          <div
            role="tablist"
            aria-label="Timer Modus"
            className={`seg-track relative grid grid-cols-2 ${
              borderless ? 'w-60 sm:w-64' : 'w-full max-w-[260px]'
            } mx-auto select-none rounded-btn border border-line/70 bg-surface/80 p-1 backdrop-blur-md transition-opacity duration-500 ${
              running && borderless ? 'opacity-30 hover:opacity-100 focus-within:opacity-100' : 'opacity-100'
            }`}
          >
            {/* Sliding Pill — transform-based so the glide stays on the compositor */}
            <div
              className="pointer-events-none absolute bottom-1 top-1 rounded-[calc(var(--radius-btn)-4px)] bg-raised shadow-sm ios-seg-active transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform"
              style={{
                width: 'calc((100% - 8px - 4px) / 2)',
                left: '4px',
                transform: `translateX(calc(${mode === 'pomodoro' ? 0 : 1} * (100% + 4px)))`,
              }}
            />
            {MODES.map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                aria-label={t.timer[m]}
                onClick={() => onModeChange(m)}
                className={`relative z-10 flex min-h-[36px] sm:min-h-[38px] w-full items-center justify-center gap-1.5 rounded-[calc(var(--radius-btn)-4px)] px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors duration-200 active:scale-[0.98] cursor-pointer ${
                  mode === m ? 'text-fg font-semibold' : 'text-muted hover:text-fg'
                }`}
              >
                {mode === m && (
                  <Check size={13} className="m3-seg-check hidden animate-fade-in stroke-[2.5]" />
                )}
                <span>{t.timer[m]}</span>
              </button>
            ))}
          </div>
        )}

        {!isTui && !isM3 && (
          <div
            className="flex h-6 items-center justify-center my-2 transition-opacity duration-300"
            aria-hidden={isFlow}
            aria-label={`Runde ${currentRoundIndex + 1} von ${roundsBeforeLongBreak}`}
          >
            <div
              className={`flex items-center justify-center gap-1.5 transition-all duration-300 ${
                isFlow ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
              }`}
            >
              {Array.from({ length: roundsBeforeLongBreak }).map((_, i) => {
                const isCompleted = i < currentRoundIndex
                const isCurrent = i === currentRoundIndex

                let pillStyle = isIos ? 'bg-black/10 dark:bg-white/10' : 'bg-line'
                if (isCompleted) {
                  pillStyle = isIos
                    ? 'bg-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]'
                    : 'bg-accent'
                } else if (isCurrent) {
                  pillStyle = isIos
                    ? running
                      ? 'bg-primary/90 shadow-[0_0_10px_rgba(var(--primary-rgb),0.6)] animate-pulse'
                      : 'bg-primary/50'
                    : running
                      ? 'bg-accent animate-pulse'
                      : 'bg-accent/60'
                }

                return (
                  <span
                    key={i}
                    className={`h-1 w-7 2xl:w-8 rounded-full transition-all duration-300 ${pillStyle}`}
                  />
                )
              })}
            </div>
          </div>
        )}
      </div>

      {isTui ? (
        /* TUI Terminal Box with Identical Height & Symmetric Geometry in Both Modes */
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
          <div className="h-[24px] flex items-center justify-center text-xs sm:text-sm font-bold text-accent tracking-wider font-mono">
            {isFlow ? (
              <span className={running ? 'text-accent' : 'text-muted'}>
                {flowAsciiStatus}
              </span>
            ) : (
              <span>{asciiBar}</span>
            )}
          </div>

          {/* Row 5: Bottom Border */}
          <div className="text-xs text-muted flex items-center justify-center font-mono">
            <span className="text-line">└───────────────────────────────┘</span>
          </div>
        </div>
      ) : (
        <div
          ref={ringRef}
          className={`relative isolate touch-none select-none ${pulseActive ? 'animate-complete-pulse' : ''} ${
            isIdle && !isFlow ? 'cursor-grab active:cursor-grabbing' : ''
          }`}
          style={{ width: size, height: size }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {/* Ambient Breathing Glow behind Timer for non-iOS themes */}
          {!isIos && (
            <div
              className={`pointer-events-none absolute inset-0 -z-10 rounded-full blur-3xl transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                running
                  ? 'opacity-28 scale-105'
                  : paused
                    ? 'opacity-14 scale-100'
                    : 'opacity-0 scale-95'
              }`}
              style={
                {
                  background: `radial-gradient(circle at center, rgb(var(${glowVar})) 0%, transparent 68%)`,
                } as React.CSSProperties
              }
            >
              {/* Inner Organic Breathing Layer while running */}
              <div
                className={`h-full w-full rounded-full transition-opacity duration-1000 ${
                  running ? 'animate-ambient-breath opacity-100' : 'opacity-0'
                }`}
                style={{
                  background: `radial-gradient(circle at center, rgb(var(${glowVar})) 0%, transparent 58%)`,
                }}
              />
            </div>
          )}

          {/* Pomodoro Mode View */}
          <div
            className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
              isFlow ? 'pointer-events-none opacity-0 scale-95 -translate-y-2' : 'opacity-100 scale-100 translate-y-0'
            }`}
          >
            <svg
              width={size}
              height={size}
              className="-rotate-90 select-none overflow-visible"
              aria-hidden="true"
            >
              {/* Frost Track: stroke-black/[0.06] on light / stroke-white/10 on dark on iOS 26 */}
              <circle
                cx={center}
                cy={center}
                r={r}
                fill="none"
                strokeWidth={stroke}
                className={isIos ? 'stroke-black/[0.06] dark:stroke-white/10 [filter:blur(0.5px)]' : 'stroke-track'}
              />
              {/* Neon Arc: stroke-primary with round caps and intense glow */}
              <circle
                cx={center}
                cy={center}
                r={r}
                fill="none"
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={offset}
                className={`${isIos ? 'stroke-primary' : RING[phase]} ${
                  isScrubbing
                    ? 'ring-progress--none'
                    : running
                      ? 'ring-progress--running'
                      : 'ring-progress'
                }`}
                style={
                  isIos
                    ? { filter: `drop-shadow(0 0 10px rgb(var(${glowVar}) / 0.7))` }
                    : undefined
                }
              />
            </svg>

            {/* Scrubbing Knob indicator only while active dragging */}
            {isScrubbing && !isFlow && (
              <div
                className="pointer-events-none absolute z-20 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center animate-fade-in"
                style={{ left: `${knobX}px`, top: `${knobY}px` }}
              >
                <div
                  className={`rounded-full border-2 border-white scale-125 transition-transform duration-100 ${
                    isIos
                      ? 'h-4 w-4 bg-primary shadow-[0_0_12px_rgba(var(--primary-rgb),0.8)]'
                      : 'h-4 w-4 bg-accent shadow-md shadow-accent/50'
                  }`}
                />
              </div>
            )}

            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
              {isIos ? (
                /* Live Round Capsule for iOS 26 */
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/[0.04] dark:bg-white/10 backdrop-blur-md border border-black/[0.06] dark:border-white/15 text-xs font-semibold tracking-wide text-zinc-700 dark:text-white/90 shadow-sm animate-fade-in">
                  <CatLogo
                    size={14}
                    state={isIdle ? 'idle' : phase}
                    className={`transition-colors duration-500 ${PHASE_TEXT[phase]}`}
                  />
                  <span className="uppercase tracking-widest">{shownLabel}</span>
                  <span className="text-black/30 dark:text-white/30">·</span>
                  <span className="tabular-nums text-zinc-600 dark:text-white/80">{`Runde ${currentRoundIndex + 1}/${roundsBeforeLongBreak}`}</span>
                </div>
              ) : isM3 ? (
                <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-secondary-container px-3 py-0.5 text-xs font-medium text-on-secondary-container animate-fade-in shadow-none">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  <span>{`Runde ${currentRoundIndex + 1}/${roundsBeforeLongBreak}`}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 min-h-[20px]">
                  <CatLogo
                    size={16}
                    state={isIdle ? 'idle' : phase}
                    className={`transition-colors duration-500 ${PHASE_TEXT[phase]}`}
                  />
                  <span className={`text-xs font-semibold uppercase tracking-widest transition-colors duration-500 ${PHASE_TEXT[phase]}`}>
                    {shownLabel}
                  </span>
                </div>
              )}
              <span
                className={`font-display font-bold tabular-nums leading-none tracking-tight transition-all duration-300 ${
                  isIos ? 'text-zinc-950 dark:text-white dark:drop-shadow-[0_2px_12px_rgba(0,0,0,0.4)]' : 'text-fg'
                } ${
                  large ? 'text-6xl sm:text-7xl 2xl:text-8xl' : 'text-5xl 2xl:text-6xl'
                }`}
              >
                {shownTime}
              </span>
              <div className="flex min-h-[20px] items-center justify-center">
                <span
                  className={`text-xs font-medium transition-opacity duration-200 ${
                    isIos ? 'text-zinc-500 dark:text-white/60' : 'text-muted'
                  } ${
                    shownStatus ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  {shownStatus || ''}
                </span>
              </div>
            </div>
          </div>

          {/* Flow Mode View */}
          <div
            className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
              isFlow ? 'opacity-100 scale-100 translate-y-0' : 'pointer-events-none opacity-0 scale-95 translate-y-2'
            }`}
          >
            {isIos ? (
              /* Live Round Capsule for iOS 26 Flow Mode */
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/[0.04] dark:bg-white/10 backdrop-blur-md border border-black/[0.06] dark:border-white/15 text-xs font-semibold tracking-wide text-zinc-700 dark:text-white/90 shadow-sm animate-fade-in">
                <CatLogo
                  size={14}
                  state={flowStatus === 'idle' ? 'idle' : 'focus'}
                  className="text-primary"
                />
                <span className="uppercase tracking-widest">{shownLabel}</span>
                <span className="text-black/30 dark:text-white/30">·</span>
                <span className="text-zinc-600 dark:text-white/80">{running ? 'TRACKING' : paused ? 'PAUSED' : 'IDLE'}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 min-h-[20px]">
                <CatLogo
                  size={16}
                  state={flowStatus === 'idle' ? 'idle' : 'focus'}
                  className="text-accent"
                />
                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-accent/80">
                  {shownLabel}
                </span>
              </div>
            )}

            <span
              className={`font-display font-bold leading-none tracking-tight tabular-nums transition-all duration-300 my-1 ${
                isIos ? 'text-zinc-950 dark:text-white dark:drop-shadow-[0_2px_16px_rgba(0,0,0,0.5)]' : 'text-fg'
              } ${
                large
                  ? isFlow && shownTime.length > 5
                    ? 'text-6xl sm:text-7xl 2xl:text-8xl'
                    : 'text-7xl sm:text-8xl 2xl:text-9xl'
                  : isFlow && shownTime.length > 5
                    ? 'text-5xl 2xl:text-6xl'
                    : 'text-6xl 2xl:text-7xl'
              }`}
            >
              {shownTime}
            </span>

            <div className="flex min-h-[50px] flex-col items-center justify-center">
              {isIos ? (
                /* iOS 26 Floating Apple Milestone Live Activity Capsules */
                <div className="my-2.5 flex items-center justify-center gap-2 select-none">
                  {[25, 50, 75].map((m) => {
                    const reached = flowMinutes >= m
                    return (
                      <span
                        key={m}
                        className={`flex items-center gap-1 transition-all duration-300 ${
                          reached
                            ? 'bg-primary/20 border border-primary/40 text-primary font-semibold rounded-full px-3 py-1 text-xs shadow-[0_0_12px_rgba(var(--primary-rgb),0.3)] animate-in zoom-in-95'
                            : 'bg-black/[0.04] dark:bg-white/5 border border-black/[0.06] dark:border-white/10 text-zinc-600 dark:text-white/40 rounded-full px-3 py-1 text-xs backdrop-blur-sm'
                        }`}
                      >
                        <span>{reached ? '★' : '☆'}</span>
                        <span className="tabular-nums">{m}m</span>
                      </span>
                    )
                  })}
                </div>
              ) : isM3 ? (
                <div className="my-2.5 flex items-center justify-center gap-2 select-none">
                  {[25, 50, 75].map((m) => {
                    const reached = flowMinutes >= m
                    return (
                      <span
                        key={m}
                        className={`flex items-center gap-1 rounded-xl px-3 py-1 text-xs transition-all duration-300 ${
                          reached
                            ? 'bg-tertiary-container text-on-tertiary-container font-semibold animate-in zoom-in-95'
                            : 'bg-raised text-muted/60 font-medium'
                        }`}
                      >
                        <span>{reached ? '★' : '☆'}</span>
                        <span>{m}m</span>
                      </span>
                    )
                  })}
                </div>
              ) : (
                <Waveform status={flowStatus} />
              )}

              <div className="flex min-h-[18px] items-center justify-center">
                <span
                  className={`text-xs font-medium transition-opacity duration-200 ${
                    isIos ? 'text-zinc-500 dark:text-white/60' : 'text-muted'
                  } ${
                    shownStatus ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  {shownStatus || ''}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {isTui ? (
        /* TUI Bracket Controls with 3-Column Grid System */
        <div className="grid grid-cols-3 gap-2 w-full max-w-sm font-mono select-none my-1">
          {/* Slot 1: Reset */}
          <button
            type="button"
            onClick={handleResetClick}
            title={isFlow ? `${t.flow.discard} (R)` : `${t.shortcuts.reset} (R)`}
            aria-label={isFlow ? t.flow.discard : t.shortcuts.reset}
            className="tui-btn w-full whitespace-nowrap px-2 py-2 text-xs font-bold border border-line bg-surface text-fg hover:border-fg hover:text-canvas hover:bg-fg transition-colors uppercase cursor-pointer active:scale-95 text-center justify-center"
          >
            [&nbsp;RESET&nbsp;]
          </button>

          {/* Slot 2: Start / Pause */}
          <button
            type="button"
            onClick={handleToggleClick}
            className="tui-btn tui-btn-primary w-full whitespace-nowrap px-2 py-2 text-xs sm:text-sm font-bold border-2 border-accent bg-accent text-on-accent hover:bg-fg hover:text-canvas hover:border-fg transition-colors uppercase tracking-wider cursor-pointer active:scale-95 shadow-sm text-center justify-center"
            title={running ? t.timer.pause : t.timer.start}
            aria-label={running ? t.timer.pause : t.timer.start}
          >
            {running ? '[\u00A0❚❚\u00A0PAUSE\u00A0]' : '[\u00A0▶\u00A0START\u00A0]'}
          </button>

          {/* Slot 3: Skip / Finish */}
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
      ) : isIos ? (
        /* iOS 26 Glass Lens Control Cluster */
        <div className="flex items-center justify-center gap-4 sm:gap-5 2xl:gap-6 mt-2">
          {/* Secondary Action: Reset / Discard Frosted Mini-Pill */}
          <button
            type="button"
            onClick={handleResetClick}
            title={isFlow ? `${t.flow.discard} (R)` : `${t.shortcuts.reset} (R)`}
            aria-label={isFlow ? t.flow.discard : t.shortcuts.reset}
            className="w-12 h-12 rounded-full bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/10 dark:hover:bg-white/15 active:scale-90 border border-black/[0.06] dark:border-white/10 backdrop-blur-xl flex items-center justify-center text-zinc-700 dark:text-white/80 transition-all cursor-pointer shadow-sm"
          >
            <RotateCcw size={18} />
          </button>

          {/* Center Action: Play / Pause Optical Lens */}
          <button
            type="button"
            onClick={handleToggleClick}
            className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-gradient-to-b from-primary/90 to-primary text-white flex items-center justify-center shadow-[0_10px_30px_rgba(var(--primary-rgb),0.4),inset_0_1px_1px_rgba(255,255,255,0.45)] hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
            title={running ? t.timer.pause : t.timer.start}
            aria-label={running ? t.timer.pause : t.timer.start}
          >
            {running ? (
              <Pause size={large ? 32 : 28} />
            ) : (
              <Play size={large ? 32 : 28} className="translate-x-0.5" />
            )}
          </button>

          {/* Secondary Action: Skip / Finish Frosted Mini-Pill */}
          {isFlow ? (
            <button
              type="button"
              onClick={handleSkipClick}
              title={`${t.flow.finish} (F)`}
              aria-label={t.flow.finish}
              className="w-12 h-12 rounded-full bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/10 dark:hover:bg-white/15 active:scale-90 border border-black/[0.06] dark:border-white/10 backdrop-blur-xl flex items-center justify-center text-zinc-700 dark:text-white/80 transition-all cursor-pointer shadow-sm"
            >
              <Check size={20} strokeWidth={2.5} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSkipClick}
              title={`${t.shortcuts.skip} (N)`}
              aria-label={t.shortcuts.skip}
              className="w-12 h-12 rounded-full bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/10 dark:hover:bg-white/15 active:scale-90 border border-black/[0.06] dark:border-white/10 backdrop-blur-xl flex items-center justify-center text-zinc-700 dark:text-white/80 transition-all cursor-pointer shadow-sm"
            >
              <SkipForward size={18} />
            </button>
          )}
        </div>
      ) : (
        /* Standard / M3 Control Cluster */
        <div className="flex items-center justify-center gap-4 sm:gap-5 2xl:gap-6 mt-2">
          <button
            type="button"
            onClick={handleResetClick}
            title={isFlow ? `${t.flow.discard} (R)` : `${t.shortcuts.reset} (R)`}
            aria-label={isFlow ? t.flow.discard : t.shortcuts.reset}
            className="btn-ghost flex h-12 w-12 2xl:h-14 2xl:w-14 items-center justify-center rounded-full transition-all duration-200 active:scale-[0.92]"
          >
            <RotateCcw size={18} />
          </button>

          <button
            type="button"
            onClick={handleToggleClick}
            className={`ios-play-lens play-spring flex items-center justify-center rounded-full ${
              large ? 'h-20 w-20 2xl:h-22 2xl:w-22 shadow-2xl' : 'h-16 w-16 2xl:h-18 2xl:w-18 shadow-lg'
            } ${playBtnColor}`}
            title={running ? t.timer.pause : t.timer.start}
            aria-label={running ? t.timer.pause : t.timer.start}
          >
            {running ? (
              <Pause size={large ? 32 : 26} />
            ) : (
              <Play size={large ? 32 : 26} className="translate-x-0.5" />
            )}
          </button>

          {isFlow ? (
            <button
              type="button"
              onClick={handleSkipClick}
              title={`${t.flow.finish} (F)`}
              aria-label={t.flow.finish}
              className="btn-ghost flex h-12 w-12 2xl:h-14 2xl:w-14 items-center justify-center rounded-full active:scale-[0.92]"
            >
              <Check size={20} strokeWidth={2.5} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSkipClick}
              title={`${t.shortcuts.skip} (N)`}
              aria-label={t.shortcuts.skip}
              className="btn-ghost flex h-12 w-12 2xl:h-14 2xl:w-14 items-center justify-center rounded-full active:scale-[0.92]"
            >
              <SkipForward size={18} />
            </button>
          )}
        </div>
      )}

      {/* Keyboard shortcuts row: stable layout without jumps & zero wrap */}
      <div
        className={`flex min-h-[28px] items-center justify-center gap-2 sm:gap-2.5 select-none text-[11px] font-mono ${
          isIos ? 'text-zinc-500 dark:text-white/50 font-normal' : 'text-muted'
        } transition-opacity duration-200 whitespace-nowrap [@media(hover:none)]:hidden ${
          running ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
      >
        <span className="inline-flex items-center gap-1">
          <kbd className="kbd text-[10px]">Space</kbd> Start/Pause
        </span>
        <span className={isIos ? 'text-zinc-300 dark:text-white/20' : 'text-muted/40'}>·</span>
        {isFlow ? (
          <>
            <span className="inline-flex items-center gap-1">
              <kbd className="kbd text-[10px]">R</kbd> Discard
            </span>
            <span className={isIos ? 'text-zinc-300 dark:text-white/20' : 'text-muted/40'}>·</span>
            <span className="inline-flex items-center gap-1">
              <kbd className="kbd text-[10px]">F</kbd> Finish
            </span>
          </>
        ) : (
          <>
            <span className="inline-flex items-center gap-1">
              <kbd className="kbd text-[10px]">R</kbd> Reset
            </span>
            <span className={isIos ? 'text-zinc-300 dark:text-white/20' : 'text-muted/40'}>·</span>
            <span className="inline-flex items-center gap-1">
              <kbd className="kbd text-[10px]">N</kbd> Skip
            </span>
          </>
        )}
        <span className={isIos ? 'text-zinc-300 dark:text-white/20' : 'text-muted/40'}>·</span>
        <button
          type="button"
          onClick={onToggleZen}
          title={isZenMode ? t.zen.exitHint : t.zen.enterHint}
          aria-label={isZenMode ? t.zen.exitHint : t.zen.enterHint}
          className={`inline-flex items-center gap-1 transition-colors ${
            isIos ? 'hover:text-zinc-950 dark:hover:text-white' : 'hover:text-fg'
          } cursor-pointer`}
        >
          <kbd className="kbd text-[10px]">Z</kbd> Zen
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
                : isIos
                  ? 'text-zinc-500 dark:text-white/40 opacity-0 hover:bg-black/[0.05] dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white focus:opacity-100 group-hover:opacity-100'
                  : 'text-muted opacity-0 hover:bg-raised/50 hover:text-fg focus:opacity-100 group-hover:opacity-100'
            }`}
          >
            <PictureInPicture2 size={16} />
          </button>
          <span
            role="tooltip"
            className={`pointer-events-none absolute bottom-full right-0 mb-2 whitespace-nowrap rounded-md border px-2 py-1 text-xs font-normal opacity-0 shadow-lg transition-opacity duration-150 group-hover/pip:opacity-100 ${
              isIos
                ? 'border-black/[0.08] dark:border-white/15 bg-white/95 dark:bg-black/80 text-zinc-900 dark:text-white backdrop-blur-md'
                : 'border-line bg-raised text-fg'
            }`}
          >
            {pipOpen ? t.pip.close : t.pip.open}
          </span>
        </div>
      )}
    </section>
  )
})