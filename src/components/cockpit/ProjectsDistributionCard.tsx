import { memo, useMemo } from 'react'
import type { Session } from '../../types'
import { minutesByTag } from '../../lib/stats'
import { addDays, sameDay, startOfWeek } from '../../lib/time'
import { BentoCard } from './BentoCard'
import { useTranslation } from '../../hooks/useTranslation'

interface ProjectsDistributionCardProps {
  sessions: Session[]
  tags?: string[]
  className?: string
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
// Second opacity step at 30+ minutes (opacity before color, Spec §3)
const SOLID_THRESHOLD_MIN = 30

interface DisplayRow {
  tag: string
  weekMinutes: number
  dayMinutes: number[]
}

export const ProjectsDistributionCard = memo(function ProjectsDistributionCard({
  sessions,
  tags = [],
  className = '',
}: ProjectsDistributionCardProps) {
  const { t } = useTranslation()
  const untaggedLabel = t.todo.noTag

  // Configured user tags or fallback
  const configuredTags = tags.length > 0 ? tags : ['Uni', 'Projekt', 'Coding']

  const { displayRows, totalWeekMinutes, todayIdx } = useMemo(() => {
    const weekStart = startOfWeek(new Date())
    const today = new Date()
    let tIdx = 0
    for (let i = 0; i < 7; i++) {
      if (sameDay(addDays(weekStart, i), today)) {
        tIdx = i
        break
      }
    }

    const minutesFor = (tag: string, day: Date): number =>
      sessions
        .filter((s) => sameDay(new Date(s.start), day))
        .filter((s) => (s.tag?.trim() || untaggedLabel) === tag)
        .reduce((sum, s) => {
          const d = s.durationMs
          return sum + (typeof d === 'number' && Number.isFinite(d) && d > 0 ? Math.round(d / 60_000) : 0)
        }, 0)

    // Start with this week's active tags (sorted descending by week minutes)
    const weekStats = minutesByTag(sessions, weekStart, untaggedLabel)
    const rows: DisplayRow[] = weekStats.map((item) => {
      const dayMinutes = DAY_LABELS.map((_, i) => minutesFor(item.tag, addDays(weekStart, i)))
      return { tag: item.tag, weekMinutes: dayMinutes.reduce((a, b) => a + b, 0), dayMinutes }
    })

    // Pad up to at least 3 rows using configured tags not already present
    for (const confTag of configuredTags) {
      if (rows.length >= 3) break
      if (!rows.some((r) => r.tag.toLowerCase() === confTag.toLowerCase())) {
        rows.push({ tag: confTag, weekMinutes: 0, dayMinutes: DAY_LABELS.map(() => 0) })
      }
    }

    const total = rows.reduce((sum, r) => sum + r.weekMinutes, 0)
    return { displayRows: rows.slice(0, 3), totalWeekMinutes: total, todayIdx: tIdx }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, untaggedLabel, configuredTags.join('|')])

  const totalWeekHours = (totalWeekMinutes / 60).toFixed(1)

  return (
    <BentoCard
      label={`PROJECTS · ${totalWeekHours} H WEEK`}
      action={
        <span className="font-mono text-[9px] px-2 py-0.5 rounded-full border border-line bg-canvas text-muted tracking-wider uppercase">
          {configuredTags.length} {configuredTags.length === 1 ? 'TAG' : 'TAGS'}
        </span>
      }
      className={className}
      contentClassName="justify-between"
    >
      <div className="flex-1 flex flex-col justify-between py-1 gap-3">
        {/* Weekday header, full width above the day columns */}
        <div className="flex gap-[2px]" aria-hidden="true">
          {DAY_LABELS.map((d, i) => (
            <span
              key={i}
              className={`flex-1 text-center font-mono text-[8px] tracking-wider uppercase ${
                i === todayIdx ? 'text-fg font-bold' : 'text-muted/70'
              }`}
            >
              {d}
            </span>
          ))}
        </div>

        {/* Per-tag rows: full-width label line + full-width 7-day dot matrix */}
        <div className="flex-1 flex flex-col justify-center gap-3">
          {displayRows.map((row) => {
            const hours = (row.weekMinutes / 60).toFixed(1)

            return (
              <div key={row.tag} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2 font-mono text-[10px] tracking-wider uppercase">
                  <span className="text-fg/90 font-medium truncate" title={row.tag}>
                    {row.tag}
                  </span>
                  <span className="text-fg/80 tabular-nums shrink-0">
                    {row.weekMinutes > 0 ? `${hours} H` : '0 H'}
                  </span>
                </div>
                <div
                  className="flex gap-[2px]"
                  role="img"
                  aria-label={`${row.tag} this week: ${row.dayMinutes
                    .map((m, i) => `${DAY_LABELS[i]} ${m} minutes`)
                    .join(', ')}`}
                >
                  {row.dayMinutes.map((mins, i) => (
                    <div
                      key={i}
                      title={`${DAY_LABELS[i]}: ${mins} MIN`}
                      className={`h-2.5 flex-1 rounded-none transition-colors duration-150 ${
                        mins >= SOLID_THRESHOLD_MIN
                          ? 'bg-fg'
                          : mins > 0
                            ? 'bg-fg/60'
                            : 'bg-line/40'
                      } ${i === todayIdx ? 'outline outline-1 outline-fg/50' : ''}`}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {totalWeekMinutes === 0 && (
          <div className="pt-2 border-t border-line/40 flex items-center justify-between font-mono text-[9px] text-muted tracking-widest uppercase">
            <span className="flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-muted/60" />
              <span>NO ACTIVITY THIS WEEK</span>
            </span>
            <span className="text-fg/60">STANDBY</span>
          </div>
        )}
      </div>
    </BentoCard>
  )
})
