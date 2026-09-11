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
        <button
          type="button"
          onClick={handleNextTrack}
          disabled={tracks.length <= 1}
          className={`font-sans text-[10px] font-medium px-2.5 py-1 rounded-full border border-line bg-canvas text-muted transition-colors select-none ${
            tracks.length > 1
              ? 'hover:text-fg hover:border-fg/40 cursor-pointer active:scale-95'
              : 'cursor-default'
          }`}
          title={tracks.length > 1 ? 'Click to switch track' : undefined}
        >
          Track {currentTrackIndex + 1} of {tracks.length}
        </button>
      }
      className={className}
      contentClassName="justify-between h-full"
    >
      <div className="flex-1 flex flex-col justify-between py-0.5 gap-2 h-full">
        {/* Project Selection / Active Track Row with 44px Touch Targets */}
        <div className="flex min-h-[44px] items-center justify-between select-none">
          <div className="flex items-center gap-1 min-w-0">
            {/* Stepper controls with Fitts's Law 44px hitboxes */}
            <div className="flex items-center -ml-2">
              <button
                type="button"
                onClick={handlePrevTrack}
                disabled={tracks.length <= 1}
                className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-base transition-colors ${
                  tracks.length > 1
                    ? 'text-muted hover:text-fg hover:bg-neutral-500/10 active:scale-90 cursor-pointer'
                    : 'text-muted/30 cursor-default'
                }`}
                title="Previous track (‹)"
                aria-label="Previous track"
              >
                ‹
              </button>

              <button
                type="button"
                onClick={handleNextTrack}
                disabled={tracks.length <= 1}
                className={`min-h-[44px] px-3 flex items-center rounded-lg font-sans font-medium text-xs sm:text-sm text-fg transition-colors ${
                  tracks.length > 1
                    ? 'hover:bg-neutral-500/10 active:scale-98 cursor-pointer'
                    : 'cursor-default'
                }`}
                title="Click to switch track"
              >
                <span className="truncate max-w-[140px] sm:max-w-[200px]">
                  {activeTrack}
                </span>
              </button>

              <button
                type="button"
                onClick={handleNextTrack}
                disabled={tracks.length <= 1}
                className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-base transition-colors ${
                  tracks.length > 1
                    ? 'text-muted hover:text-fg hover:bg-neutral-500/10 active:scale-90 cursor-pointer'
                    : 'text-muted/30 cursor-default'
                }`}
                title="Next track (›)"
                aria-label="Next track"
              >
                ›
              </button>
            </div>
          </div>

          <span className="text-fg/80 tabular-nums font-sans font-medium text-xs sm:text-sm shrink-0 ml-2">
            {activeTrackHours} h
          </span>
        </div>

        {/* 7-Column Full-Width VU-Meter LED Equalizer Grid */}
        <div className="w-full grid grid-cols-7 gap-2 sm:gap-2.5 px-1 my-1">
          {DAY_LABELS.map((label, dayIdx) => {
            const dayMins = dayMinutes[dayIdx] ?? 0
            const isToday = dayIdx === todayIdx
            const activeCount =
              dayMins > 0 ? Math.min(6, Math.max(1, Math.ceil(dayMins / MINUTES_PER_BLOCK))) : 0

            return (
              <div
                key={dayIdx}
                className="flex flex-col items-center gap-1.5 w-full"
                title={`${label}: ${dayMins} min`}
              >
                {/* Day header letter */}
                <span
                  className={`font-sans text-[10px] sm:text-[11px] select-none ${
                    isToday ? 'text-fg dark:text-white font-bold' : 'text-muted/60 font-normal'
                  }`}
                >
                  {label}
                </span>

                {/* Vertical LED Column (6 flat slabs stacked top to bottom) */}
                <div
                  className="w-full flex flex-col gap-1"
                  role="img"
                  aria-label={`${label}: ${dayMins} minutes (${activeCount}/6 segments)`}
                >
                  {LED_LEVELS.map((level) => {
                    const isActive = activeCount >= level
                    const isPeak = isActive && activeCount === level

                    let segmentStyle = isToday
                      ? 'bg-black/[0.04] border border-black/15 dark:bg-white/[0.04] dark:border-white/15'
                      : 'bg-black/[0.04] border border-black/5 dark:bg-white/[0.04] dark:border-white/5'

                    if (isActive) {
                      if (isToday && isPeak) {
                        segmentStyle = 'bg-accent border border-accent'
                      } else {
                        segmentStyle = 'bg-fg border border-fg'
                      }
                    }

                    return (
                      <div
                        key={level}
                        className={`w-full h-1.5 rounded-[1px] transition-colors duration-150 ${segmentStyle}`}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Fixed Footer Status Line */}
        <div className="pt-2 border-t border-line/40 flex h-7 items-center justify-between font-sans text-[11px] text-muted select-none">
          <span className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                hasActivity ? 'bg-accent animate-pulse' : 'bg-muted/40'
              }`}
            />
            <span>
              {hasActivity
                ? `${activeTrackHours} h logged this week`
                : isAllTrack
                  ? 'No activity this week'
                  : `No activity on ${activeTrack}`}
            </span>
          </span>
          <span className="text-muted/60 text-[10px]">
            {hasActivity ? 'Active' : 'Standby'}
          </span>
        </div>
      </div>
    </BentoCard>
  )
})
