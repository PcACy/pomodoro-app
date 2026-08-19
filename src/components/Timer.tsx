import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react'
import type { TimerStatus, PhaseId } from '../types'

interface Props {
  phase: PhaseId
  phaseLabel: string
  status: TimerStatus
  time: string
  progress: number
  completedFocusInCycle: number
  roundsBeforeLongBreak: number
  task: string
  tag: string
  tags: string[]
  onTaskChange: (v: string) => void
  onTagChange: (v: string) => void
  onToggle: () => void
  onSkip: () => void
  onReset: () => void
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

const SIZE = 300
const STROKE = 14
const R = (SIZE - STROKE) / 2
const CIRC = 2 * Math.PI * R

export function Timer({
  phase,
  phaseLabel,
  status,
  time,
  progress,
  completedFocusInCycle,
  roundsBeforeLongBreak,
  task,
  tag,
  tags,
  onTaskChange,
  onTagChange,
  onToggle,
  onSkip,
  onReset,
}: Props) {
  const offset = CIRC * (1 - Math.min(1, Math.max(0, progress)))
  const running = status === 'running'
  const dotsFilled = completedFocusInCycle % roundsBeforeLongBreak

  return (
    <section className="card border border-[#504945] flex w-full max-w-md flex-col items-center gap-8 p-8">
      <div className="relative isolate" style={{ width: SIZE, height: SIZE }}>
        <div
          className={`pointer-events-none absolute inset-0 -z-10 rounded-full bg-[radial-gradient(circle,var(--primary-color)_0%,transparent_70%)] blur-2xl transition-opacity duration-500 ${
            running ? 'animate-glow' : 'opacity-10'
          }`}
          style={{ '--primary-color': `rgb(var(${GLOW_VAR[phase]}))` } as React.CSSProperties}
        />
        <svg width={SIZE} height={SIZE} className="-rotate-90">
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            strokeWidth={STROKE}
            className="stroke-track"
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={offset}
            className={`${RING[phase]} transition-all duration-300 ease-linear`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <span className={`text-sm font-medium uppercase tracking-widest ${PHASE_TEXT[phase]}`}>
            {phaseLabel}
          </span>
          <span className="font-mono text-5xl font-bold tabular-nums leading-none tracking-wider text-fg">
            {time}
          </span>
          <span className="text-xs text-muted">
            {running ? 'läuft' : status === 'paused' ? 'pausiert' : 'bereit'}
          </span>
        </div>
      </div>

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
          {completedFocusInCycle % roundsBeforeLongBreak}/{roundsBeforeLongBreak} Runden
        </span>
      </div>

      <div
        className={`flex w-full flex-col gap-3 transition-opacity duration-500 ${
          running ? 'opacity-20 hover:opacity-100 focus-within:opacity-100' : 'opacity-100'
        }`}
      >
        <input
          type="text"
          value={task}
          onChange={(e) => onTaskChange(e.target.value)}
          placeholder="Aktuelle Aufgabe …"
          className="input"
          maxLength={80}
        />
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onTagChange(tag === t ? '' : t)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                tag === t
                  ? 'border-accent bg-accent/20 text-accent shadow-sm shadow-accent/20'
                  : 'border-line text-muted hover:border-accent/50 hover:bg-accent/5 hover:text-fg'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="button" onClick={onSkip} title="Skip (N)" className="btn-ghost">
          <SkipForward size={18} />
        </button>
        <button
          type="button"
          onClick={onToggle}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-on-accent shadow-lg shadow-accent/25 transition-all hover:bg-accent-strong active:scale-95"
          title={running ? 'Pause (Leertaste)' : 'Start (Leertaste)'}
        >
          {running ? <Pause size={26} /> : <Play size={26} className="translate-x-0.5" />}
        </button>
        <button type="button" onClick={onReset} title="Reset (R)" className="btn-ghost">
          <RotateCcw size={18} />
        </button>
      </div>

      <div
        className={`flex items-center gap-3 text-[11px] text-muted transition-opacity duration-500 ${
          running ? 'opacity-20 hover:opacity-100' : 'opacity-100'
        }`}
      >
        <span className="flex items-center gap-1">
          <span className="kbd">Space</span> Start / Pause
        </span>
        <span className="flex items-center gap-1">
          <span className="kbd">N</span> Skip
        </span>
        <span className="flex items-center gap-1">
          <span className="kbd">R</span> Reset
        </span>
      </div>
    </section>
  )
}