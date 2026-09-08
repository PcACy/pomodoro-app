import { memo, useMemo, useState, useCallback } from 'react'
import type { Session } from '../../types'
import { minutesByTag } from '../../lib/stats'
import { addDays, sameDay, startOfWeek } from '../../lib/time'
import { BentoCard } from './BentoCard'
import { useTranslation } from '../../hooks/useTranslation'
import { playMicroClick } from '../../lib/sound'

interface ProjectsDistributionCardProps {
  sessions: Session[]
  tags?: string[]
  className?: string
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const LED_LEVELS = [6, 5, 4, 3, 2, 1] // 6 segments, stacked top (6) to bottom (1)
const MINUTES_PER_BLOCK = 30 // 1 block = 30 min (full scale: 180 min / 3.0 h)

export const ProjectsDistributionCard = memo(function ProjectsDistributionCard({
  sessions,
  tags = [],
  className = '',
}: ProjectsDistributionCardProps) {
  const { t } = useTranslation()
  const untaggedLabel = t.todo.noTag

  // Collect available tags with 'Chinese' as priority default if specified in design
  const availableTags = useMemo(() => {
    const list: string[] = []
    const seen = new Set<string>()

    const addTag = (tName: string) => {
      const clean = tName.trim()
      if (clean && !seen.has(clean.toLowerCase())) {
        seen.add(clean.toLowerCase())
        list.push(clean)
      }
    }

    // Include 'Chinese' first to fulfill the default requirement CHINESE // ACTIVE TRACK
    addTag('Chinese')

    // Add tags from props / settings
    tags.forEach(addTag)

    // Add tags from active sessions
    sessions.forEach((s) => {
      if (s.tag) addTag(s.tag)
    })

    // Fallbacks if still sparse
    ;['Uni', 'Coding'].forEach(addTag)

    return list
  }, [tags, sessions])

  const [selectedTagIndex, setSelectedTagIndex] = useState(0)
  const activeTag = availableTags[selectedTagIndex % availableTags.length] || 'Chinese'

  const handleCycleTrack = useCallback(() => {
    playMicroClick('tap')
    setSelectedTagIndex((prev) => (prev + 1) % availableTags.length)
  }, [availableTags.length])

  const { totalWeekMinutes, activeTrackWeekMinutes, dayMinutes, todayIdx } = useMemo(() => {
    const weekStart = startOfWeek(new Date())
    const today = new Date()
    let tIdx = 0

    for (let i = 0; i < 7; i++) {
      if (sameDay(addDays(weekStart, i), today)) {
        tIdx = i
        break
      }
    }

    // Total week minutes across all tags
    const weekStats = minutesByTag(sessions, weekStart, untaggedLabel)
    const totalMins = weekStats.reduce((sum, item) => sum + item.minutes, 0)

    // Daily breakdown for the active track
    const dailyMins: number[] = []
    let trackMins = 0

    for (let i = 0; i < 7; i++) {
      const dayDate = addDays(weekStart, i)
      const minsForDay = sessions
        .filter((s) => sameDay(new Date(s.start), dayDate))
        .filter((s) => {
          const sessionTag = (s.tag?.trim() || untaggedLabel).toLowerCase()
          return sessionTag === activeTag.toLowerCase()
        })
        .reduce((sum, s) => {
          const d = s.durationMs
          return sum + (typeof d === 'number' && Number.isFinite(d) && d > 0 ? Math.round(d / 60_000) : 0)
        }, 0)

      dailyMins.push(minsForDay)
      trackMins += minsForDay
    }

    return {
      totalWeekMinutes: totalMins,
      activeTrackWeekMinutes: trackMins,
      dayMinutes: dailyMins,
      todayIdx: tIdx,
    }
  }, [sessions, untaggedLabel, activeTag])

  const totalWeekHours = (totalWeekMinutes / 60).toFixed(1)
  const activeTrackHours = (activeTrackWeekMinutes / 60).toFixed(1)
  const hasActivity = activeTrackWeekMinutes > 0

  return (
    <BentoCard
      label={`PROJECTS · ${totalWeekHours} H WEEK`}
      action={
        <span className="font-mono text-[9px] px-2 py-0.5 rounded-full border border-line bg-canvas text-muted tracking-wider uppercase">
          {availableTags.length} {availableTags.length === 1 ? 'TAG' : 'TAGS'}
        </span>
      }
      className={className}
      contentClassName="justify-between"
    >
      <div className="flex-1 flex flex-col justify-between py-0.5 gap-2.5">
        {/* Project Selection / Active Track Row */}
        <button
          type="button"
          onClick={handleCycleTrack}
          className="flex items-center justify-between font-mono text-[10px] tracking-wider uppercase text-left group cursor-pointer select-none transition-opacity hover:opacity-85"
          title="Click to cycle track"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-fg font-medium truncate group-hover:underline underline-offset-2 decoration-line">
              {activeTag}
            </span>
            <span className="text-muted/60 shrink-0">// ACTIVE TRACK</span>
            {availableTags.length > 1 && (
              <span className="text-muted/40 group-hover:text-muted/80 text-[8px] transition-colors ml-0.5 select-none shrink-0">
                ⇄
              </span>
            )}
          </div>
          <span className="text-fg/80 tabular-nums font-mono text-[10px] shrink-0 ml-2">
            {activeTrackHours} H
          </span>
        </button>

        {/* 7-Column Centered VU-Meter LED Equalizer Grid */}
        <div className="flex-1 flex items-center justify-center py-1">
          <div className="flex items-center justify-center gap-2 sm:gap-3.5">
            {DAY_LABELS.map((label, dayIdx) => {
              const dayMins = dayMinutes[dayIdx] ?? 0
              const isToday = dayIdx === todayIdx

              // 1 block = 30 min, up to 6 blocks (180 min)
              const activeCount =
                dayMins > 0 ? Math.min(6, Math.max(1, Math.ceil(dayMins / MINUTES_PER_BLOCK))) : 0

              return (
                <div
                  key={dayIdx}
                  className="flex flex-col items-center gap-1.5"
                  title={`${label}: ${dayMins} MIN`}
                >
                  {/* Day header letter */}
                  <span
                    className={`font-mono text-[9px] sm:text-[10px] tracking-wider uppercase select-none ${
                      isToday ? 'text-fg font-bold' : 'text-muted/60 font-normal'
                    }`}
                  >
                    {label}
                  </span>

                  {/* Vertical LED Column (6 segments stacked top to bottom) */}
                  <div
                    className="flex flex-col gap-1 sm:gap-1.5"
                    role="img"
                    aria-label={`${label}: ${dayMins} minutes (${activeCount}/6 segments)`}
                  >
                    {LED_LEVELS.map((level) => {
                      const isActive = activeCount >= level
                      const isPeak = isActive && activeCount === level

                      let segmentStyle =
                        'bg-black/[0.04] border border-black/5 dark:bg-white/[0.04] dark:border-white/5'

                      if (isActive) {
                        if (isToday && isPeak) {
                          segmentStyle = 'bg-[#EB1E23] border border-[#EB1E23]'
                        } else {
                          segmentStyle = 'bg-fg border border-fg'
                        }
                      }

                      return (
                        <div
                          key={level}
                          className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-[1px] transition-colors duration-150 ${segmentStyle}`}
                        />
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Fixed Footer Status Line */}
        <div className="pt-2 border-t border-line/40 flex items-center justify-between font-mono text-[9px] text-muted tracking-widest uppercase select-none">
          <span className="flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                hasActivity ? 'bg-[#EB1E23] animate-pulse' : 'bg-muted/40'
              }`}
            />
            <span>{hasActivity ? `${activeTrackHours} H LOGGED THIS WEEK` : 'NO ACTIVITY THIS WEEK'}</span>
          </span>
          <span className="text-muted/70 tracking-wider">
            {hasActivity ? 'ACTIVE // CH-01' : 'STANDBY // CH-01'}
          </span>
        </div>
      </div>
    </BentoCard>
  )
})
