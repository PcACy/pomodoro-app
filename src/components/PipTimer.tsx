import { memo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Pause, Play, SkipForward } from 'lucide-react'
import type { PhaseId, TimerStatus } from '../types'
import type { PipMode } from '../hooks/usePictureInPicture'
import { useTranslation } from '../hooks/useTranslation'
import { useFlowTimerTick, useTimerTick } from '../hooks/useTimerTick'

interface Props {
  mode: PipMode
  pipWindow: Window | null
  phase: PhaseId
  phaseLabel: string
  status: TimerStatus
  time?: string
  isFlow?: boolean
  activeTodo: string
  onToggle: () => void
  onSkip: () => void
}

const BADGE: Record<PhaseId, string> = {
  focus: 'bg-accent/15 text-accent',
  shortBreak: 'bg-break/15 text-break',
  longBreak: 'bg-long/15 text-long',
}

export const PipTimer = memo(function PipTimer({
  mode,
  pipWindow,
  phase,
  phaseLabel,
  status,
  time,
  isFlow = false,
  activeTodo,
  onToggle,
  onSkip,
}: Props) {
  const { t } = useTranslation()
  const timerTick = useTimerTick()
  const flowTick = useFlowTimerTick()

  const activeTime = time ?? (isFlow ? flowTick.time : timerTick.time)

  if (mode !== 'document' || !pipWindow?.document?.body) return null

  const running = status === 'running'

  return createPortal(
    <div className="flex h-full min-h-screen w-full flex-col items-center justify-center gap-2 bg-canvas p-3 text-fg select-none">
      <span
        className={`rounded-full border border-line px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${BADGE[phase]}`}
      >
        {phaseLabel}
      </span>
      <span className="font-display font-bold text-4xl tabular-nums leading-none text-fg">{activeTime}</span>

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
          className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-on-accent transition-colors hover:bg-accent/80 active:scale-95 cursor-pointer shadow-md"
        >
          {running ? <Pause size={18} /> : <Play size={18} className="translate-x-0.5" />}
        </button>
        <button
          type="button"
          onClick={onSkip}
          title={`${t.shortcuts.skip} (N)`}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface text-fg transition-colors hover:bg-raised active:scale-95 cursor-pointer"
        >
          <SkipForward size={14} />
        </button>
      </div>
    </div>,
    pipWindow.document.body,
  )
})

interface CanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement>
  phaseLabel: string
  status: TimerStatus
  time?: string
  isFlow?: boolean
  enabled?: boolean
}

const CANVAS_BG = '#121418'
const CANVAS_FG = '#f5f5f5'

export function renderPipCanvas(
  canvas: HTMLCanvasElement,
  phaseLabel: string,
  status: TimerStatus,
  time: string,
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const dpr = typeof window !== 'undefined' ? Math.max(window.devicePixelRatio || 1, 2) : 2
  const w = canvas.width / dpr
  const h = canvas.height / dpr
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.fillStyle = CANVAS_BG
  ctx.fillRect(0, 0, w, h)

  ctx.textAlign = 'center'
  ctx.fillStyle = '#83a598'
  ctx.font = '600 13px system-ui, -apple-system, sans-serif'
  ctx.fillText(phaseLabel.toUpperCase(), w / 2, h / 2 - 28)

  ctx.fillStyle = CANVAS_FG
  ctx.font = '700 36px ui-monospace, SFMono-Regular, monospace'
  ctx.fillText(time, w / 2, h / 2 + 8)

  ctx.fillStyle = status === 'running' ? '#8ec07c' : '#fabd2f'
  ctx.font = '500 12px system-ui, -apple-system, sans-serif'
  ctx.fillText(status === 'running' ? '● RUNNING' : '❚❚ PAUSED', w / 2, h / 2 + 34)
}

/** Renders the timer onto the hidden canvas that feeds the video-PiP fallback stream on demand only. */
export const PipCanvas = memo(function PipCanvas({ canvasRef, phaseLabel, status, time, isFlow = false, enabled = true }: CanvasProps) {
  const timerTick = useTimerTick()
  const flowTick = useFlowTimerTick()
  const activeTime = time ?? (isFlow ? flowTick.time : timerTick.time)
  const lastStateRef = useRef<string>('')

  useEffect(() => {
    if (!enabled) {
      lastStateRef.current = ''
      return
    }
    const canvas = canvasRef.current
    if (!canvas) return

    const key = `${phaseLabel}:${status}:${activeTime}`
    if (lastStateRef.current === key) return
    lastStateRef.current = key

    renderPipCanvas(canvas, phaseLabel, status, activeTime)
  }, [canvasRef, phaseLabel, status, activeTime, enabled])

  return null
})