import { memo } from 'react'
import type { PhaseId, TimerStatus } from '../types'
import { THEMES } from '../themes'
import type { ColorMode, ThemeId } from '../themes'
import type { SyncStatus } from '../hooks/useSync'
import { useFlowTimerTick, useTimerTick } from '../hooks/useTimerTick'
import { useTranslation } from '../hooks/useTranslation'

export interface StatusBarProps {
  colorMode: ColorMode
  themeId?: ThemeId
  mode: 'pomodoro' | 'flow'
  phase: PhaseId
  status: TimerStatus
  time?: string
  progress?: number
  task: string
  tag: string
  completedRounds: number
  totalRounds: number
  syncStatus?: SyncStatus
}

export const StatusBar = memo(function StatusBar({
  colorMode,
  themeId,
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
}: StatusBarProps) {
  const timerTick = useTimerTick()
  const flowTick = useFlowTimerTick()
  const { t } = useTranslation()

  const activeTime = time ?? (mode === 'flow' ? flowTick.time : timerTick.time)
  const activeProgress = progress ?? (mode === 'flow' ? 1 : timerTick.progress)

  const isRunning = status === 'running'
  const isBreak = phase === 'shortBreak' || phase === 'longBreak'

  let statusLabel = 'IDLE'

  if (isRunning) {
    if (mode === 'flow') {
      statusLabel = 'FLOW'
    } else if (isBreak) {
      statusLabel = 'BREAK'
    } else {
      statusLabel = 'FOCUS'
    }
  } else if (status === 'paused') {
    statusLabel = 'PAUSED'
  }

  const pct = Number.isFinite(activeProgress)
    ? Math.round(Math.min(1, Math.max(0, activeProgress)) * 100)
    : 0

  return (
    <footer
      role="contentinfo"
      aria-label="Nothing Instrument Panel"
      className="sticky bottom-0 z-30 flex w-full items-center justify-between border-t border-line bg-canvas px-4 py-2 font-mono text-[11px] text-muted select-none uppercase tracking-wider"
    >
      <div className="flex items-center gap-3 overflow-hidden">
        {/* Status Pill with perfectly centered text */}
        <div className="inline-flex items-center justify-center w-[68px] rounded-full border border-line bg-surface px-2.5 py-1 text-[10px] font-bold leading-none text-fg tracking-wider shrink-0">
          <span>{statusLabel}</span>
        </div>

        <span className="text-fg font-medium truncate hidden sm:inline">
          {mode === 'flow' ? 'FLOW SESSION' : `POMODORO · ${t.phases[phase] || phase}`}
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
        <span className="text-fg font-bold tabular-nums">[{activeTime}]</span>
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
        <span className="hidden sm:inline text-muted/60 text-[10px] tracking-wider uppercase">
          THEME: {themeId ? (THEMES[themeId]?.badge || themeId.toUpperCase()) : `NOTHING-${colorMode}`.toUpperCase()}
        </span>
      </div>
    </footer>
  )
})
