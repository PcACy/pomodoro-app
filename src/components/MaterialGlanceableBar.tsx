import { memo } from 'react'
import { Cloud, CloudOff, Flame, RefreshCw, Timer } from 'lucide-react'
import type { PhaseId, TimerStatus } from '../types'
import type { ColorMode } from '../themes'
import type { SyncStatus } from '../hooks/useSync'
import { getTagColor } from './TodoList'

export interface MaterialGlanceableBarProps {
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

export const MaterialGlanceableBar = memo(function MaterialGlanceableBar({
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
}: MaterialGlanceableBarProps) {
  const pct = Math.round(progress * 100)

  let chipLabel = mode === 'flow' ? 'Flow' : phase === 'focus' ? 'Focus' : 'Break'
  if (status === 'paused') chipLabel += ' (Pausiert)'

  const tagColor = tag ? getTagColor(tag) : null

  return (
    <footer
      role="contentinfo"
      aria-label="Material Glanceable Bar"
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 max-w-fit pointer-events-none select-none px-4"
    >
      <div className="pointer-events-auto flex items-center justify-between gap-3 max-w-fit mx-auto px-4 sm:px-5 py-2.5 rounded-full bg-surface text-fg shadow-[0_10px_30px_rgba(0,0,0,0.5)] text-xs transition-all duration-300">
        {/* Left: M3 Tonal Chip */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container font-medium text-xs">
            {mode === 'flow' ? (
              <Flame size={13} className="shrink-0" />
            ) : (
              <Timer size={13} className="shrink-0" />
            )}
            <span>{chipLabel}</span>
          </div>
        </div>

        {/* Center: Task / Tag */}
        <div className="flex items-center gap-1.5 overflow-hidden min-w-0 mx-2">
          {tag && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium shrink-0">
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: tagColor || '#8ec07c' }}
              />
              <span className="truncate max-w-[70px] sm:max-w-[100px]">{tag}</span>
            </span>
          )}
          {task && (
            <span className="truncate text-muted/80 text-[11px] hidden sm:inline" title={task}>
              {task}
            </span>
          )}
        </div>

        {/* Right: Digits + Progress percentage + Sync */}
        <div className="flex items-center gap-2.5 shrink-0 font-medium">
          <span className="font-bold tabular-nums text-fg text-xs sm:text-sm">
            {time}
          </span>
          {mode === 'pomodoro' ? (
            <>
              {totalRounds > 0 && (
                <span className="text-muted text-[11px] tabular-nums" title={`Runde ${completedRounds}/${totalRounds}`}>
                  R:{completedRounds}/{totalRounds}
                </span>
              )}
              <span className="text-muted text-[11px] tabular-nums">
                {pct}%
              </span>
            </>
          ) : (
            <span className="text-accent text-[11px] font-medium tracking-wide">
              {status === 'running' ? 'ACTIVE' : status === 'paused' ? 'PAUSED' : 'IDLE'}
            </span>
          )}

          {syncStatus && syncStatus !== 'unsupported' && (
            <span className="text-muted/70" title={`Sync: ${syncStatus}`}>
              {syncStatus === 'syncing' ? (
                <RefreshCw size={12} className="animate-spin text-accent" />
              ) : syncStatus === 'synced' ? (
                <Cloud size={13} className="text-accent" />
              ) : syncStatus === 'offline' ? (
                <CloudOff size={13} />
              ) : (
                <Cloud size={13} />
              )}
            </span>
          )}
        </div>
      </div>
    </footer>
  )
})
