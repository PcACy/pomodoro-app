import { memo } from 'react'
import type { Session } from '../../types'
import { minutesByTag } from '../../lib/stats'
import { BentoCard } from './BentoCard'
import { getTagColor } from '../TodoList'

interface ProjectsDistributionCardProps {
  sessions: Session[]
  tags?: string[]
  className?: string
}

const SEGMENT_COUNT = 24

export const ProjectsDistributionCard = memo(function ProjectsDistributionCard({
  sessions,
  tags = [],
  className = '',
}: ProjectsDistributionCardProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const tagStats = minutesByTag(sessions, today, 'OHNE TAG')
  const totalTodayMinutes = tagStats.reduce((sum, t) => sum + t.minutes, 0)

  // Configured user tags or fallback
  const configuredTags = tags.length > 0 ? tags : ['Uni', 'Projekt', 'Coding']

  // Start with today's active tags (sorted descending by minutes)
  const rows: { tag: string; minutes: number }[] = tagStats.map((t) => ({
    tag: t.tag,
    minutes: t.minutes,
  }))

  // Pad up to at least 3 rows using configured tags not already present
  for (const confTag of configuredTags) {
    if (rows.length >= 3) break
    if (!rows.some((r) => r.tag.toLowerCase() === confTag.toLowerCase())) {
      rows.push({ tag: confTag, minutes: 0 })
    }
  }

  // Display top 3 categories
  const displayRows = rows.slice(0, 3)

  return (
    <BentoCard
      label={`PROJECTS · ${Math.round(totalTodayMinutes)} MINS`}
      className={className}
      contentClassName="justify-around py-1"
    >
      <div className="flex flex-col gap-3">
        {displayRows.map((row) => {
          const ratio = totalTodayMinutes > 0 ? row.minutes / totalTodayMinutes : 0
          const filled = totalTodayMinutes > 0 && row.minutes > 0
            ? Math.min(SEGMENT_COUNT, Math.max(1, Math.round(ratio * SEGMENT_COUNT)))
            : 0
          const hours = (row.minutes / 60).toFixed(1)
          const tagColor = getTagColor(row.tag)

          return (
            <div key={row.tag} className="flex flex-col gap-1">
              <div className="flex items-center justify-between font-mono text-[10px] tracking-wider uppercase">
                <span className="flex items-center gap-1.5 text-muted">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: tagColor }}
                  />
                  <span>{row.tag}</span>
                </span>
                <span className="text-fg/80 tabular-nums">
                  {row.minutes > 0 ? `${hours} H` : '0 H'}
                </span>
              </div>

              {/* Segmented bar for this category */}
              <div className="flex h-2 w-full gap-0.5">
                {Array.from({ length: SEGMENT_COUNT }).map((_, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-[0.5px] transition-colors duration-150 ${
                      i < filled
                        ? 'bg-fg'
                        : 'bg-line/40'
                    }`}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </BentoCard>
  )
})
