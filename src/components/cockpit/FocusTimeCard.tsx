import { memo } from 'react'
import { Settings as SettingsIcon } from 'lucide-react'
import type { Session, Settings } from '../../types'
import { currentStreakDays, todayMinutes } from '../../lib/stats'
import { BentoCard } from './BentoCard'

interface FocusTimeCardProps {
  sessions: Session[]
  settings: Settings
  onOpenSettings?: () => void
  className?: string
}

const TOTAL_BLOCKS = 14

export const FocusTimeCard = memo(function FocusTimeCard({
  sessions,
  settings,
  onOpenSettings,
  className = '',
}: FocusTimeCardProps) {
  const currentMinutes = todayMinutes(sessions)
  const targetMinutes = Math.max(15, settings.dailyGoalMinutes || 120)
  const hours = (currentMinutes / 60).toFixed(1)
  const targetHours = (targetMinutes / 60).toFixed(1)
  const ratio = Math.max(0, currentMinutes / targetMinutes)
  const clampedPct = Math.min(100, Math.round(ratio * 100))
  const filledBlocks = Math.min(
    TOTAL_BLOCKS,
    Math.max(0, Math.round(ratio * TOTAL_BLOCKS)),
  )

  const streak = currentStreakDays(sessions)

  return (
    <BentoCard
      label="DAILY FOCUS"
      action={
        <div className="flex items-center gap-1.5">
          {streak > 0 && (
            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded-full border border-line bg-canvas text-accent tracking-wider uppercase">
              {streak}D STREAK
            </span>
          )}
          {onOpenSettings && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onOpenSettings()
              }}
              title="Edit Daily Goal"
              className="text-muted hover:text-fg transition-colors p-0.5 cursor-pointer"
            >
              <SettingsIcon size={12} />
            </button>
          )}
        </div>
      }
      onClick={onOpenSettings}
      className={`${onOpenSettings ? 'cursor-pointer hover:border-fg/30 transition-colors' : ''} ${className}`}
      contentClassName="justify-between"
    >
      <div className="my-auto">
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-4xl font-medium tracking-tight text-fg tabular-nums">
            {hours}
          </span>
          <span className="font-mono text-xs text-muted uppercase">H</span>
        </div>
        <div className="font-mono text-[10px] text-muted tracking-wider uppercase mt-0.5">
          / {targetHours} H TARGET
        </div>
      </div>

      {/* Discrete Segmented Memory-Style Meter */}
      <div className="mt-4">
        <div
          className="flex h-2 w-full gap-0.5"
          role="progressbar"
          aria-valuenow={clampedPct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          {Array.from({ length: TOTAL_BLOCKS }).map((_, i) => (
            <div
              key={i}
              className={`flex-1 transition-colors duration-150 ${
                i < filledBlocks ? 'bg-fg' : 'bg-line/40'
              }`}
            />
          ))}
        </div>
      </div>
    </BentoCard>
  )
})
