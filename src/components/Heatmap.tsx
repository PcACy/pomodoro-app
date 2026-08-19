import { memo, useMemo, useState } from 'react'
import type { MouseEvent } from 'react'
import { WEEKDAY_SHORT } from '../lib/time'
import type { HeatmapCell, HeatmapWeek } from '../lib/stats'
import { useTranslation } from '../hooks/useTranslation'

interface Props {
  weeks: HeatmapWeek[]
}

const CELL = 14
const GAP = 4
const WEEK_PITCH = CELL + GAP
const Y_LABEL_COL = 28
const LEVELS = [0, 15, 45, 90, 150]
const WEEKDAY_ROWS = [0, 1, 2, 3, 4, 5, 6]
const DAY_LABELS = [0, 2, 4]

function cellClass(minutes: number): string {
  if (minutes <= 0) return 'bg-track'
  if (minutes < 30) return 'bg-accent/25'
  if (minutes < 60) return 'bg-accent/45'
  if (minutes < 120) return 'bg-accent/70'
  return 'bg-accent/90'
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
    weeks.forEach((w, i) => {
      if (w.start.getMonth() !== prevMonth) {
        labels.push({
          index: i,
          text: w.start.toLocaleDateString(locale, { month: 'short' }).replace('.', ''),
        })
        prevMonth = w.start.getMonth()
      }
    })
    return labels
  }, [weeks, locale])

  const dayLabel = (i: number): string =>
    lang === 'de' ? WEEKDAY_SHORT[i] : t.weekdays[i].slice(0, 3)

  const formatTooltipDate = (d: Date): string =>
    d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })

  const handleMove = (e: MouseEvent<HTMLDivElement>, cell: HeatmapCell) => {
    setTip({ x: e.clientX, y: e.clientY, cell })
  }

  return (
    <>
      <div className="overflow-x-auto">
        <div className="relative inline-block pt-6">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-5">
            {monthLabels.map(({ index, text }) => (
              <span
                key={`${index}-${text}`}
                className="absolute -translate-x-1/2 whitespace-nowrap text-[10px] text-muted"
                style={{ left: Y_LABEL_COL + GAP + index * WEEK_PITCH + CELL / 2 }}
              >
                {text}
              </span>
            ))}
          </div>

          <div className="flex gap-1">
            <div className="flex w-7 shrink-0 flex-col justify-between pr-1 text-right text-[10px] text-muted">
              {WEEKDAY_ROWS.map((i) => (
                <span key={i} className="h-3.5 leading-[14px]">
                  {DAY_LABELS.includes(i) ? dayLabel(i) : ''}
                </span>
              ))}
            </div>

            {weeks.map((week) => (
              <div key={week.start.toISOString()} className="flex flex-col gap-1">
                {week.days.map((cell) => (
                  <div
                    key={cell.key}
                    role="img"
                    aria-label={t.heatmap.tooltip(cell.minutes, cell.count, formatTooltipDate(cell.date))}
                    className={`h-3.5 w-3.5 cursor-pointer rounded-sm transition-colors hover:ring-1 hover:ring-accent-strong/60 ${cellClass(cell.minutes)}`}
                    onMouseMove={(e) => handleMove(e, cell)}
                    onMouseLeave={() => setTip(null)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-muted">
        <span>{t.heatmap.less}</span>
        {LEVELS.map((m) => (
          <span key={m} className={`h-3.5 w-3.5 rounded-sm ${cellClass(m)}`} />
        ))}
        <span>{t.heatmap.more}</span>
      </div>

      {tip && (
        <div
          className="pointer-events-none fixed z-50 rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-xs font-medium text-fg shadow-lg"
          style={{
            left: Math.max(8, Math.min(tip.x + 14, window.innerWidth - 190)),
            top: tip.y + 16,
          }}
        >
          {t.heatmap.tooltip(tip.cell.minutes, tip.cell.count, formatTooltipDate(tip.cell.date))}
        </div>
      )}
    </>
  )
})