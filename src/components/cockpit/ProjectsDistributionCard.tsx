import { memo } from 'react'
import type { Session } from '../../types'
import { minutesByTag } from '../../lib/stats'
import { BentoCard } from './BentoCard'
import { getTagColor } from '../TodoList'

interface ProjectsDistributionCardProps {
  sessions: Session[]
  className?: string
}

const SEGMENT_COUNT = 24

export const ProjectsDistributionCard = memo(function ProjectsDistributionCard({
  sessions,
  className = '',
}: ProjectsDistributionCardProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const tagStats = minutesByTag(sessions, today, 'GENERAL')
  const totalMinutes = tagStats.reduce((sum, t) => sum + t.minutes, 0) || 1

  // Take top 3 categories or fallback default presets
  const rows = tagStats.length > 0
    ? tagStats.slice(0, 3)
    : [
        { tag: 'WORK', minutes: 0 },
        { tag: 'STUDY', minutes: 0 },
        { tag: 'PERSONAL', minutes: 0 },
      ]

  return (
    <BentoCard
      label={`PROJECTS · ${Math.round(totalMinutes)} MINS`}
      className={className}
      contentClassName="justify-around py-1"
    >
      <div className="flex flex-col gap-3">
        {rows.map((row, idx) => {
          const ratio = totalMinutes > 0 ? row.minutes / totalMinutes : 0
          const filled = Math.min(
            SEGMENT_COUNT,
            Math.max(row.minutes > 0 ? 1 : 0, Math.round(ratio * SEGMENT_COUNT)),
          )
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
                        ? idx === 2
                          ? 'bg-[#d4a843]'
                          : 'bg-fg'
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
