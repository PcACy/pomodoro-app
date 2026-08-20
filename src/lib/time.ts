export const MS_PER_MINUTE = 60_000
export const MS_PER_DAY = 86_400_000

export const fmtTime = (ms: number): string => {
  const totalSec = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

/** Count-up format, always with hours: "00:00:00", "01:02:03", "25:00:00". */
export const fmtElapsed = (ms: number): string => {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export const fmtDuration = (ms: number, lang: 'de' | 'en' = 'de'): string => {
  const min = Math.round(ms / MS_PER_MINUTE)
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const rest = min % 60
  if (rest > 0) return lang === 'de' ? `${h} h ${rest} min` : `${h}h ${rest}m`
  return lang === 'de' ? `${h} h` : `${h}h`
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Local date key, e.g. "2026-08-19" */
export const dayKey = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const startOfDay = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate())

/** Monday as first day of week */
export const startOfWeek = (d: Date): Date => {
  const s = startOfDay(d)
  const offset = (s.getDay() + 6) % 7
  return new Date(s.getFullYear(), s.getMonth(), s.getDate() - offset)
}

export const addDays = (d: Date, n: number): Date =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds())

export const sameDay = (a: Date, b: Date): boolean => dayKey(a) === dayKey(b)

/** "Mo", "Di", … short German weekday labels, Monday-indexed (0 = Mo) */
export const WEEKDAY_SHORT: string[] = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

export const fmtDate = (d: Date, locale = 'de-DE'): string =>
  d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' })

export const fmtDateTime = (d: Date, locale = 'de-DE'): string =>
  d.toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })