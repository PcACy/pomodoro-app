import { memo, useCallback, useRef, useState } from 'react'
import { Check, Pause, PictureInPicture2, Play, RotateCcw, SkipForward } from 'lucide-react'
import type { TimerStatus, PhaseId, TimerMode } from '../types'
import { useTranslation } from '../hooks/useTranslation'
import { CatLogo } from './CatLogo'
import { playMicroClick } from '../lib/sound'

interface Props {
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
  const running = isFlow ? flowStatus === 'running' : status === 'running'
  const paused = isFlow ? flowStatus === 'paused' : status === 'paused'
  const currentRoundIndex = completedFocusInCycle % roundsBeforeLongBreak

  const ringRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const [scrubbingMinutes, setScrubbingMinutes] = useState<number | null>(null)
  const isScrubbing = scrubbingMinutes != null

  const activeDuration = scrubbingMinutes ?? durationMinutes
  const scrubFraction = Math.max(5, Math.min(60, activeDuration)) / 60

  const size = large ? 380 : 300
  const stroke = large ? 16 : 14
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
      className={`group relative flex w-full flex-col items-center transition-all duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] ${
        borderless
          ? 'max-w-xl gap-8 p-0 bg-transparent border-0 shadow-none'
          : 'card max-w-md 2xl:max-w-lg gap-6 2xl:gap-8 p-6 sm:p-8 2xl:p-10'
      }`}
    >
      {task && (
        <div className="inline-flex max-w-full items-center gap-2 rounded-badge border border-line/70 bg-surface/80 px-3.5 py-1.5 text-xs shadow-sm backdrop-blur-md transition-all duration-300">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
          <span className="max-w-[180px] sm:max-w-[280px] truncate font-medium text-fg leading-none">
            {task}
          </span>
          {tag && (
            <span className="shrink-0 rounded-badge border border-tag-border bg-tag-bg px-1.5 py-0.5 text-[11px] font-medium text-tag-text leading-none">
              #{tag}
            </span>
          )}
        </div>
      )}

