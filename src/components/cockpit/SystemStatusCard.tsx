import { memo, useMemo } from 'react'
import type { Session } from '../../types'
import { BentoCard } from './BentoCard'
import { currentStreakDays } from '../../lib/stats'
import { addDays, sameDay, startOfWeek } from '../../lib/time'
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
  const today = new Date()
  const weekStart = startOfWeek(today)

  const { dayLogged, activeDaysThisWeek, hasLoggedToday } = useMemo(() => {
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
    }
  }, [sessions, weekStart, today])

  return (
    <BentoCard
      label="DAILY STREAK"
      action={
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            playMicroClick('tap')
            onOpenAnalyticsModal?.()
          }}
          className="font-mono text-[9px] text-muted hover:text-fg tracking-wider uppercase transition-colors cursor-pointer"
          title="Open detailed analytics"
        >
          STATS ↗
        </button>
      }
      className={`cursor-pointer hover:border-fg/30 transition-colors ${className}`}
      contentClassName="justify-between h-full"
      onClick={() => {
        playMicroClick('tap')
        onOpenAnalyticsModal?.()
      }}
    >
      {/* Top: Digit + Circuit Status */}
      <div className="flex items-center gap-2.5">
        <span className="font-sans text-3xl sm:text-4xl font-medium text-fg tracking-tight tabular-nums">
          {streak}
        </span>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#EB1E23] animate-pulse" />
            <span className="font-mono text-[10px] text-fg font-medium tracking-wider uppercase">
              {streak === 1 ? 'DAY STREAK' : 'DAYS STREAK'}
            </span>
          </div>
          <span className="font-mono text-[9px] text-muted tracking-wider uppercase">
            CIRCUIT: {hasLoggedToday ? 'CLOSED' : 'OPEN'}
          </span>
        </div>
      </div>

      {/* Middle: PCB Trace / Connected Circuit */}
      <div className="w-full flex flex-col gap-2 my-2 select-none">
        {/* Weekday labels */}
        <div className="w-full flex items-center justify-between px-2">
          {WEEK_DAYS.map((dayName, i) => {
            const isCurrentDay = sameDay(addDays(weekStart, i), today)
            return (
              <span
                key={i}
                className={`w-3 text-center font-mono text-[11px] tracking-wider uppercase ${
                  isCurrentDay ? 'text-fg dark:text-white font-medium' : 'text-neutral-500'
                }`}
              >
                {dayName}
              </span>
            )
          })}
        </div>

        {/* Horizontal PCB Trace with 7 Pads */}
        <div className="relative w-full flex items-center justify-between px-2 my-1">
          {/* Inactive Base Trace Line */}
          <div className="absolute left-[14px] right-[14px] top-1/2 -translate-y-1/2 h-[1.5px] bg-black/10 dark:bg-white/10 z-0" />

          {/* Active Connected Circuit Segments */}
          <div className="absolute left-[14px] right-[14px] top-1/2 -translate-y-1/2 h-[1.5px] z-[1] pointer-events-none">
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

          {/* 7 Circular Contact Pads */}
          {WEEK_DAYS.map((dayName, i) => {
            const isCurrentDay = sameDay(addDays(weekStart, i), today)
            const hasLogged = dayLogged[i]

            return (
              <div
                key={i}
                title={`${dayName}: ${hasLogged ? 'LOGGED' : 'INACTIVE'}`}
                className={`relative z-10 h-3 w-3 rounded-full transition-all duration-150 ${
                  hasLogged
                    ? 'bg-[#EB1E23] border border-[#EB1E23]'
                    : 'bg-surface dark:bg-[#0c0c0c] border border-black/20 dark:border-white/20'
                } ${
                  isCurrentDay
                    ? 'ring-2 ring-fg/40 dark:ring-white/40 ring-offset-2 ring-offset-surface dark:ring-offset-black'
                    : ''
                }`}
              />
            )
          })}
        </div>
      </div>

      {/* Bottom Row: Weekly consistency metric */}
      <div className="flex items-center justify-between font-mono text-[10px] text-muted tracking-wider uppercase pt-2 border-t border-line/40">
        <span>ACTIVE DAYS</span>
        <span className="text-fg/90 font-medium tabular-nums">
          {activeDaysThisWeek} / 7 DAYS
        </span>
      </div>
    </BentoCard>
  )
})

