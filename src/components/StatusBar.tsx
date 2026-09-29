import { memo } from 'react'
import { Cloud, CloudOff, RefreshCw } from 'lucide-react'
import type { PhaseId, TimerStatus } from '../types'
import type { SyncStatus } from '../hooks/useSync'
import { useTranslation } from '../hooks/useTranslation'

export interface StatusBarProps {
  mode: 'pomodoro' | 'flow'
  phase: PhaseId
  status: TimerStatus
  task: string
  tag: string
  syncStatus?: SyncStatus
}

export const StatusBar = memo(function StatusBar({
  mode,
  phase,
  status,
  task,
  tag,
  syncStatus,
}: StatusBarProps) {
  const { t } = useTranslation()

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

  return (
    <footer
      role="contentinfo"
      aria-label="Nothing Instrument Panel"
      className="flex h-8 w-full shrink-0 items-center justify-between gap-3 border-t border-line/70 bg-canvas px-3 sm:px-4"
    >
      {/* Left: status readout + phase + optional task */}
      <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
        <span
          className={`inline-flex h-[18px] shrink-0 items-center rounded-full border px-2 font-mono text-[9px] font-bold uppercase leading-none tracking-[0.14em] transition-colors ${
            isRunning
              ? 'border-accent/35 bg-accent/[0.07] text-accent'
              : 'border-line text-muted'
          }`}
        >
          {statusLabel}
        </span>

        <span className="label-sm hidden shrink-0 truncate sm:inline">
          {mode === 'flow' ? 'Flow Session' : t.phases[phase] || phase}
        </span>

        {task ? (
          <span className="min-w-0 truncate text-[11px] text-muted">
            <span className="hidden md:inline">“</span>
            {task}
            <span className="hidden md:inline">”</span>
          </span>
        ) : null}

        {tag ? (
          <span className="num hidden shrink-0 text-[10px] text-muted/70 lg:inline">
            #{tag}
          </span>
        ) : null}
      </div>

      {/* Right: cloud sync micro-icon */}
      {syncStatus ? (
        <div className="flex shrink-0 items-center">
          {syncStatus === 'syncing' ? (
            <RefreshCw
              size={12}
              className="animate-spin text-fg"
              aria-label="Cloud Sync: syncing"
            />
          ) : syncStatus === 'error' ? (
            <CloudOff size={13} className="text-accent" aria-label="Cloud Sync: error" />
          ) : syncStatus === 'offline' ? (
            <CloudOff
              size={13}
              className="text-muted/40"
              aria-label="Cloud Sync: offline"
            />
          ) : (
            <Cloud size={13} className="text-muted/60" aria-label="Cloud Sync: synced" />
          )}
        </div>
      ) : null}
    </footer>
  )
})
