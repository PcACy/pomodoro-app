import { memo } from 'react'
import { Cloud, CloudOff, RefreshCw } from 'lucide-react'
import type { PhaseId, TimerStatus } from '../types'
import type { ColorMode } from '../themes'
import type { SyncStatus } from '../hooks/useSync'
import { getTagColor } from './TodoList'

export interface GlassLiveActivityBarProps {
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

export const GlassLiveActivityBar = memo(function GlassLiveActivityBar({
  mode,
  phase,
  status,
  time,
  task,
  tag,
  completedRounds,
  totalRounds,
  syncStatus,
}: GlassLiveActivityBarProps) {
  const isRunning = status === 'running'
  const isPaused = status === 'paused'

  // Live indicator Dot & Phase Name
  let dotColor = 'bg-accent'
  let phaseName = 'Focus'

  if (mode === 'flow') {
    dotColor = isRunning ? 'bg-accent' : 'bg-muted'
    phaseName = 'Flow'
  } else if (phase === 'shortBreak') {
    dotColor = isRunning ? 'bg-break' : 'bg-muted'
    phaseName = 'Short Break'
  } else if (phase === 'longBreak') {
    dotColor = isRunning ? 'bg-long' : 'bg-muted'
    phaseName = 'Long Break'
  } else {
    dotColor = isRunning ? 'bg-accent' : 'bg-muted'
    phaseName = 'Focus'
  }

  const tagColor = tag ? getTagColor(tag) : null

  return (
    <footer
      role="contentinfo"
      aria-label="Live Activity Status"
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 max-w-fit pointer-events-none select-none px-4"
    >
      <div className="pointer-events-auto flex items-center justify-between gap-3 max-w-fit mx-auto px-4 py-2 rounded-full bg-surface/80 border border-white/10 dark:border-white/15 backdrop-blur-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] text-xs transition-all duration-300">
        {/* Left: Live indicator + Phase name */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="relative flex h-2 w-2">
            {isRunning && (
              <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${dotColor}`}
              />
            )}
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${dotColor} ${
                isRunning ? 'shadow-[0_0_8px_currentColor]' : ''
              }`}
            />
          </span>
          <span className="font-semibold text-fg tracking-tight">
            {isPaused ? `${phaseName} (Pausiert)` : phaseName}
          </span>
        </div>

        {/* Center: Task name or Tag Chip */}
        <div className="flex items-center gap-1.5 overflow-hidden min-w-0 mx-2">
          {tag && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-raised text-fg border border-line/60 shrink-0">
              <span
                className="h-1.5 w-1.5 rounded-full shrink-0"
                style={{ backgroundColor: tagColor || '#8ec07c' }}
              />
              <span className="truncate max-w-[70px] sm:max-w-[100px]">{tag}</span>
            </span>
          )}
          {task && (
            <span className="text-muted/80 truncate text-[11px] hidden xs:inline" title={task}>
              {task}
            </span>
          )}
        </div>

        {/* Right: Digits + Rounds + Cloud Sync */}
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="font-mono font-bold tabular-nums text-fg text-xs sm:text-sm">
            {time}
          </span>

          {mode === 'pomodoro' && totalRounds > 0 && (
            <div className="hidden sm:flex items-center gap-1" title={`Runde ${completedRounds}/${totalRounds}`}>
              {Array.from({ length: totalRounds }).map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 w-1.5 rounded-full transition-colors ${
                    i < completedRounds ? 'bg-accent' : 'bg-muted/40'
                  }`}
                />
              ))}
            </div>
          )}

          {syncStatus && syncStatus !== 'unsupported' && (
            <span className="text-muted/60" title={`Sync: ${syncStatus}`}>
              {syncStatus === 'syncing' ? (
                <RefreshCw size={11} className="animate-spin text-accent" />
              ) : syncStatus === 'synced' ? (
                <Cloud size={12} className="text-accent/80" />
              ) : syncStatus === 'offline' ? (
                <CloudOff size={12} />
              ) : (
                <Cloud size={12} />
              )}
            </span>
          )}
        </div>
      </div>
    </footer>
  )
})
