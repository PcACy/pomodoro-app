import { memo } from 'react'
import { Settings as SettingsIcon } from 'lucide-react'
import type { Session, Settings } from '../../types'
import { weekMinutes } from '../../lib/stats'
import { BentoCard } from './BentoCard'

interface GoalLoadCardProps {
  sessions: Session[]
  settings: Settings
  onOpenSettings?: () => void
  className?: string
}

export const GoalLoadCard = memo(function GoalLoadCard({
  sessions,
  settings,
  onOpenSettings,
  className = '',
}: GoalLoadCardProps) {
  const currentWeekMinutes = weekMinutes(sessions)
  const targetWeekMinutes = Math.max(60, settings.weeklyGoalMinutes || 300)
  const ratio = Math.max(0, currentWeekMinutes / targetWeekMinutes)
  const percentage = Math.min(999, Math.round(ratio * 100))

  const currentHours = (currentWeekMinutes / 60).toFixed(1)
  const targetHours = (targetWeekMinutes / 60).toFixed(1)

  const SEGMENTS = 20
  const filled = Math.min(SEGMENTS, Math.max(0, Math.round(Math.min(1, ratio) * SEGMENTS)))

  return (
    <BentoCard
      label="WEEKLY GOAL"
      action={
        onOpenSettings ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onOpenSettings()
            }}
            title="Edit Weekly Goal"
            className="text-muted hover:text-fg transition-colors p-0.5 cursor-pointer"
          >
            <SettingsIcon size={12} />
          </button>
        ) : null
      }
      onClick={onOpenSettings}
      className={`${onOpenSettings ? 'cursor-pointer hover:border-fg/30 transition-colors' : ''} ${className}`}
      contentClassName="justify-between py-2"
    >
      {/* Center Value Display */}
      <div className="flex items-baseline gap-1.5">
        <span className="font-sans text-3xl font-medium tracking-tight text-fg tabular-nums">
          {percentage}
        </span>
        <span className="font-mono text-xs text-muted uppercase">%</span>
      </div>

      {/* Segmented Mechanical Progress Bar */}
      <div className="mt-3 flex h-2 w-full gap-[2px]" role="progressbar" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100}>
        {Array.from({ length: SEGMENTS }).map((_, i) => (
          <div
            key={i}
            className={`flex-1 rounded-none transition-colors duration-150 ${
              i < filled ? (ratio >= 1 ? 'bg-accent' : 'bg-fg') : 'bg-line/40'
            }`}
          />
        ))}
      </div>

      {/* Subtitle / Details in Hours */}
      <div className="mt-2 text-center font-mono text-[10px] text-muted tracking-wider uppercase">
        {currentHours} / {targetHours} H
      </div>
    </BentoCard>
  )
})
