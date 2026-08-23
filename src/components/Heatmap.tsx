import { memo, useMemo, useState } from 'react'
import type { MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { WEEKDAY_SHORT } from '../lib/time'
import type { HeatmapCell, HeatmapWeek } from '../lib/stats'
import { useTranslation } from '../hooks/useTranslation'

interface Props {
  weeks: HeatmapWeek[]
}

const LEVELS = [0, 15, 45, 90, 150]
const WEEKDAY_ROWS = [0, 1, 2, 3, 4, 5, 6]
const DAY_LABELS = [0, 2, 4]

function cellClass(minutes: number): string {
  if (minutes <= 0) return 'bg-heatmap-l0 border border-heatmap-l0-border hover:border-accent/60'
  if (minutes < 30) return 'bg-accent/25 border border-accent/35 hover:ring-1 hover:ring-accent'
  if (minutes < 60) return 'bg-accent/50 border border-accent/55 hover:ring-1 hover:ring-accent'
  if (minutes < 120) return 'bg-accent/75 border border-accent/75 hover:ring-1 hover:ring-accent'
  return 'bg-accent border border-accent shadow-sm shadow-accent/25 hover:ring-1 hover:ring-accent'
}

interface Tip {
  x: number
  y: number
  cell: HeatmapCell
}

export const Heatmap = memo(function Heatmap({ weeks }: Props) {
  const { t, lang } = useTranslation()
  const locale = lang === 'de' ? 'de-DE' : 'en-GB'
  const [tip, setTip] = useState<Tip | null>(null)

  const monthLabels = useMemo(() => {
    const labels: { index: number; text: string }[] = []
    let prevMonth = -1
    let lastLabelCol = -999

    weeks.forEach((w, i) => {
      const month = w.start.getMonth()
      if (month !== prevMonth) {
        prevMonth = month
        const rawText = w.start.toLocaleDateString(locale, { month: 'short' }).replace('.', '').trim()
        const text = rawText.charAt(0).toUpperCase() + rawText.slice(1, 3)

        // If the initial label was at index 0 and a new month starts within 2 weeks,
        // replace the initial sliver with the actual full month label
        if (labels.length === 1 && labels[0].index === 0 && i < 3) {
          labels[0] = { index: i, text }
          lastLabelCol = i
        } else if (i - lastLabelCol >= 3) {
          labels.push({ index: i, text })
          lastLabelCol = i
        }
      }
    })
    return labels
  }, [weeks, locale])

  const dayLabel = (i: number): string =>
    lang === 'de' ? WEEKDAY_SHORT[i] : t.weekdays[i].slice(0, 3)

  // Pre-format cell dates into a Map lookup table for speed and localization consistency.
  const formattedDates = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short' })
    const map = new Map<string, string>()
    for (const week of weeks) {
      for (const cell of week.days) {
        map.set(cell.key, formatter.format(cell.date))
      }
    }
    return map
  }, [weeks, locale])

  const getFormattedDate = (cell: HeatmapCell): string =>
    formattedDates.get(cell.key) ?? cell.date.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })

  const handleMove = (e: MouseEvent<HTMLDivElement>, cell: HeatmapCell) => {
    setTip({ x: e.clientX, y: e.clientY, cell })
  }

  return (
    <>
      <div className="overflow-x-auto pb-2 [scrollbar-width:thin]">
        <div className="relative inline-block min-w-full">
          {/* Month Labels Header: accurately aligned above each week column */}
          <div className="relative mb-2 h-4 pointer-events-none">
            {monthLabels.map(({ index, text }) => (
              <span
                key={`${index}-${text}`}
                className="absolute whitespace-nowrap font-mono text-[10px] font-medium text-muted"
                style={{ left: `${31 + index * 15}px` }}
              >
                {text}
              </span>
            ))}
          </div>

          <div className="flex gap-[3px]">
            {/* Weekday labels aligned pixel-perfect to 7 rows */}
            <div className="flex w-7 shrink-0 flex-col gap-[3px] pr-1 text-right text-[10px] font-mono text-muted select-none">
              {WEEKDAY_ROWS.map((i) => (
                <span key={i} className="flex h-3 items-center justify-end leading-none">
                  {DAY_LABELS.includes(i) ? dayLabel(i) : ''}
                </span>
              ))}
            </div>

            {/* 52-53 Week Grid Columns */}
            {weeks.map((week) => (
              <div key={week.start.getTime()} className="flex flex-col gap-[3px]">
                {week.days.map((cell) => (
                  <div
                    key={cell.key}
                    role="img"
                    aria-label={t.heatmap.tooltip(cell.minutes, cell.count, getFormattedDate(cell))}
                    className={`h-3 w-3 cursor-pointer rounded-[2px] transition-transform duration-100 hover:scale-125 hover:z-20 ${cellClass(
                      cell.minutes,
                    )}`}
                    onMouseMove={(e) => handleMove(e, cell)}
                    onMouseLeave={() => setTip(null)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-muted select-none">
        <span>{t.heatmap.less}</span>
        {LEVELS.map((m) => (
          <span key={m} className={`h-3 w-3 rounded-[2px] ${cellClass(m)}`} />
        ))}
        <span>{t.heatmap.more}</span>
      </div>

      {tip &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[9999] flex flex-col gap-0.5 rounded-card border border-line bg-surface/95 px-3 py-2 text-xs font-medium text-fg shadow-2xl backdrop-blur-md transition-opacity duration-100"
            style={{
              left: Math.max(12, Math.min(tip.x - 100, window.innerWidth - 220)),
              top: Math.max(12, tip.y - 68),
            }}
          >
            <span className="font-semibold text-fg">{getFormattedDate(tip.cell)}</span>
            <span className="text-[11px] font-mono tabular-nums text-muted">
              {tip.cell.minutes > 0 ? (
                <>
                  <span className="font-semibold text-accent">
                    {tip.cell.minutes} {lang === 'de' ? 'Min. Fokus' : 'min focus'}
                  </span>
                  <span> · </span>
                  <span>
                    {tip.cell.count}{' '}
                    {tip.cell.count === 1
                      ? lang === 'de'
                        ? 'Session'
                        : 'session'
                      : lang === 'de'
                        ? 'Sessions'
                        : 'sessions'}
                  </span>
                </>
              ) : (
                <span>{lang === 'de' ? 'Keine Fokuszeit (0 Sessions)' : 'No focus time (0 sessions)'}</span>
              )}
            </span>
          </div>,
          document.body,
        )}
    </>
  )
})