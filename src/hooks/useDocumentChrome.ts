import { memo, useEffect, useRef } from 'react'
import type { PhaseId, TimerMode, TimerStatus } from '../types'
import { MS_PER_MINUTE } from '../lib/time'
import { useTranslation } from './useTranslation'
import { useFlowTimerTick, useTimerTick } from './useTimerTick'

const DEFAULT_FAVICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><path d="M4 8.5L5.5 4L9 7H15L18.5 4L20 8.5V16L16.5 19.5H7.5L4 16V8.5Z" stroke="#d71921" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="8" cy="12.5" r="1.25" fill="#d71921"/><circle cx="16" cy="12.5" r="1.25" fill="#d71921"/><circle cx="12" cy="15.5" r="1.3" fill="#d71921"/></svg>'
const DEFAULT_FAVICON = `data:image/svg+xml,${encodeURIComponent(DEFAULT_FAVICON_SVG)}`

// Static fallback theme colors per phase (avoids layout-thrashing getComputedStyle in ticker)
const PHASE_FAVICON_COLOR: Record<PhaseId, string> = {
  focus: '#d71921',
  shortBreak: '#4a9e5c',
  longBreak: '#5b9bf6',
}
const MUTED_FAVICON_COLOR = '#999999'
const FG_FAVICON_COLOR = '#ffffff'

let sharedFaviconCanvas: HTMLCanvasElement | null = null

function getFaviconCanvas(): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null
  if (!sharedFaviconCanvas) {
    sharedFaviconCanvas = document.createElement('canvas')
    sharedFaviconCanvas.width = 32
    sharedFaviconCanvas.height = 32
  }
  return sharedFaviconCanvas
}

/** Renders a 32x32 canvas: phase-colored progress ring + remaining minutes. */
function canvasFaviconDataUri(
  phase: PhaseId,
  running: boolean,
  progress: number,
  remainingMs: number,
): string {
  const c = getFaviconCanvas()
  if (!c) return DEFAULT_FAVICON
  const ctx = c.getContext('2d')
  if (!ctx) return DEFAULT_FAVICON

  const color = running ? PHASE_FAVICON_COLOR[phase] : MUTED_FAVICON_COLOR
  const cx = 16
  const cy = 16
  const r = 12.5
  const lw = 4

  ctx.clearRect(0, 0, 32, 32)

  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.lineWidth = lw
  ctx.strokeStyle = color
  ctx.globalAlpha = 0.25
  ctx.stroke()
  ctx.globalAlpha = 1

  const start = -Math.PI / 2
  const sweep = Math.PI * 2 * Math.min(1, Math.max(0, progress))
  ctx.beginPath()
  ctx.arc(cx, cy, r, start, start + sweep)
  ctx.lineWidth = lw
  ctx.lineCap = 'round'
  ctx.strokeStyle = color
  ctx.stroke()

  const mins = Math.max(1, Math.ceil(remainingMs / MS_PER_MINUTE))
  ctx.fillStyle = FG_FAVICON_COLOR
  ctx.font = 'bold 9px ui-monospace, SFMono-Regular, Menlo, monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(mins), cx, cy + 0.5)

  return c.toDataURL('image/png')
}

/** Keep the browser tab title and favicon in sync with the timer. */
function useDocumentChrome(
  phase: PhaseId,
  status: TimerStatus,
  time: string,
  progress: number,
  remainingMs: number,
  mode: TimerMode = 'pomodoro',
): void {
  const { t } = useTranslation()
  const progressRef = useRef(progress)
  const remainingMsRef = useRef(remainingMs)
  const lastFaviconRef = useRef<{ key: string; uri: string }>({ key: '', uri: DEFAULT_FAVICON })
  // Sync latest values for the title/favicon effect below. Declared first so
  // it always runs before the consumer on every commit (effects run in order).
  useEffect(() => {
    progressRef.current = progress
    remainingMsRef.current = remainingMs
  })

  useEffect(() => {
    const paused = status === 'paused'
    const phaseLabel = mode === 'flow' ? t.timer.flow : t.phases[phase]
    const nextTitle =
      status === 'idle'
        ? 'Pomau'
        : `${time} (${phaseLabel}) - Pomau${paused ? ` (${t.paused})` : ''}`

    if (document.title !== nextTitle) {
      document.title = nextTitle
    }

    const link = document.querySelector<HTMLLinkElement>('#dynamic-favicon')
    if (!link) return
    if (status === 'idle') {
      if (link.href !== DEFAULT_FAVICON) link.href = DEFAULT_FAVICON
      return
    }

    const mins =
      mode === 'flow'
        ? Math.floor(remainingMsRef.current / MS_PER_MINUTE)
        : Math.max(1, Math.ceil(remainingMsRef.current / MS_PER_MINUTE))
    // 60 progress steps around the circle (matches discrete visual change)
    const progressBucket = Math.round(progressRef.current * 60)
    const cacheKey = `${mode}:${phase}:${status}:${mins}:${progressBucket}`

    if (lastFaviconRef.current.key !== cacheKey) {
      const uri = canvasFaviconDataUri(
        phase,
        status === 'running',
        mode === 'flow' ? 1 : progressRef.current,
        remainingMsRef.current,
      )
      lastFaviconRef.current = { key: cacheKey, uri }
      link.href = uri
    }
  }, [phase, status, time, mode, t])

  // Reset tab chrome exactly once on unmount (not on every tick/phase change,
  // which would briefly flash the default title and favicon).
  useEffect(() => {
    return () => {
      document.title = 'Pomau'
      const linkEl = document.querySelector<HTMLLinkElement>('#dynamic-favicon')
      if (linkEl && linkEl.href !== DEFAULT_FAVICON) {
        linkEl.href = DEFAULT_FAVICON
      }
    }
  }, [])
}

interface DocumentChromeProps {
  phase: PhaseId
  status: TimerStatus
  mode: TimerMode
}

/** Standalone subscriber component to isolate document.title and favicon updates from App re-renders. */
export const DocumentChrome = memo(function DocumentChrome({ phase, status, mode }: DocumentChromeProps) {
  const timerTick = useTimerTick()
  const flowTick = useFlowTimerTick()

  const isFlow = mode === 'flow'
  const time = isFlow ? flowTick.time : timerTick.time
  const progress = isFlow ? 0 : timerTick.progress
  const remaining = isFlow ? flowTick.elapsedMs : timerTick.remainingMs

  useDocumentChrome(phase, status, time, progress, remaining, mode)
  return null
})
