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
      filtered.reduce((acc, s) => acc + (s.durationMs || 0), 0) / 60000,
    )
    return { todaySessions: filtered, totalMinutesToday: minutes }
  }, [sessions, todayKey])

  const sessionCount = todaySessions.length
  const totalHours = (totalMinutesToday / 60).toFixed(1)
  const sessionUnit =
    sessionCount === 1
      ? lang === 'de'
        ? 'Session'
        : 'session'
      : lang === 'de'
        ? 'Sessions'
        : 'sessions'

  return (
    <BentoCard
      label={lang === 'de' ? 'Session-Log' : 'Session Log'}
      indicator={
        <span className="num shrink-0 text-[10px] text-muted">
          {sessionCount} {sessionUnit} · {totalHours} h
        </span>
      }      action={
        <button
          type="button"
          onClick={() => {
            playMicroClick('tap')
            onOpenActivityLog?.()
          }}
          className="chip"
        >
          Stats
          <ArrowUpRight size={11} />
        </button>
      }
      className={className}
      contentClassName="min-h-0"
    >
      {todaySessions.length === 0 ? (
        <div className="empty">
          <p className="label">Telemetry standby</p>
          <p className="max-w-[260px] text-xs text-muted">{t.sessionLog.emptyTodaySub}</p>
          <button
            type="button"
            onClick={() => {
              playMicroClick('tap')
              onJumpToFocus?.()
            }}
            className="btn-secondary mt-1 h-9 min-h-[36px] px-4"
          >
            <span className="opacity-50">01</span>
            Focus Deck
          </button>
        </div>
      ) : (
        <div className="no-scrollbar flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
          {todaySessions.map((s) => {
            const durationMin = Math.max(1, Math.round(s.durationMs / 60000))
            const isFlow = s.mode === 'flow'
            return (
              <div
                key={s.id}
                className="flex min-h-[48px] items-center justify-between gap-3 rounded-control border border-line px-3 transition-colors hover:border-fg/25 hover:bg-fg/[0.03]"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="num shrink-0 text-[11px] text-muted">
                    {formatSessionTime(s.start)}
                  </span>
                  <span
                    className={`shrink-0 rounded-xs border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${
                      isFlow ? 'border-accent/40 text-accent' : 'border-line text-muted'
                    }`}
                  >
                    {isFlow ? 'Flow' : 'Pomo'}
                  </span>
                  <span className="truncate text-[13px] text-fg">
                    {s.task || 'Focus Session'}
                  </span>
                  {s.tag ? (
                    <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted sm:inline">
                      #{s.tag}
                    </span>
                  ) : null}
                </div>
                <span className="num shrink-0 text-[13px] text-fg">
                  {durationMin}
                  <span className="ml-0.5 text-[10px] text-muted">m</span>
                </span>
              </div>
            )
          })}
        </div>
      )}
    </BentoCard>
  )
})
