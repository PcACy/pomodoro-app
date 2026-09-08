import { memo, useMemo } from 'react'
import { Settings as SettingsIcon } from 'lucide-react'
import type { Session, Settings } from '../../types'
import { weekMinutes } from '../../lib/stats'
import { addDays, sameDay, startOfWeek } from '../../lib/time'
import { BentoCard } from './BentoCard'

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

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

  // Minutes per weekday (Mon–Sun) for the vertical distribution chart
  const { dayMinutes, maxDay, todayIdx } = useMemo(() => {
    const weekStart = startOfWeek(new Date())
    const today = new Date()
    let tIdx = 0
    const mins = DAY_LABELS.map((_, i) => {
      const day = addDays(weekStart, i)
      if (sameDay(day, today)) tIdx = i
      return sessions
        .filter((s) => sameDay(new Date(s.start), day))
        .reduce((sum, s) => {
          const d = s.durationMs
          return sum + (typeof d === 'number' && Number.isFinite(d) && d > 0 ? Math.round(d / 60_000) : 0)
        }, 0)
    })
    return { dayMinutes: mins, maxDay: Math.max(1, ...mins), todayIdx: tIdx }
  }, [sessions])

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
      {/* Value Display */}
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-1.5">
          <span className={`font-sans text-3xl font-medium tracking-tight tabular-nums ${ratio >= 1 ? 'text-accent' : 'text-fg'}`}>
            {percentage}
          </span>
          <span className="font-mono text-xs text-muted uppercase">%</span>
        </div>
        <span className="font-mono text-[10px] text-muted tracking-wider uppercase tabular-nums">
          {currentHours} / {targetHours} H
        </span>
      </div>

      {/* 7-Day Vertical Distribution (Mon–Sun square bars) */}
      <div
        className="mt-3 flex h-16 items-stretch gap-[3px]"
        role="img"
        aria-label={`Daily focus this week: ${dayMinutes.map((m, i) => `${DAY_LABELS[i]} ${m} minutes`).join(', ')}`}
      >
        {dayMinutes.map((mins, i) => (
          <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1" title={`${mins} MIN`}>
            <div className="flex h-12 w-full items-end">
              <div
                className={`w-full rounded-none transition-colors duration-150 ${mins > 0 ? 'bg-fg' : 'bg-line/40'}`}
                style={{ height: mins > 0 ? `${Math.max(8, Math.round((mins / maxDay) * 100))}%` : '3px' }}
              />
            </div>
            <span
              className={`font-mono text-[8px] tracking-wider uppercase ${
                i === todayIdx ? 'text-fg font-bold' : 'text-muted/70'
              }`}
            >
              {DAY_LABELS[i]}
            </span>
          </div>
        ))}
      </div>
    </BentoCard>
  )
})
