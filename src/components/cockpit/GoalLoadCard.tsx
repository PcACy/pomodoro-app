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

  // Circular gauge parameters
  const radius = 38
  const circumference = 2 * Math.PI * radius
  // Gauge sweeps around 270 degrees (starts at 135 deg, ends at 405 deg)
  const arcSweep = 0.75 * circumference
  const strokeDashoffset = arcSweep * (1 - Math.min(1, ratio))

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
      contentClassName="items-center justify-center py-2"
    >
      <div className="relative flex items-center justify-center">
        <svg
          className="w-28 h-28 transform -rotate-90"
          viewBox="0 0 100 100"
          aria-hidden="true"
        >
          {/* Background track */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="7"
            className="text-line/40"
            strokeDasharray={`${arcSweep} ${circumference}`}
            strokeLinecap="round"
            transform="rotate(135 50 50)"
          />
          {/* Active progress arc */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="7"
            className={ratio >= 1 ? 'text-accent' : 'text-fg'}
            strokeDasharray={`${arcSweep} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform="rotate(135 50 50)"
            style={{
              transition: 'stroke-dashoffset 0.4s cubic-bezier(0.2, 0, 0, 1)',
            }}
          />
        </svg>

        {/* Center Percentage Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-2xl font-medium tracking-tight text-fg tabular-nums">
            {percentage}
            <span className="text-xs text-muted font-mono ml-0.5">%</span>
          </span>
        </div>
      </div>

      {/* Subtitle / Details in Hours */}
      <div className="mt-2 text-center font-mono text-[10px] text-muted tracking-wider uppercase">
        {currentHours} / {targetHours} H
      </div>
    </BentoCard>
  )
})
