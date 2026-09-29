import { memo, useMemo, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
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

  // Track list: 'ALL' option first for total week activity, followed by individual user tags
  const tracks = useMemo(() => {
    const list: string[] = ['ALL']
    const seen = new Set<string>(['all'])

    const addTag = (tName: string) => {
      const clean = tName.trim()
      if (clean && !seen.has(clean.toLowerCase())) {
        seen.add(clean.toLowerCase())
        list.push(clean)
      }
    }

    // Real tags configured in user settings
    tags.forEach(addTag)

    // Real tags found in logged sessions
    sessions.forEach((s) => {
      if (s.tag) addTag(s.tag)
    })

    return list
  }, [tags, sessions])

  const [selectedTrackIndex, setSelectedTrackIndex] = useState(0)
  const currentTrackIndex = ((selectedTrackIndex % tracks.length) + tracks.length) % tracks.length
  const activeTrack = tracks[currentTrackIndex] || 'ALL'
  const isAllTrack = activeTrack === 'ALL'

  const handlePrevTrack = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation()
      if (tracks.length <= 1) return
      playMicroClick('tap')
      setSelectedTrackIndex((prev) => (prev - 1 + tracks.length) % tracks.length)
    },
    [tracks.length]
  )

  const handleNextTrack = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation()
      if (tracks.length <= 1) return
      playMicroClick('tap')
      setSelectedTrackIndex((prev) => (prev + 1) % tracks.length)
    },
    [tracks.length]
  )

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
          if (isAllTrack) return true
          const sessionTag = (s.tag?.trim() || untaggedLabel).toLowerCase()
          return sessionTag === activeTrack.toLowerCase()
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
  }, [sessions, untaggedLabel, activeTrack, isAllTrack])

  const totalWeekHours = (totalWeekMinutes / 60).toFixed(1)
  const activeTrackHours = (activeTrackWeekMinutes / 60).toFixed(1)
  const hasActivity = activeTrackWeekMinutes > 0

  return (
    <BentoCard
      label={`Projects · ${totalWeekHours} h week`}
      action={
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePrevTrack}
            disabled={tracks.length <= 1}
            aria-label="Previous track"
            className="icon-btn !h-8 !w-8"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            onClick={handleNextTrack}
            disabled={tracks.length <= 1}
            title={tracks.length > 1 ? 'Next track' : undefined}
            className="chip"
          >
            <span className="truncate">{activeTrack}</span>
            <span className="tabular-nums opacity-50">
              {currentTrackIndex + 1}/{tracks.length}
            </span>
          </button>
          <button
            type="button"
            onClick={handleNextTrack}
            disabled={tracks.length <= 1}
            aria-label="Next track"
            className="icon-btn !h-8 !w-8"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      }
      className={className}
      contentClassName="justify-between gap-3"
    >
      {/* Active track headline */}
      <div className="flex shrink-0 items-baseline justify-between gap-3">
        <span className="label truncate text-fg/80">{activeTrack}</span>
        <span className="readout shrink-0 text-2xl">
          {activeTrackHours}
          <span className="num ml-1 text-xs font-normal text-muted">h</span>
        </span>
      </div>

      {/* 7-Column VU-Meter LED grid — fills the remaining height */}
      <div
        className="grid min-h-0 flex-1 grid-cols-7 items-stretch gap-1.5 sm:gap-2"
        role="img"
        aria-label={`${activeTrack} minutes per day this week: ${dayMinutes
          .map((m, i) => `${DAY_LABELS[i]} ${m}`)
          .join(', ')}`}
      >
        {DAY_LABELS.map((label, dayIdx) => {
          const dayMins = dayMinutes[dayIdx] ?? 0
          const isToday = dayIdx === todayIdx
          const activeCount =
            dayMins > 0
              ? Math.min(6, Math.max(1, Math.ceil(dayMins / MINUTES_PER_BLOCK)))
              : 0

          return (
            <div
              key={dayIdx}
              className="flex min-w-0 flex-col gap-1.5"
              title={`${label}: ${dayMins} min`}
            >
              {/* Vertical LED column (6 flat slabs stacked bottom-up) */}
              <div
                className="flex min-h-0 flex-1 flex-col justify-end gap-1"
                aria-hidden="true"
              >
                {LED_LEVELS.map((level) => {
                  const isActive = activeCount >= level
                  const isPeak = isActive && activeCount === level
                  return (
                    <div
                      key={level}
                      className={`min-h-[3px] w-full flex-1 rounded-[1px] transition-colors duration-200 ${
                        !isActive
                          ? 'bg-fg/[0.07]'
                          : isToday && isPeak
                            ? 'bg-accent'
                            : isToday
                              ? 'bg-fg/70'
                              : 'bg-fg/85'
                      }`}
                    />
                  )
                })}
              </div>
              <span
                className={`num shrink-0 text-center text-[10px] ${
                  isToday ? 'text-fg' : 'text-muted'
                }`}
              >
                {label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Fixed footer status line */}
      <div className="flex min-h-[22px] shrink-0 items-center justify-between border-t border-line/60 pt-2.5 font-mono text-[10px] uppercase tracking-wider text-muted">
        <span className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden="true"
            className={`dot ${hasActivity ? 'bg-accent animate-pulse' : 'bg-fg/20'}`}
          />
          <span className="truncate">
            {hasActivity
              ? `${activeTrackHours} h this week`
              : isAllTrack
                ? 'No activity this week'
                : `No activity on ${activeTrack}`}
          </span>
        </span>
        <span className="shrink-0 opacity-60">{hasActivity ? 'Active' : 'Standby'}</span>
      </div>
    </BentoCard>
  )
})
