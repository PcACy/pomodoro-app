import { memo } from 'react'
import { Cloud, CloudOff, RefreshCw } from 'lucide-react'
import type { PhaseId, TimerStatus } from '../types'
import type { ColorMode, ThemeId } from '../themes'
import type { SyncStatus } from '../hooks/useSync'
import { useFlowTimerTick, useTimerTick } from '../hooks/useTimerTick'
import { useTranslation } from '../hooks/useTranslation'

export interface StatusBarProps {
  colorMode?: ColorMode
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
      className="sticky bottom-0 z-30 flex w-full items-center justify-between border-t border-line bg-canvas px-3 sm:px-4 py-2 font-mono text-[11px] text-muted select-none uppercase tracking-wider"
    >
      {/* Left: Status Pill + Phase + Optional Task */}
      <div className="flex items-center gap-2.5 sm:gap-3 overflow-hidden min-w-0">
        <div className="inline-flex items-center justify-center rounded-full border border-line bg-surface px-2.5 py-0.5 text-[10px] font-bold leading-none text-fg tracking-wider shrink-0 shadow-2xs">
          <span>{statusLabel}</span>
        </div>

        <span className="text-fg font-medium truncate hidden sm:inline text-[11px]">
          {mode === 'flow' ? 'FLOW SESSION' : `POMODORO · ${t.phases[phase] || phase}`}
        </span>

        {task && (
          <span className="hidden md:inline text-muted truncate text-[11px]">
            &quot;{task}&quot;
          </span>
        )}

        {tag && (
          <span className="hidden lg:inline rounded-full border border-line px-2 py-0.5 text-[10px] text-muted shrink-0">
            #{tag}
          </span>
        )}
      </div>

      {/* Right: Telemetry (Clean Time, Rounds, Progress, Cloud Sync Micro-Icon) */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 font-mono text-[11px]">
        <span className="text-fg font-bold tabular-nums text-xs sm:text-[12px] tracking-normal">
          {activeTime}
        </span>

        {mode === 'pomodoro' && (
          <>
            <span className="text-muted/30 select-none hidden sm:inline">·</span>
            <span className="hidden sm:inline text-muted tabular-nums text-[10px] sm:text-[11px]">
              R:{completedRounds}/{totalRounds}
            </span>
          </>
        )}

        {mode === 'pomodoro' && (
          <>
            <span className="text-muted/30 select-none hidden md:inline">·</span>
            <span className="hidden md:inline text-fg/80 font-medium tabular-nums text-[10px] sm:text-[11px]">
              {pct}%
            </span>
          </>
        )}

        {syncStatus && (
          <>
            <span className="text-muted/30 select-none hidden sm:inline">·</span>
            <div
              className="flex items-center justify-center text-muted hover:text-fg transition-colors"
              title={`Cloud Sync: ${syncStatus.toUpperCase()}`}
              aria-label={`Cloud Sync: ${syncStatus}`}
            >
              {syncStatus === 'syncing' ? (
                <RefreshCw size={12} className="animate-spin text-fg" />
              ) : syncStatus === 'error' ? (
                <CloudOff size={13} className="text-accent" />
              ) : syncStatus === 'offline' ? (
                <CloudOff size={13} className="text-muted/40" />
              ) : (
                <Cloud size={13} className="text-muted/70 hover:text-fg" />
              )}
            </div>
          </>
        )}
      </div>
    </footer>
  )
})
