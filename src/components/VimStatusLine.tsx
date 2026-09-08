import { memo } from 'react'
import type { PhaseId, TimerStatus } from '../types'
import type { ColorMode } from '../themes'
import type { SyncStatus } from '../hooks/useSync'

interface VimStatusLineProps {
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
  syncStatus?: SyncStatus
}

// Memoized: all props are primitives, so this leaf only re-renders when its
// own inputs change — not on unrelated App-level updates.
export const VimStatusLine = memo(function VimStatusLine({
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
  syncStatus,
}: VimStatusLineProps) {
  const isRunning = status === 'running'
  const isBreak = phase === 'shortBreak' || phase === 'longBreak'

  let statusLabel = 'IDLE'
  let dotColor = 'bg-muted/40'

  if (isRunning) {
    if (mode === 'flow') {
      statusLabel = 'FLOW'
      dotColor = 'bg-accent animate-pulse'
    } else if (isBreak) {
      statusLabel = 'BREAK'
      dotColor = 'bg-success'
    } else {
      statusLabel = 'FOCUS'
      dotColor = 'bg-accent animate-pulse'
    }
  } else if (status === 'paused') {
    statusLabel = 'PAUSED'
    dotColor = 'bg-warning'
  }

  const pct = Math.round(progress * 100)

  return (
    <footer
      role="contentinfo"
      aria-label="Nothing Instrument Panel"
      className="sticky bottom-0 z-30 flex w-full items-center justify-between border-t border-line bg-canvas/95 px-4 py-2 font-mono text-[11px] text-muted select-none uppercase tracking-wider"
    >
      <div className="flex items-center gap-3 overflow-hidden">
        {/* Status Pill with Signal Dot */}
        <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-2.5 py-0.5 text-[10px] text-fg font-bold shrink-0">
          <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
          <span>{statusLabel}</span>
        </div>

        <span className="text-fg font-medium truncate hidden sm:inline">
          {mode === 'flow' ? 'FLOW SESSION' : `POMODORO // ${phase}`}
        </span>

        {task && (
          <span className="hidden md:inline text-muted truncate">
            &quot;{task}&quot;
          </span>
        )}

        {tag && (
          <span className="hidden lg:inline rounded-full border border-line px-2 py-0.5 text-[10px] text-muted">
            #{tag}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0 font-mono text-xs">
        <span className="text-fg font-bold tabular-nums">[{time}]</span>
        {mode === 'pomodoro' && (
          <span className="hidden sm:inline text-muted tabular-nums">
            R:{completedRounds}/{totalRounds}
          </span>
        )}
        {mode === 'pomodoro' && (
          <span className="hidden md:inline text-fg font-medium tabular-nums">
            {pct}%
          </span>
        )}
        <span className="text-muted/40 hidden sm:inline">|</span>
        {syncStatus && (
          <span className="hidden lg:inline text-muted/60 text-[10px]">
            SYNC:{syncStatus}
          </span>
        )}
        <span className="hidden sm:inline text-muted/60 text-[10px]">
          NOTHING-{colorMode}
        </span>
      </div>
    </footer>
  )
})
