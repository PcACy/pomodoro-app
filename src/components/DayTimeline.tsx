import { memo, useEffect, useMemo, useState } from 'react'
import type { MouseEvent } from 'react'
import { Clock } from 'lucide-react'
import type { Session } from '../types'
import { fmtDuration, sameDay } from '../lib/time'
import { useTranslation } from '../hooks/useTranslation'

interface Props {
  sessions: Session[]
}

interface ActiveTip {
  x: number
  y: number
  session: Session
  timeRange: string
  durationStr: string
}

function fmtTime(d: Date, locale: string): string {
  return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
}

export const DayTimeline = memo(function DayTimeline({ sessions }: Props) {
  const { t, lang } = useTranslation()
  const locale = lang === 'de' ? 'de-DE' : 'en-GB'
  const [now, setNow] = useState(() => new Date())
  const [tip, setTip] = useState<ActiveTip | null>(null)
  const [hoverPct, setHoverPct] = useState<number | null>(null)

  // Update current-time marker once per minute (cheap & no timer-ticker overhead)
  useEffect(() => {
    const updateNow = () => setNow(new Date())
    const interval = setInterval(updateNow, 60_000)
    return () => clearInterval(interval)
  }, [])

  const todaySessions = useMemo(
    () =>
      sessions
        .filter((s) => sameDay(new Date(s.start), now))
        .sort((a, b) => a.start - b.start),
    [sessions, now],
  )

  // Dynamic start & end hours based on today's sessions and current time
  const { startHour, endHour, hourTicks } = useMemo(() => {
    let minH = 8
    let maxH = 22

    const curH = now.getHours()
    if (curH < minH) minH = Math.max(0, curH - 1)
    if (curH >= maxH) maxH = Math.min(24, curH + 1)

    for (const s of todaySessions) {
      const sStartH = new Date(s.start).getHours()
      const sEndH = new Date(s.end).getHours() + 1
      if (sStartH < minH) minH = Math.max(0, sStartH)
      if (sEndH > maxH) maxH = Math.min(24, sEndH)
    }

    // Generate balanced hour tick marks
    const ticks: number[] = []
    const step = maxH - minH > 14 ? 3 : 2
    for (let h = minH; h <= maxH; h += step) {
      ticks.push(h)
    }
    if (ticks[ticks.length - 1] !== maxH) {
      ticks.push(maxH)
    }

    return { startHour: minH, endHour: maxH, hourTicks: ticks }
  }, [todaySessions, now])

  const totalDayMinutes = (endHour - startHour) * 60

  // Position of current time needle
  const nowMinutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60 - startHour * 60
  const nowPct = totalDayMinutes > 0 ? (nowMinutes / totalDayMinutes) * 100 : -1

  const handleTrackMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
    setHoverPct(pct)
  }

  const handleSessionHover = (e: MouseEvent<HTMLDivElement>, s: Session) => {
    const sStart = new Date(s.start)
    const sEnd = new Date(s.end)
    const timeRange = `${fmtTime(sStart, locale)} – ${fmtTime(sEnd, locale)}`
    const durationStr = fmtDuration(s.durationMs, lang)
    setTip({
      x: e.clientX,
      y: e.clientY,
      session: s,
      timeRange,
      durationStr,
    })
  }

  return (
    <section className="card flex w-full flex-col gap-4 p-5 2xl:p-6">
      <div className="flex items-center gap-2">
        <Clock size={16} className="text-accent" />
        <h3 className="text-sm font-semibold text-fg">{t.timeline.title}</h3>
      </div>

      <div className="relative pt-2 pb-6">
        {/* Timeline Bar Track */}
        <div
          onMouseMove={handleTrackMouseMove}
          onMouseLeave={() => {
            setHoverPct(null)
            setTip(null)
          }}
          className="relative h-4 w-full cursor-crosshair rounded-full border border-line/60 bg-canvas/90 p-0.5 shadow-inner"
        >
          {/* Today's Session Blocks */}
          {todaySessions.map((s) => {
            const sStart = new Date(s.start)
            const sEnd = new Date(s.end)
            const sStartMin = sStart.getHours() * 60 + sStart.getMinutes() + sStart.getSeconds() / 60 - startHour * 60
            const sEndMin = sEnd.getHours() * 60 + sEnd.getMinutes() + sEnd.getSeconds() / 60 - startHour * 60

            const left = Math.max(0, Math.min(100, (sStartMin / totalDayMinutes) * 100))
            const width = Math.max(0.8, Math.min(100 - left, ((sEndMin - sStartMin) / totalDayMinutes) * 100))

            return (
              <div
                key={s.id}
                role="button"
                tabIndex={0}
                aria-label={`${s.task || 'Focus'} (${fmtTime(sStart, locale)} - ${fmtTime(sEnd, locale)})`}
                onMouseMove={(e) => handleSessionHover(e, s)}
                className="absolute top-0.5 bottom-0.5 z-10 origin-center rounded-full bg-accent shadow-sm transition-all duration-150 hover:z-30 hover:scale-y-125 hover:brightness-125 hover:shadow-[0_0_12px_rgb(var(--c-accent)/0.8)]"
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                }}
              />
            )
          })}

          {/* Hover Magnifier / Scrubber Needle */}
          {hoverPct !== null && (
            <div
              className="pointer-events-none absolute -top-1 bottom-[-4px] z-20 w-0.5 -translate-x-1/2 bg-white/40 shadow-sm"
              style={{ left: `${hoverPct}%` }}
            />
          )}

          {/* Current Time Needle */}
          {nowPct >= 0 && nowPct <= 100 && (
            <div
              className="pointer-events-none absolute -top-1.5 bottom-[-6px] z-20 w-0.5 -translate-x-1/2 bg-fg transition-[left] duration-1000"
              style={{ left: `${nowPct}%` }}
            >
              <div className="absolute -top-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-fg shadow-[0_0_8px_rgba(255,255,255,0.8)] animate-pulse" />
            </div>
          )}
        </div>

        {/* Hour Ticks & Labels */}
        <div className="pointer-events-none absolute inset-x-0 top-7 flex justify-between text-[11px] font-medium text-muted tracking-normal">
          {hourTicks.map((h) => {
            const pct = ((h - startHour) / (endHour - startHour)) * 100
            return (
              <span
                key={h}
                className="absolute -translate-x-1/2 whitespace-nowrap"
                style={{ left: `${Math.max(0, Math.min(100, pct))}%` }}
              >
                {String(h).padStart(2, '0')}:00
              </span>
            )
          })}
        </div>
      </div>

      {/* Floating Glass Tooltip */}
      {tip && (
        <div
          className="pointer-events-none fixed z-50 flex flex-col gap-1 rounded-xl border border-line bg-surface/95 px-3 py-2 text-xs font-medium text-fg shadow-2xl backdrop-blur-md"
          style={{
            left: Math.max(12, Math.min(tip.x - 100, window.innerWidth - 240)),
            top: Math.max(12, tip.y - 75),
          }}
        >
          <div className="flex items-center gap-2">
            <span className="font-semibold text-fg">{tip.session.task || t.phases.focus}</span>
            {tip.session.tag && (
              <span className="rounded-md border border-accent/25 bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">
                {tip.session.tag}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono tabular-nums text-muted">
            <span>{tip.timeRange}</span>
            <span>·</span>
            <span className="font-semibold text-accent">{tip.durationStr}</span>
          </div>
        </div>
      )}
    </section>
  )
})
