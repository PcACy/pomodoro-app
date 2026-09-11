import { memo, useMemo } from 'react'
import type { Session } from '../../types'
import { BentoCard } from './BentoCard'
import { currentStreakDays } from '../../lib/stats'
import { addDays, dayKey, sameDay, startOfWeek } from '../../lib/time'
import { playMicroClick } from '../../lib/sound'

interface SystemStatusCardProps {
  sessions: Session[]
  onOpenAnalyticsModal?: () => void
  className?: string
}

const WEEK_DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export const SystemStatusCard = memo(function SystemStatusCard({
  sessions = [],
  onOpenAnalyticsModal,
  className = '',
}: SystemStatusCardProps) {
  const streak = currentStreakDays(sessions)
  // Day-granular cache key: `new Date()` inline would defeat the memo below
  // (fresh object identity each render) and go stale after midnight; the key
  // string is stable within a day and changes exactly when it must recompute.
  const todayKey = dayKey(new Date())

  const { dayLogged, activeDaysThisWeek, hasLoggedToday, weekStart, today } = useMemo(() => {
    // Reconstructed from the day key (local midnight): sameDay/startOfWeek
    // only compare calendar days, so midnight is exactly equivalent — and the
    // memo now genuinely depends on `todayKey`, recomputing at day rollover.
    const [y, m, d] = todayKey.split('-').map(Number)
    const today = new Date(y, (m ?? 1) - 1, d)
    const weekStart = startOfWeek(today)
    const logged = WEEK_DAYS.map((_, i) => {
      const dayDate = addDays(weekStart, i)
      return sessions.some((s) => sameDay(new Date(s.start), dayDate))
    })
    const count = logged.filter(Boolean).length
    const todayActive = sessions.some((s) => sameDay(new Date(s.start), today))

    return {
      dayLogged: logged,
      activeDaysThisWeek: count,
      hasLoggedToday: todayActive,
      weekStart,
      today,
    }
  }, [sessions, todayKey])

  return (
    <BentoCard
      label="Daily Streak"
      action={
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            playMicroClick('tap')
            onOpenAnalyticsModal?.()
          }}
          className="font-sans text-xs text-muted/90 hover:text-fg font-medium transition-colors cursor-pointer py-1 px-1.5"
          title="Open detailed analytics"
        >
          Stats ↗
        </button>
      }
      className={`rounded-[28px] ${className}`}
      contentClassName="justify-between h-full"
    >
      {/* Top: Digit + Circuit Status + Glyph Ring */}
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <span className="font-sans text-3xl sm:text-4xl font-semibold text-fg tracking-tight tabular-nums">
            {streak}
          </span>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#EB1E23] animate-pulse" />
              <span className="font-sans text-xs text-fg font-medium">
                {streak === 1 ? 'Day streak' : 'Days streak'}
              </span>
            </div>
            <span className="font-sans text-[11px] text-muted">
              Circuit: {hasLoggedToday ? 'Closed' : 'Standby'}
            </span>
          </div>
        </div>

        {/* Nothing OS Radial Glyph Ring (7 arc segments for days of week) */}
        <div className="relative h-11 w-11 shrink-0 flex items-center justify-center select-none" aria-hidden="true">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 44 44">
            <circle
              cx="22"
              cy="22"
              r="17"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="text-black/10 dark:text-white/10"
            />
            <circle
              cx="22"
              cy="22"
              r="17"
              fill="none"
              stroke={hasLoggedToday ? '#EB1E23' : 'currentColor'}
              strokeWidth="2.5"
              strokeDasharray="106.8"
              strokeDashoffset={106.8 - (106.8 * Math.min(7, activeDaysThisWeek)) / 7}
              strokeLinecap="round"
              className={`transition-all duration-500 ${hasLoggedToday ? 'text-[#EB1E23]' : 'text-fg/50'}`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center font-sans text-[10px] text-muted font-medium tabular-nums">
            {activeDaysThisWeek}/7
          </div>
        </div>
      </div>

      {/* Middle: PCB Trace / Connected Circuit with 44px Tap Hitboxes */}
      <div className="w-full flex flex-col gap-1 my-1.5 select-none">
        {/* Horizontal PCB Trace with 7 Pads & Labels */}
        <div className="relative w-full flex items-center justify-between px-1">
          {/* Inactive Base Trace Line */}
          <div className="absolute left-[18px] right-[18px] top-[26px] h-[1.5px] bg-black/10 dark:bg-white/10 z-0" />

          {/* Active Connected Circuit Segments */}
          <div className="absolute left-[18px] right-[18px] top-[26px] h-[1.5px] z-[1] pointer-events-none">
            {Array.from({ length: 6 }).map((_, i) => {
              const isConnected = dayLogged[i] && dayLogged[i + 1]
              if (!isConnected) return null
              return (
                <div
                  key={i}
                  className="absolute top-0 h-full bg-[#EB1E23] transition-colors duration-200"
                  style={{
                    left: `${(i / 6) * 100}%`,
                    width: `${(1 / 6) * 100}%`,
                  }}
                />
              )
            })}
          </div>

          {/* 7 Touch-Friendly Day Columns (min-h-[44px]) */}
          {WEEK_DAYS.map((dayName, i) => {
            const isCurrentDay = sameDay(addDays(weekStart, i), today)
            const hasLogged = dayLogged[i]

            return (
              <div
                key={i}
                title={`${dayName}: ${hasLogged ? 'Logged' : 'No sessions'}`}
                className="relative z-10 flex flex-col items-center justify-center min-h-[44px] min-w-[32px] sm:min-w-[36px] py-1 rounded-lg transition-colors hover:bg-white/[0.04]"
              >
                {/* Pad */}
                <div
                  className={`h-3 w-3 rounded-full transition-all duration-150 mb-1.5 ${
                    hasLogged
                      ? 'bg-[#EB1E23] border border-[#EB1E23]'
                      : 'bg-surface dark:bg-[#0c0c0c] border border-black/20 dark:border-white/20'
                  } ${
                    isCurrentDay
                      ? 'ring-2 ring-fg/40 dark:ring-white/40 ring-offset-2 ring-offset-surface dark:ring-offset-black'
                      : ''
                  }`}
                />
                {/* Day Label */}
                <span
                  className={`font-sans text-[11px] ${
                    isCurrentDay ? 'text-fg dark:text-white font-semibold' : 'text-neutral-500'
                  }`}
                >
                  {dayName}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Bottom Row: Weekly consistency metric */}
      <div className="flex items-center justify-between font-sans text-xs text-muted pt-2 border-t border-line/40">
        <span>Active days</span>
        <span className="text-fg/90 font-medium tabular-nums">
          {activeDaysThisWeek} of 7 days
        </span>
      </div>
    </BentoCard>
  )
})

