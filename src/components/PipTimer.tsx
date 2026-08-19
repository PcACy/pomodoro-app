import { createPortal } from 'react-dom'
import { Pause, Play, SkipForward } from 'lucide-react'
import type { PhaseId, TimerStatus } from '../types'
import { useTranslation } from '../hooks/useTranslation'

interface Props {
  pipWindow: Window | null
  phase: PhaseId
  phaseLabel: string
  status: TimerStatus
  time: string
  onToggle: () => void
  onSkip: () => void
}

const BADGE: Record<PhaseId, string> = {
  focus: 'bg-accent/15 text-accent',
  shortBreak: 'bg-break/15 text-break',
  longBreak: 'bg-long/15 text-long',
}

export function PipTimer({ pipWindow, phase, phaseLabel, status, time, onToggle, onSkip }: Props) {
  const { t } = useTranslation()
  if (!pipWindow?.document?.body) return null

  const running = status === 'running'

  return createPortal(
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-2 bg-canvas p-3 text-fg">
      <span
        className={`rounded-full border border-line px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${BADGE[phase]}`}
      >
        {phaseLabel}
      </span>
      <span className="font-mono text-4xl font-bold tabular-nums leading-none text-fg">{time}</span>

      <div className="mt-1 flex items-center gap-2">
        <button
          type="button"
          onClick={onToggle}
          title={running ? t.timer.pause : t.timer.start}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-on-accent transition-colors hover:bg-accent-strong active:scale-95"
        >
          {running ? <Pause size={20} /> : <Play size={20} className="translate-x-0.5" />}
        </button>
        <button
          type="button"
          onClick={onSkip}
          title={`${t.shortcuts.skip} (N)`}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-fg transition-colors hover:bg-raised"
        >
          <SkipForward size={16} />
        </button>
      </div>
    </div>,
    pipWindow.document.body,
  )
}