import { memo, useMemo } from 'react'
import { Settings as SettingsIcon } from 'lucide-react'
import type { Session, Settings } from '../../types'
import { weekMinutes } from '../../lib/stats'
import { addDays, sameDay, startOfWeek } from '../../lib/time'
import { BentoCard } from './BentoCard'
import { useTranslation } from '../../hooks/useTranslation'

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
  const { t } = useTranslation()
  const dayLabels = useMemo(() => t.weekdays.map((w) => w.charAt(0)), [t.weekdays])
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
    const mins = Array.from({ length: 7 }, (_, i) => {
      const day = addDays(weekStart, i)
      if (sameDay(day, today)) tIdx = i
      return sessions
        .filter((s) => sameDay(new Date(s.start), day))
        .reduce((sum, s) => {
          const d = s.durationMs
          return sum +
            (typeof d === 'number' && Number.isFinite(d) && d > 0
              ? Math.round(d / 60_000)
              : 0)
        }, 0)
    })
    return { dayMinutes: mins, maxDay: Math.max(1, ...mins), todayIdx: tIdx }
  }, [sessions])

  const goalReached = ratio >= 1

  return (
    <BentoCard
      label={t.dashboard.weeklyGoal}
      indicator={
        goalReached ? (
          <span className="inline-flex h-6 shrink-0 items-center rounded-pill border border-accent/35 bg-accent/[0.07] px-2.5 font-mono text-[10px] uppercase tracking-wider text-accent">
            Reached
          </span>
        ) : null
      }
      action={
        onOpenSettings ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onOpenSettings()
            }}
            title="Edit Weekly Goal"
            aria-label="Edit Weekly Goal"
            className="icon-btn !h-9 !w-9"
          >
            <SettingsIcon size={14} />
          </button>
        ) : null
      }
      className={className}
      contentClassName="justify-between gap-4"
    >
      {/* Headline readout */}
      <div className="flex items-end justify-between gap-3">
        <div className="flex items-baseline gap-1.5">
          <span
            className={`readout text-[clamp(2.5rem,7cqw,3.5rem)] ${
              goalReached ? 'text-accent' : ''
            }`}
          >
            {percentage}
          </span>
          <span className="num text-sm text-muted">%</span>
        </div>
        <span className="num pb-1.5 text-right text-xs text-muted">
          {currentHours}
          <span className="mx-1 opacity-40">/</span>
          {targetHours} h
        </span>
      </div>

      {/* Goal meter — the primary visual, fills remaining height */}
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div
          className="h-1.5 w-full shrink-0 overflow-hidden rounded-full bg-fg/10"
          role="progressbar"
          aria-label={t.dashboard.weeklyGoal}
          aria-valuenow={Math.min(100, percentage)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${
              goalReached ? 'bg-accent' : 'bg-fg'
            }`}
            style={{ width: `${Math.min(100, ratio * 100)}%` }}
          />
        </div>

        {/* 7-Day distribution grows into the leftover space */}
        <div
          className="flex min-h-[56px] flex-1 items-stretch gap-1.5"
          role="img"
          aria-label={`Daily focus this week: ${dayMinutes
            .map((m, i) => `${dayLabels[i]} ${m} minutes`)
            .join(', ')}`}
        >
          {dayMinutes.map((mins, i) => (
            <div
              key={i}
              className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
              title={`${dayLabels[i]}: ${mins} min`}
            >
              {/* Track keeps the column readable even at zero minutes */}
              <div className="flex min-h-0 w-full flex-1 items-end rounded-[3px] bg-fg/[0.05]">
                <div
                  className={`w-full rounded-[3px] transition-[height,background-color] duration-300 ${
                    mins > 0
                      ? i === todayIdx
                        ? 'bg-accent'
                        : 'bg-fg/85'
                      : 'bg-transparent'
                  }`}
                  style={{
                    height: mins > 0 ? `${Math.max(6, (mins / maxDay) * 100)}%` : '0%',
                  }}
                />
              </div>
              <span
                className={`num shrink-0 text-[10px] ${
                  i === todayIdx ? 'text-fg' : 'text-muted'
                }`}
              >
                {dayLabels[i]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </BentoCard>
  )
})
