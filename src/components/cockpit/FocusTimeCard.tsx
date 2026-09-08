import { memo } from 'react'
import type { Session, Settings } from '../../types'
import { currentStreakDays, todayMinutes } from '../../lib/stats'
import { BentoCard } from './BentoCard'

interface FocusTimeCardProps {
  sessions: Session[]
  settings: Settings
  className?: string
}

const TOTAL_BLOCKS = 14

export const FocusTimeCard = memo(function FocusTimeCard({
  sessions,
  settings,
  className = '',
}: FocusTimeCardProps) {
  const currentMinutes = todayMinutes(sessions)
  const targetMinutes = Math.round(settings.weeklyGoalMinutes / 5) || 120
  const hours = (currentMinutes / 60).toFixed(1)
  const targetHours = (targetMinutes / 60).toFixed(1)
  const ratio = Math.max(0, currentMinutes / targetMinutes)
  const filledBlocks = Math.min(
    TOTAL_BLOCKS,
    Math.max(0, Math.round(ratio * TOTAL_BLOCKS)),
  )

  const streak = currentStreakDays(sessions)

  return (
    <BentoCard
      label="FOCUS TIME"
      action={
        streak > 0 ? (
          <span className="font-mono text-[9px] px-1.5 py-0.5 rounded-full border border-line bg-canvas text-accent tracking-wider uppercase">
            {streak}D STREAK
          </span>
        ) : null
      }
      className={className}
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
          aria-valuenow={Math.round(ratio * 100)}
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
