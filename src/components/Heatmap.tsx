import { fmtDate } from '../lib/time'
import { WEEKDAY_SHORT } from '../lib/time'
import type { HeatmapWeek } from '../lib/stats'

interface Props {
  weeks: HeatmapWeek[]
}

function cellClass(minutes: number): string {
  if (minutes <= 0) return 'bg-raised'
  if (minutes < 30) return 'bg-accent/25'
  if (minutes < 60) return 'bg-accent/45'
  if (minutes < 120) return 'bg-accent/70'
  return 'bg-accent/90'
}

export function Heatmap({ weeks }: Props) {
  return (
    <div className="overflow-x-auto">
      <div className="inline-flex gap-[3px]">
        <div className="mr-1 flex flex-col justify-between py-0.5 text-[10px] text-muted">
          {WEEKDAY_SHORT.map((d) => (
            <span key={d} className="h-[11px] leading-[11px]">
              {d}
            </span>
          ))}
        </div>
        {weeks.map((week) => (
          <div key={week.start.toISOString()} className="flex flex-col gap-[3px]">
            {week.days.map((cell) => (
              <div
                key={cell.key}
                title={`${fmtDate(cell.date)}: ${cell.minutes} min`}
                className={`h-[11px] w-[11px] rounded-[2px] ${cellClass(cell.minutes)}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted">
        <span>Weniger</span>
        {[0, 15, 45, 90, 150].map((m) => (
          <span key={m} className={`h-2.5 w-2.5 rounded-[2px] ${cellClass(m)}`} />
        ))}
        <span>Mehr</span>
      </div>
    </div>
  )
}