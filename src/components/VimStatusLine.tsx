import { memo } from 'react'
import type { PhaseId, TimerStatus } from '../types'
import type { ColorMode, ThemeId } from '../themes'

interface VimStatusLineProps {
  themeId: ThemeId
  colorMode: ColorMode
  mode: 'pomodoro' | 'flow'
  phase: PhaseId
  status: TimerStatus
  time: string
  progress: number
  task: string
  tag: string
  completedRounds: number
  totalRounds: number
}

// Memoized: all props are primitives, so this leaf only re-renders when its
// own inputs change — not on unrelated App-level updates.
export const VimStatusLine = memo(function VimStatusLine({
  themeId,
  colorMode,
  mode,
  phase,
  status,
  time,
  progress,
  task,
  tag,
  completedRounds,
  totalRounds,
}: VimStatusLineProps) {
  if (themeId !== 'gruvbox') return null

  const isRunning = status === 'running'
  const isBreak = phase === 'shortBreak' || phase === 'longBreak'

  let modeTag = '[NORMAL]'
  let modeBg = 'bg-raised text-fg'

  if (isRunning) {
    if (mode === 'flow') {
      modeTag = '[FLOW]'
      modeBg = 'bg-accent text-on-accent font-bold'
    } else if (isBreak) {
      modeTag = '[REST]'
      modeBg = 'bg-break text-canvas font-bold'
    } else {
      modeTag = '[INSERT]'
      modeBg = 'bg-accent text-on-accent font-bold'
    }
  } else if (status === 'paused') {
    modeTag = '[PAUSED]'
    modeBg = 'bg-accent-strong text-white font-bold'
  }

  const pct = Math.round(progress * 100)

  return (
    <footer
      role="contentinfo"
      aria-label="Vim Statusline"
      className="sticky bottom-0 z-30 flex w-full items-center justify-between border-t border-line/70 bg-surface/95 px-3 py-1 font-mono text-[11px] text-muted backdrop-blur-sm select-none"
    >
      <div className="flex items-center gap-2 overflow-hidden">
        <span className={`rounded-sm px-1.5 py-0.5 uppercase tracking-wider text-[10px] ${modeBg}`}>
          {modeTag}
        </span>
        <span className="text-fg font-medium truncate">
          pomau://{mode}/{phase === 'focus' ? 'focus' : isBreak ? 'break' : phase}
        </span>
        {task && (
          <span className="hidden sm:inline text-muted/80 truncate">
            &quot;{task}&quot;
          </span>
        )}
        {tag && (
          <span className="hidden md:inline rounded border border-line px-1 text-[10px] text-accent">
            +{tag}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span className="text-fg font-bold tabular-nums">[{time}]</span>
        {mode === 'pomodoro' && (
          <span className="hidden sm:inline text-muted">
            R:{completedRounds}/{totalRounds}
          </span>
        )}
        <span className="hidden md:inline text-muted/70">utf-8</span>
        <span className="text-accent font-medium tabular-nums">{pct}%</span>
        <span className="hidden lg:inline text-muted/60">{themeId}-{colorMode}</span>
      </div>
    </footer>
  )
})
