import { memo, useMemo, useState } from 'react'
import type { MouseEvent } from 'react'
import { WEEKDAY_SHORT } from '../lib/time'
import type { HeatmapCell, HeatmapWeek } from '../lib/stats'
import { useTranslation } from '../hooks/useTranslation'

interface Props {
  weeks: HeatmapWeek[]
}

const CELL = 12
const GAP = 3
const WEEK_PITCH = CELL + GAP
const Y_LABEL_COL = 26
const LEVELS = [0, 15, 45, 90, 150]
const WEEKDAY_ROWS = [0, 1, 2, 3, 4, 5, 6]
const DAY_LABELS = [0, 2, 4]

function cellClass(minutes: number): string {
  if (minutes <= 0) return 'bg-white/[0.035] border border-white/[0.035] hover:border-white/20'
  if (minutes < 30) return 'bg-accent/25 border border-accent/30'
  if (minutes < 60) return 'bg-accent/50 border border-accent/50'
  if (minutes < 120) return 'bg-accent/75 border border-accent/70'
  return 'bg-accent border border-accent shadow-sm shadow-accent/25'
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
        const rawText = w.start.toLocaleDateString(locale, { month: 'short' }).replace('.', '').trim()
        const text = rawText.slice(0, 3)
        labels.push({
          index: i,
          text: text.charAt(0).toUpperCase() + text.slice(1),
        })
        prevMonth = w.start.getMonth()
      }
    })
    return labels
  }, [weeks, locale])

  const dayLabel = (i: number): string =>
    lang === 'de' ? WEEKDAY_SHORT[i] : t.weekdays[i].slice(0, 3)

  // Bolt Optimization: Pre-format cell dates once per `weeks` or `locale` update into a Map lookup table.
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
      <div className="overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="relative inline-block pt-6">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-5">
            {monthLabels.map(({ index, text }) => (
              <span
                key={`${index}-${text}`}
                className="absolute -translate-x-1/2 whitespace-nowrap text-[10px] font-medium text-muted"
                style={{ left: Y_LABEL_COL + GAP + index * WEEK_PITCH + CELL / 2 }}
              >
                {text}
              </span>
            ))}
          </div>

          <div className="flex gap-[3px]">
            <div className="flex w-[26px] shrink-0 flex-col justify-between pr-1 text-right text-[10px] font-mono text-muted">
              {WEEKDAY_ROWS.map((i) => (
                <span key={i} className="h-3 leading-[12px]">
                  {DAY_LABELS.includes(i) ? dayLabel(i) : ''}
                </span>
              ))}
            </div>

            {weeks.map((week) => (
              <div key={week.start.getTime()} className="flex flex-col gap-[3px]">
                {week.days.map((cell) => (
                  <div
                    key={cell.key}
                    role="img"
                    aria-label={t.heatmap.tooltip(cell.minutes, cell.count, getFormattedDate(cell))}
                    className={`h-3 w-3 cursor-pointer rounded-[2.5px] transition-all duration-150 hover:ring-1 hover:ring-accent-strong/80 ${cellClass(cell.minutes)}`}
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
          <span key={m} className={`h-3 w-3 rounded-[2.5px] ${cellClass(m)}`} />
        ))}
        <span>{t.heatmap.more}</span>
      </div>

      {tip && (
        <div
          className="pointer-events-none fixed z-50 flex flex-col gap-0.5 rounded-xl border border-line bg-canvas/95 px-3 py-2 text-xs font-medium text-fg shadow-xl backdrop-blur-md"
          style={{
            left: Math.max(12, Math.min(tip.x + 14, window.innerWidth - 230)),
            top: tip.y - 60,
          }}
        >
          <span className="font-semibold text-fg">{getFormattedDate(tip.cell)}</span>
          <span className="text-[11px] font-mono tabular-nums text-muted">
            {tip.cell.minutes > 0 ? (
              <>
                <span className="font-semibold text-accent">{tip.cell.minutes} Min. Fokus</span>
                <span> · </span>
                <span>{tip.cell.count} {tip.cell.count === 1 ? 'Session' : 'Sessions'}</span>
              </>
            ) : (
              <span>{lang === 'de' ? 'Keine Fokuszeit (0 Sessions)' : 'No focus time (0 sessions)'}</span>
            )}
          </span>
        </div>
      )}
    </>
  )
})