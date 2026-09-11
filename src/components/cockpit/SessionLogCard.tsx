import { memo, useMemo } from 'react'
import { ArrowUpRight } from 'lucide-react'
import type { Session } from '../../types'
import { BentoCard } from './BentoCard'
import { playMicroClick } from '../../lib/sound'
import { useTranslation } from '../../hooks/useTranslation'

import { dayKey, sameDay } from '../../lib/time'

interface SessionLogCardProps {
  sessions: Session[]
  onOpenActivityLog?: () => void
  onJumpToFocus?: () => void
  className?: string
}

function formatSessionTime(timestamp: number): string {
  const d = new Date(timestamp)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
}

export const SessionLogCard = memo(function SessionLogCard({
  sessions,
  onOpenActivityLog,
  onJumpToFocus,
  className = '',
}: SessionLogCardProps) {
  const { t, lang } = useTranslation()
  const todayKey = dayKey(new Date())

  const { todaySessions, totalMinutesToday } = useMemo(() => {
    const [y, m, d] = todayKey.split('-').map(Number)
    const today = new Date(y, (m ?? 1) - 1, d)
    const filtered = sessions.filter((s) => sameDay(new Date(s.start), today))
    // Sort descending by start time (newest first)
    filtered.sort((a, b) => b.start - a.start)
    const minutes = Math.round(
      filtered.reduce((acc, s) => acc + (s.durationMs || 0), 0) / 60000
    )
    return { todaySessions: filtered, totalMinutesToday: minutes }
  }, [sessions, todayKey])

  const sessionCount = todaySessions.length
  const totalHours = (totalMinutesToday / 60).toFixed(1)
  const sessionUnit = lang === 'de'
    ? (sessionCount === 1 ? 'Session' : 'Sessions')
    : (sessionCount === 1 ? 'session' : 'sessions')

  return (
    <BentoCard
      label={lang === 'de' ? 'Session-Log · Heute' : 'Session Log · Today'}
      indicator={
        <span className="font-sans text-[11px] text-muted">
          {sessionCount} {sessionUnit} · {totalHours} h
        </span>
      }
      action={
        <button
          type="button"
          onClick={() => {
            playMicroClick('tap')
            onOpenActivityLog?.()
          }}
          className="font-sans text-[11px] font-medium px-2.5 py-1 rounded-full border border-line bg-canvas hover:border-fg/40 text-muted hover:text-fg transition-colors flex items-center gap-1 cursor-pointer select-none active:scale-95"
        >
          <span>Stats</span>
          <ArrowUpRight size={12} />
        </button>
      }
      className={className}
      contentClassName="justify-between h-full min-h-0"
    >
      {todaySessions.length === 0 ? (
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center py-6 px-4 my-auto border border-dashed border-line/60 rounded-2xl text-center select-none">
          {/* Technical Telemetry Status */}
          <div className="font-mono text-[11px] font-bold tracking-widest text-muted uppercase mb-1">
            TELEMETRY STANDBY
          </div>

          <p className="font-sans text-xs text-muted/70 max-w-[240px] mb-4">
            {t.sessionLog.emptyTodaySub}
          </p>

          <button
            type="button"
            onClick={() => {
              playMicroClick('tap')
              onJumpToFocus?.()
            }}
            className="font-mono text-[11px] font-bold tracking-wider uppercase px-4 py-2 rounded-full border border-line bg-surface hover:border-fg/50 hover:bg-canvas text-fg transition-all flex items-center gap-2 cursor-pointer active:scale-95 shadow-xs"
          >
            <span>01 FOCUS DECK</span>
            <span>→</span>
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 flex-1 min-h-0 justify-between">
          <div className="flex flex-col gap-1.5 flex-1 min-h-0 overflow-y-auto no-scrollbar pr-0.5">
            {todaySessions.map((s) => {
              const durationMin = Math.max(1, Math.round(s.durationMs / 60000))
              const isFlow = s.mode === 'flow'
              return (
                <div
                  key={s.id}
                  className="flex min-h-[44px] items-center justify-between gap-2 px-3 py-1.5 rounded-xl border border-line/60 bg-canvas/40 hover:border-line transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-mono text-xs text-muted tabular-nums shrink-0">
                      {formatSessionTime(s.start)}
                    </span>
                    <span className="text-[10px] font-sans font-medium px-2 py-0.5 rounded-full border border-line bg-surface text-muted shrink-0">
                      {isFlow ? 'Flow' : 'Pomo'}
                    </span>
                    <span className="font-sans text-xs text-fg font-medium truncate">
                      {s.task || 'Focus Session'}
                    </span>
                    {s.tag && (
                      <span className="hidden sm:inline-block font-sans text-[11px] text-muted shrink-0">
                        #{s.tag}
                      </span>
                    )}
                  </div>
                  <span className="font-sans text-xs font-semibold text-fg tabular-nums shrink-0">
                    {durationMin}m
                  </span>
                </div>
              )
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              playMicroClick('tap')
              onOpenActivityLog?.()
            }}
            className="mt-1 shrink-0 text-center font-sans text-xs text-muted hover:text-fg py-1 cursor-pointer transition-colors"
          >
            Detailed Analytics & History ↗
          </button>
        </div>
      )}
    </BentoCard>
  )
})

