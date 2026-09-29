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

// Five intensity steps built purely from the design tokens so the heatmap
// follows the active colorway (cobalt, sage, orange) instead of hardcoding
// white/black alphas that vanish in light mode.
function cellClass(minutes: number): string {
  if (minutes <= 0)
    return 'border border-line/60 bg-fg/[0.05] hover:border-fg/40 hover:bg-fg/[0.09]'
  if (minutes < 30) return 'border border-fg/25 bg-fg/20 hover:bg-fg/35'
  if (minutes < 60) return 'border border-fg/40 bg-fg/45 hover:bg-fg/60'
  if (minutes < 120) return 'border border-fg/60 bg-fg/70 hover:bg-fg/85'
  return 'border border-fg bg-fg hover:bg-accent hover:border-accent'
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
      <div className="overflow-x-auto pb-1">
        <div className="relative w-fit min-w-full min-[900px]:min-w-0 min-[900px]:mx-auto">
          {/* Month labels header, aligned above each week column */}
          <div className="relative mb-2 h-3.5 pointer-events-none">
            {monthLabels.map(({ index, text }) => (
              <span
                key={`${index}-${text}`}
                className="label-sm absolute whitespace-nowrap"
                style={{ left: `${31 + index * 15}px` }}
              >
                {text}
              </span>
            ))}
          </div>

          <div className="flex gap-[3px]">
            {/* Weekday labels aligned pixel-perfect to 7 rows */}
            <div className="flex w-7 shrink-0 flex-col gap-[3px] pr-1 text-right">
              {WEEKDAY_ROWS.map((i) => (
                <span key={i} className="label-sm flex h-3 items-center justify-end leading-none">
                  {DAY_LABELS.includes(i) ? dayLabel(i) : ''}
                </span>
              ))}
            </div>

            {/* 52-53 week grid columns */}
            {weeks.map((week) => (
              <div key={week.start.getTime()} className="flex flex-col gap-[3px]">
                {week.days.map((cell) => (
                  <div
                    key={cell.key}
                    role="img"
                    aria-label={t.heatmap.tooltip(cell.minutes, cell.count, getFormattedDate(cell))}
                    className={`h-3 w-3 cursor-pointer rounded-[1px] transition-colors duration-100 hover:z-20 ${cellClass(
                      cell.minutes,
                    )}`}
                    onMouseMove={(e) => handleMove(e, cell)}
                    onMouseLeave={() => setTip(null)}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Intensity legend, flush with the right edge of the grid */}
          <div className="mt-3 flex items-center justify-end gap-1.5">
            <span className="label-sm">{t.heatmap.less}</span>
            {LEVELS.map((m) => (
              <span key={m} className={`h-3 w-3 rounded-[1px] ${cellClass(m)}`} />
            ))}
            <span className="label-sm">{t.heatmap.more}</span>
          </div>
        </div>
      </div>

      {tip &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="tooltip"
            className="panel pointer-events-none fixed z-[9999] flex flex-col gap-1 px-3 py-2"
            style={{
              left: Math.max(12, Math.min(tip.x - 100, window.innerWidth - 220)),
              top: Math.max(12, tip.y - 68),
            }}
          >
            <span className="label-sm text-fg">{getFormattedDate(tip.cell)}</span>
            <span className="num text-[11px] text-muted">
              {tip.cell.minutes > 0 ? (
                <>
                  <span className="text-fg">
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
                <span>{lang === 'de' ? 'Keine Fokuszeit' : 'No focus time'}</span>
              )}
            </span>
          </div>,
          document.body,
        )}
    </>
  )
})