      <div className="flex w-full flex-col items-center">
        <div
          className={`relative grid grid-cols-2 ${
            borderless ? 'w-64 sm:w-72' : 'w-full'
          } items-center gap-1 rounded-btn border border-line/60 bg-canvas/80 p-1 backdrop-blur-md transition-opacity duration-500 ${
            running && borderless ? 'opacity-30 hover:opacity-100 focus-within:opacity-100' : 'opacity-100'
          }`}
        >
          {/* Sliding Pill Indicator */}
          <div
            className="pointer-events-none absolute bottom-1 top-1 rounded-btn bg-raised shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
            style={{
              width: 'calc(50% - 4px)',
              left: '4px',
              transform: `translateX(calc(${MODES.indexOf(mode)} * (100% + 4px)))`,
            }}
          />
          {MODES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onModeChange(m)}
              className={`relative z-10 flex-1 rounded-btn px-3 py-1.5 font-display text-xs uppercase tracking-wider transition-colors duration-200 active:scale-95 ${
                mode === m ? 'text-fg font-semibold' : 'text-muted hover:text-fg'
              }`}
            >
              {t.timer[m]}
            </button>
          ))}
        </div>

        <div
          className={`flex items-center justify-center gap-1.5 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] overflow-hidden ${
            isFlow ? 'max-h-0 opacity-0 -translate-y-2 pointer-events-none mt-0 mb-0' : 'max-h-8 opacity-100 translate-y-0 my-4'
          }`}
          aria-hidden={isFlow}
          aria-label={`Runde ${currentRoundIndex + 1} von ${roundsBeforeLongBreak}`}
        >
          {Array.from({ length: roundsBeforeLongBreak }).map((_, i) => {
            const isCompleted = i < currentRoundIndex
            const isCurrent = i === currentRoundIndex

            let pillStyle = 'bg-line'
            if (isCompleted) {
              pillStyle = 'bg-accent'
            } else if (isCurrent) {
              pillStyle = running ? 'bg-accent animate-pulse' : 'bg-accent/60'
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

      <div
        ref={ringRef}
        className={`relative isolate touch-none select-none ${isIdle && !isFlow ? 'cursor-grab active:cursor-grabbing' : ''}`}
        style={{ width: size, height: size }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Ambient Breathing Glow */}
        <div
          className={`pointer-events-none absolute inset-0 -z-10 rounded-full bg-[radial-gradient(circle,var(--primary-color)_0%,transparent_70%)] blur-3xl transition-all duration-700 ${
            running ? 'animate-ambient-breath' : 'scale-95'
          }`}
          style={
            {
              '--primary-color': `rgb(var(${glowVar}))`,
            } as React.CSSProperties
          }
        />

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
            <circle
              cx={center}
              cy={center}
              r={r}
              fill="none"
              strokeWidth={stroke}
              className="stroke-track"
            />
            <circle
              cx={center}
              cy={center}
              r={r}
              fill="none"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              style={{ willChange: 'stroke-dashoffset' }}
              className={`${RING[phase]} ${
                isScrubbing
                  ? 'transition-none'
                  : running
                    ? 'transition-[stroke-dashoffset] duration-1000 ease-linear'
                    : 'transition-[stroke-dashoffset] duration-400 ease-[cubic-bezier(0.32,0.72,0,1)]'
              }`}
            />
          </svg>

          {/* Scrubbing Knob indicator only while active dragging */}
          {isScrubbing && !isFlow && (
            <div
              className="pointer-events-none absolute z-20 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center animate-fade-in"
              style={{ left: `${knobX}px`, top: `${knobY}px` }}
            >
              <div className="h-4 w-4 rounded-full border-2 border-white bg-accent shadow-md shadow-accent/50 scale-125 transition-transform duration-100" />
            </div>
          )}

          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
            <div className="flex items-center gap-1.5">
              <CatLogo
                size={16}
                state={isIdle ? 'idle' : phase}
                className={`transition-colors duration-500 ${PHASE_TEXT[phase]}`}
              />
              <span className={`text-xs font-semibold uppercase tracking-widest transition-colors duration-500 ${PHASE_TEXT[phase]}`}>
                {shownLabel}
              </span>
            </div>
            <span
              className={`font-display font-bold tabular-nums leading-none tracking-tight text-fg transition-all duration-300 ${
                large ? 'text-6xl sm:text-7xl 2xl:text-8xl' : 'text-5xl 2xl:text-6xl'
              }`}
            >
              {shownTime}
            </span>
            {shownStatus && <span className="text-xs font-medium text-muted">{shownStatus}</span>}
          </div>
        </div>

        <div
          className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            isFlow ? 'opacity-100 scale-100 translate-y-0' : 'pointer-events-none opacity-0 scale-95 translate-y-2'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <CatLogo
              size={16}
              state={flowStatus === 'idle' ? 'idle' : 'focus'}
              className="text-accent"
            />
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-accent/80">
              {shownLabel}
            </span>
          </div>
          <span
            className={`font-display font-bold leading-none tracking-tight tabular-nums text-fg transition-all duration-300 my-1 ${
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
          <Waveform status={flowStatus} />
          {shownStatus && <span className="text-xs font-medium text-muted">{shownStatus}</span>}
        </div>
      </div>

      <div className="flex items-center gap-3.5 2xl:gap-5">
        <button
          type="button"
          onClick={handleResetClick}
          title={isFlow ? `${t.flow.discard} (R)` : `${t.shortcuts.reset} (R)`}
          aria-label={isFlow ? t.flow.discard : t.shortcuts.reset}
          className={`btn-ghost flex h-12 w-12 2xl:h-14 2xl:w-14 items-center justify-center rounded-full transition-all duration-200 active:scale-[0.92] ${
            isFlow && flowStatus === 'idle' ? 'pointer-events-none opacity-20' : 'opacity-100'
          }`}
        >
          <RotateCcw size={18} />
        </button>

        <button
          type="button"
          onClick={handleToggleClick}
          className={`flex items-center justify-center rounded-full transition-all duration-300 hover:scale-105 active:scale-[0.94] ${
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
            disabled={flowStatus === 'idle'}
            title={`${t.flow.finish} (F)`}
            aria-label={t.flow.finish}
            className={`flex h-12 w-12 2xl:h-14 2xl:w-14 items-center justify-center rounded-full border border-accent/50 bg-accent/15 text-accent shadow-sm shadow-accent/15 transition-all duration-200 hover:bg-accent/25 active:scale-[0.92] ${
              flowStatus === 'idle' ? 'pointer-events-none opacity-20' : 'opacity-100'
            }`}
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

      <div
        className={`flex flex-wrap items-center justify-center gap-3 text-[11px] text-muted transition-opacity duration-300 [@media(hover:none)]:hidden ${
          running ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
      >
        <span className="flex items-center gap-1">
          <kbd className="kbd">Space</kbd> {t.shortcuts.startPause}
        </span>
        {isFlow ? (
          flowStatus !== 'idle' && (
            <>
              <span className="flex items-center gap-1">
                <kbd className="kbd">R</kbd> {t.flow.discardShortcut}
              </span>
              <span className="flex items-center gap-1">
                <kbd className="kbd">F</kbd> {t.flow.finishShortcut}
              </span>
            </>
          )
        ) : (
          <>
            <span className="flex items-center gap-1">
              <kbd className="kbd">R</kbd> {t.shortcuts.reset}
            </span>
            <span className="flex items-center gap-1">
              <kbd className="kbd">N</kbd> {t.shortcuts.skip}
            </span>
          </>
        )}
        <button
          type="button"
          onClick={onToggleZen}
          title={isZenMode ? t.zen.exitHint : t.zen.enterHint}
          aria-label={isZenMode ? t.zen.exitHint : t.zen.enterHint}
          className="flex items-center gap-1 transition-colors hover:text-fg"
        >
          <kbd className="kbd">Z</kbd> {t.shortcuts.zen}
        </button>
      </div>

      {pipSupported && (
        <div className="group/pip absolute bottom-4 right-4 z-10">
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