import { memo } from 'react'
import type { Session } from '../../types'
import { minutesByTag } from '../../lib/stats'
import { BentoCard } from './BentoCard'
import { useTranslation } from '../../hooks/useTranslation'

interface ProjectsDistributionCardProps {
  sessions: Session[]
  tags?: string[]
  className?: string
}

const STRIP_SEGMENTS = 20

export const ProjectsDistributionCard = memo(function ProjectsDistributionCard({
  sessions,
  tags = [],
  className = '',
}: ProjectsDistributionCardProps) {
  const { t } = useTranslation()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Localized untagged bucket, matching Dashboard/TodoList (a hardcoded
  // German label would never merge with the translated "No tag" bucket).
  const tagStats = minutesByTag(sessions, today, t.todo.noTag)
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

  // Single stacked share strip: discrete blocks split by largest remainder,
  // differentiated by opacity (100/60/30) — no color, no per-row bars.
  const RANK_OPACITY = ['opacity-100', 'opacity-60', 'opacity-30']
  const stripBlocks: number[] = (() => {
    if (totalTodayMinutes <= 0) return []
    const quotas = displayRows.map((r) => (r.minutes / totalTodayMinutes) * STRIP_SEGMENTS)
    const base = quotas.map((q) => Math.floor(q))
    let rest = STRIP_SEGMENTS - base.reduce((a, b) => a + b, 0)
    const order = quotas
      .map((q, i) => ({ i, frac: q - Math.floor(q) }))
      .sort((a, b) => b.frac - a.frac)
    const alloc = [...base]
    for (const { i } of order) {
      if (rest <= 0) break
      if (displayRows[i].minutes > 0) {
        alloc[i] += 1
        rest -= 1
      }
    }
    // Guarantee a visible block for any active tag lost to rounding
    displayRows.forEach((r, i) => {
      if (r.minutes > 0 && alloc[i] === 0 && alloc.some((a) => a > 1)) {
        const donor = alloc.findIndex((a) => a > 1)
        alloc[donor] -= 1
        alloc[i] = 1
      }
    })
    const blocks: number[] = []
    alloc.forEach((count, tagIdx) => {
      for (let k = 0; k < count; k++) blocks.push(tagIdx)
    })
    return blocks
  })()

  return (
    <BentoCard
      label={`PROJECTS · ${Math.round(totalTodayMinutes)} MINS`}
      action={
        <span className="font-mono text-[9px] px-2 py-0.5 rounded-full border border-line bg-canvas text-muted tracking-wider uppercase">
          {configuredTags.length} {configuredTags.length === 1 ? 'TAG' : 'TAGS'}
        </span>
      }
      className={className}
      contentClassName="justify-between"
    >
      <div className="flex-1 flex flex-col justify-between py-1 gap-3">
        {/* Stacked share strip */}
        <div
          className="flex h-2 w-full gap-[2px]"
          role="img"
          aria-label={
            totalTodayMinutes > 0
              ? `Tag shares today: ${displayRows.map((r) => `${r.tag} ${r.minutes} minutes`).join(', ')}`
              : 'No activity today'
          }
        >
          {totalTodayMinutes > 0 ? (
            stripBlocks.map((tagIdx, i) => (
              <div
                key={i}
                title={`${displayRows[tagIdx].tag} (${displayRows[tagIdx].minutes}m)`}
                className={`flex-1 rounded-none bg-fg transition-colors duration-150 ${RANK_OPACITY[Math.min(tagIdx, RANK_OPACITY.length - 1)]}`}
              />
            ))
          ) : (
            Array.from({ length: STRIP_SEGMENTS }).map((_, i) => (
              <div key={i} className="flex-1 rounded-none bg-line/40" />
            ))
          )}
        </div>

        {/* Stat rows: label left, value right — no per-row bars */}
        <div className="flex-1 flex flex-col justify-center gap-2.5">
          {displayRows.map((row, rank) => {
            const hours = (row.minutes / 60).toFixed(1)

            return (
              <div key={row.tag} className="flex items-center justify-between font-mono text-[10px] tracking-wider uppercase">
                <span className="flex min-w-0 items-center gap-1.5 text-muted">
                  <span
                    className={`h-1.5 w-1.5 rounded-full bg-fg shrink-0 ${RANK_OPACITY[Math.min(rank, RANK_OPACITY.length - 1)]}`}
                  />
                  <span className="text-fg/90 font-medium truncate">{row.tag}</span>
                </span>
                <span className="text-fg/80 tabular-nums shrink-0">
                  {row.minutes > 0 ? `${hours} H` : '0 H'}
                </span>
              </div>
            )
          })}
        </div>

        {totalTodayMinutes === 0 && (
          <div className="pt-2 border-t border-line/40 flex items-center justify-between font-mono text-[9px] text-muted tracking-widest uppercase">
            <span className="flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-muted/60" />
              <span>NO ACTIVITY TODAY</span>
            </span>
            <span className="text-fg/60">STANDBY</span>
          </div>
        )}
      </div>
    </BentoCard>
  )
})
