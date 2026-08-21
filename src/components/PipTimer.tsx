import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Pause, Play, SkipForward } from 'lucide-react'
import type { PhaseId, TimerStatus } from '../types'
import type { PipMode } from '../hooks/usePictureInPicture'
import { useTranslation } from '../hooks/useTranslation'

interface Props {
  mode: PipMode
  pipWindow: Window | null
  phase: PhaseId
  phaseLabel: string
  status: TimerStatus
  time: string
  activeTodo: string
  onToggle: () => void
  onSkip: () => void
}

const BADGE: Record<PhaseId, string> = {
  focus: 'bg-accent/15 text-accent',
  shortBreak: 'bg-break/15 text-break',
  longBreak: 'bg-long/15 text-long',
}

export function PipTimer({ mode, pipWindow, phase, phaseLabel, status, time, activeTodo, onToggle, onSkip }: Props) {
  const { t } = useTranslation()
  if (mode !== 'document' || !pipWindow?.document?.body) return null

  const running = status === 'running'

  return createPortal(
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-2 bg-canvas p-3 text-fg">
      <span
        className={`rounded-full border border-line px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${BADGE[phase]}`}
      >
        {phaseLabel}
      </span>
      <span className="font-mono text-4xl font-bold tabular-nums leading-none text-fg">{time}</span>

      {activeTodo && (
        <span className="max-w-full truncate text-xs text-muted" title={activeTodo}>
          {activeTodo}
        </span>
      )}

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

interface CanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement>
  phaseLabel: string
  status: TimerStatus
  time: string
  enabled?: boolean
}

const CANVAS_BG = '#0b0d12'
const CANVAS_FG = '#f5f5f5'

/** Renders the timer onto the hidden canvas that feeds the video-PiP fallback stream. */
export function PipCanvas({ canvasRef, phaseLabel, status, time, enabled = true }: CanvasProps) {
  // Bolt Optimization: Skip offscreen 2D canvas drawing when video PiP is inactive.
  // When video PiP is disabled (default state), rendering onto canvas on every 250ms tick
  // wastes CPU/GPU resources and triggers unnecessary 2D context updates.
  useEffect(() => {
    if (!enabled) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const w = canvas.width / dpr
    const h = canvas.height / dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = CANVAS_BG
    ctx.fillRect(0, 0, w, h)
    ctx.textAlign = 'center'
    ctx.fillStyle = '#83a598'
    ctx.font = '600 14px system-ui, sans-serif'
    ctx.fillText(phaseLabel.toUpperCase(), w / 2, h / 2 - 26)
    ctx.fillStyle = CANVAS_FG
    ctx.font = '700 34px ui-monospace, monospace'
    ctx.fillText(time, w / 2, h / 2 + 10)
    ctx.fillStyle = status === 'running' ? '#8ec07c' : '#928374'
    ctx.font = '500 12px system-ui, sans-serif'
    ctx.fillText(status === 'running' ? '●' : '❚❚', w / 2, h / 2 + 34)
  }, [canvasRef, phaseLabel, status, time, enabled])

  return null
}