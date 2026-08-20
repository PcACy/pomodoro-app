import { memo } from 'react'
import { Flag, Pause, PictureInPicture2, Play, RotateCcw, SkipForward, X } from 'lucide-react'
import type { TimerStatus, PhaseId, TimerMode } from '../types'
import { useTranslation } from '../hooks/useTranslation'

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
  onModeChange: (m: TimerMode) => void
  onToggle: () => void
  onSkip: () => void
  onReset: () => void
  pipSupported: boolean
  pipOpen: boolean
  onPipToggle: () => void
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

const FLOW_BARS = [0, 1, 2, 3, 4, 5, 6, 7, 8]

/** Minimal equalizer waveform for the flow mode (transform-only, GPU-composited). */
function Waveform({ active }: { active: boolean }) {
  return (
    <div className="flex h-8 items-center justify-center gap-1.5" aria-hidden="true">
      {FLOW_BARS.map((i) => (
        <span
          key={i}
          className={`flow-bar bg-accent ${active ? 'flow-bar--active' : ''}`}
          style={{ animationDelay: `${i * 0.11}s` }}
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
  onModeChange,
  onToggle,
  onSkip,
  onReset,
  pipSupported,
  pipOpen,
  onPipToggle,
}: Props) {
  const { t } = useTranslation()
  const isFlow = mode === 'flow'
  const running = isFlow ? flowStatus === 'running' : status === 'running'
  const paused = isFlow ? flowStatus === 'paused' : status === 'paused'
  const dotsFilled = completedFocusInCycle % roundsBeforeLongBreak

  const shownLabel = isFlow ? t.timer.flow : phaseLabel
  const shownTime = isFlow ? flowTime : time
  const shownStatus = running
    ? t.timer.status.running
    : paused
      ? t.timer.status.paused
      : t.timer.status.ready
  const size = large ? 380 : 300
  const stroke = large ? 16 : 14
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - Math.min(1, Math.max(0, progress)))
  const glowVar = isFlow ? '--c-accent' : GLOW_VAR[phase]

  return (
    <section className="card flex w-full max-w-md flex-col items-center gap-6 p-8">
      <div className="flex w-full items-center gap-1 rounded-xl border border-line bg-canvas p-1">
        {MODES.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onModeChange(m)}
            className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === m ? 'bg-raised text-fg' : 'text-muted hover:text-fg'
            }`}
          >
            {t.timer[m]}
          </button>
        ))}
      </div>

      <div className="relative isolate" style={{ width: size, height: size }}>
        <div
          className={`pointer-events-none absolute inset-0 -z-10 rounded-full bg-[radial-gradient(circle,var(--primary-color)_0%,transparent_70%)] blur-2xl transition-opacity duration-500 ${
            running ? 'animate-glow' : 'opacity-10'
          }`}
          style={{ '--primary-color': `rgb(var(${glowVar}))` } as React.CSSProperties}
        />

        <div
          className={`absolute inset-0 transition-opacity duration-300 ${
            isFlow ? 'pointer-events-none opacity-0' : 'opacity-100'
          }`}
        >
          <svg width={size} height={size} className="-rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              strokeWidth={stroke}
              className="stroke-track"
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              className={`${RING[phase]} transition-all duration-300 ease-linear`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
            <span className={`text-sm font-medium uppercase tracking-widest ${PHASE_TEXT[phase]}`}>
              {shownLabel}
            </span>
            <span
              className={`font-mono font-bold tabular-nums leading-none tracking-wider text-fg ${
                large ? 'text-6xl' : 'text-5xl'
              }`}
            >
              {shownTime}
            </span>
            <span className="text-xs text-muted">{shownStatus}</span>
          </div>
        </div>

        <div
          className={`absolute inset-0 flex flex-col items-center justify-center gap-4 transition-opacity duration-300 ${
            isFlow ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          <span className="text-xs font-semibold uppercase tracking-[0.35em] text-accent/80">
            {shownLabel}
          </span>
          <span className="font-mono text-6xl font-bold leading-none tracking-tight tabular-nums text-fg sm:text-7xl">
            {shownTime}
          </span>
          <Waveform active={running} />
          <span className="text-xs text-muted">{shownStatus}</span>
        </div>
      </div>

      {!isFlow && (
        <div className="flex items-center gap-2" aria-label="Fortschritt im Zyklus">
          {Array.from({ length: roundsBeforeLongBreak }).map((_, i) => (
            <span
              key={i}
              className={`h-2.5 w-2.5 rounded-full transition-colors ${
                i < dotsFilled ? 'bg-accent' : 'bg-line'
              }`}
            />
          ))}
          <span className="ml-1 text-xs text-muted">
            {t.timer.rounds(completedFocusInCycle % roundsBeforeLongBreak, roundsBeforeLongBreak)}
          </span>
        </div>
      )}

      <div className="flex items-center gap-3">
        {isFlow ? (
          flowStatus !== 'idle' && (
            <button
              type="button"
              onClick={onReset}
              title={`${t.flow.discard} (R)`}
              className="flex h-12 w-12 items-center justify-center rounded-xl border border-line text-muted transition-colors hover:bg-raised hover:text-fg"
            >
              <X size={18} />
            </button>
          )
        ) : (
          <button type="button" onClick={onSkip} title={`${t.shortcuts.skip} (N)`} className="btn-ghost">
            <SkipForward size={18} />
          </button>
        )}
        <button
          type="button"
          onClick={onToggle}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-on-accent shadow-lg shadow-accent/25 transition-all hover:bg-accent-strong active:scale-95"
          title={running ? t.timer.pause : t.timer.start}
        >
          {running ? <Pause size={26} /> : <Play size={26} className="translate-x-0.5" />}
        </button>
        {isFlow ? (
          flowStatus !== 'idle' && (
            <button
              type="button"
              onClick={onSkip}
              title={`${t.flow.finish} (F)`}
              className="flex h-12 w-12 items-center justify-center rounded-xl border border-accent/60 bg-accent/15 text-accent shadow-sm shadow-accent/20 transition-colors hover:bg-accent/25"
            >
              <Flag size={20} />
            </button>
          )
        ) : (
          <button type="button" onClick={onReset} title={`${t.shortcuts.reset} (R)`} className="btn-ghost">
            <RotateCcw size={18} />
          </button>
        )}
        {pipSupported && (
          <button
            type="button"
            onClick={onPipToggle}
            title={pipOpen ? t.pip.close : t.pip.open}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${
              pipOpen
                ? 'border-accent/60 bg-accent/10 text-accent'
                : 'border-line text-muted hover:bg-raised hover:text-fg'
            }`}
          >
            <PictureInPicture2 size={18} />
          </button>
        )}
      </div>

      <div
        className={`flex items-center gap-3 text-[11px] text-muted transition-opacity duration-500 ${
          running ? 'opacity-20 hover:opacity-100' : 'opacity-100'
        }`}
      >
        <span className="flex items-center gap-1">
          <span className="kbd">Space</span> {t.shortcuts.startPause}
        </span>
        {isFlow ? (
          flowStatus !== 'idle' && (
            <>
              <span className="flex items-center gap-1">
                <span className="kbd">F</span> {t.flow.finishShortcut}
              </span>
              <span className="flex items-center gap-1">
                <span className="kbd">R</span> {t.flow.discardShortcut}
              </span>
            </>
          )
        ) : (
          <>
            <span className="flex items-center gap-1">
              <span className="kbd">N</span> {t.shortcuts.skip}
            </span>
            <span className="flex items-center gap-1">
              <span className="kbd">R</span> {t.shortcuts.reset}
            </span>
          </>
        )}
      </div>
    </section>
  )
})