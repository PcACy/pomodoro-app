import { memo } from 'react'
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
  const todaySessions = sessions.filter((s) => sameDay(new Date(s.start), today)).length

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
      contentClassName="justify-between"
      onClick={() => {
        playMicroClick('tap')
        onOpenAnalyticsModal?.()
      }}
    >
      {/* Center Highlight: Doto Digit + Label */}
      <div className="flex items-center gap-2.5">
        <span className="font-doto text-3xl sm:text-4xl font-bold text-fg tracking-tight tabular-nums">
          {streak}
        </span>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
            <span className="font-mono text-[10px] text-fg font-medium tracking-wider uppercase">
              {streak === 1 ? 'DAY STREAK' : 'DAYS STREAK'}
            </span>
          </div>
          <span className="font-mono text-[9px] text-muted tracking-wider uppercase">
            {streak > 0 ? 'KEEP THE FLOW' : 'START TODAY'}
          </span>
        </div>
      </div>

      {/* 7-Day Matrix for Current Week (Mon-Sun) */}
      <div className="flex items-center justify-between gap-1 px-1.5 py-1.5 rounded bg-canvas/60 border border-line/40">
        {WEEK_DAYS.map((dayName, i) => {
          const dayDate = addDays(weekStart, i)
          const isCurrentDay = sameDay(dayDate, today)
          const hasLogged = sessions.some((s) => sameDay(new Date(s.start), dayDate))

          return (
            <div key={i} className="flex flex-col items-center gap-1 flex-1">
              <span
                className={`font-mono text-[8px] tracking-wider uppercase ${
                  isCurrentDay ? 'text-fg font-bold' : 'text-muted/70'
                }`}
              >
                {dayName}
              </span>
              <div
                className={`h-2 w-2 rounded-full transition-all ${
                  hasLogged
                    ? isCurrentDay
                      ? 'bg-accent'
                      : 'bg-fg'
                    : isCurrentDay
                      ? 'border border-accent/80'
                      : 'bg-line/40'
                }`}
              />
            </div>
          )
        })}
      </div>

      {/* Bottom Row: Today's session count */}
      <div className="flex items-center justify-between font-mono text-[10px] text-muted tracking-wider uppercase pt-1 border-t border-line/40">
        <span>TODAY</span>
        <span className="text-fg/90 font-medium tabular-nums">
          {todaySessions} {todaySessions === 1 ? 'SESSION' : 'SESSIONS'}
        </span>
      </div>
    </BentoCard>
  )
})

export const StreakStatusCard = SystemStatusCard

