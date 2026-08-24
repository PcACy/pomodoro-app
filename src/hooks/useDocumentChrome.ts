import { memo, useEffect, useRef } from 'react'
import type { PhaseId, TimerMode, TimerStatus } from '../types'
import { MS_PER_MINUTE } from '../lib/time'
import { useTranslation } from './useTranslation'
import { useFlowTimerTick, useTimerTick } from './useTimerTick'

const DEFAULT_FAVICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#fe8019" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 8.5L2 3.5L7.5 5C9 4.3 10.5 4 12 4C13.5 4 15 4.3 16.5 5L22 3.5L20.5 8.5C21.5 10.5 22 12.5 22 15C22 19 18 21.5 12 21.5C6 21.5 2 19 2 15C2 12.5 2.5 10.5 3.5 8.5Z"/><path d="M4.8 6.8L6 8.5M19.2 6.8L18 8.5" stroke-width="1.5"/><path d="M7 13.5C8 12.5 9.5 12.8 10 13.8C9.2 14.3 7.8 14.3 7 13.5ZM17 13.5C16 12.5 14.5 12.8 14 13.8C14.8 14.3 16.2 14.3 17 13.5Z" fill="#fe8019" stroke="none"/><path d="M11.2 16.8L12 17.5L12.8 16.8" stroke-width="1.5"/></svg>'
const DEFAULT_FAVICON = `data:image/svg+xml,${encodeURIComponent(DEFAULT_FAVICON_SVG)}`

// Static fallback theme colors per phase (avoids layout-thrashing getComputedStyle in ticker)
const PHASE_FAVICON_COLOR: Record<PhaseId, string> = {
  focus: '#fe8019',
  shortBreak: '#b8bb26',
  longBreak: '#8ec07c',
}
const MUTED_FAVICON_COLOR = '#a89984'
const FG_FAVICON_COLOR = '#ebdbb2'

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
export function useDocumentChrome(
  phase: PhaseId,
  status: TimerStatus,
  time: string,
  progress: number,
  remainingMs: number,
): void {
  const { t } = useTranslation()
  const progressRef = useRef(progress)
  const remainingMsRef = useRef(remainingMs)
  const lastFaviconRef = useRef<{ key: string; uri: string }>({ key: '', uri: DEFAULT_FAVICON })
  progressRef.current = progress
  remainingMsRef.current = remainingMs

  useEffect(() => {
    const paused = status === 'paused'
    const nextTitle =
      status === 'idle'
        ? 'Pomau'
        : `${time} (${t.phases[phase]}) - Pomau${paused ? ` (${t.paused})` : ''}`

    if (document.title !== nextTitle) {
      document.title = nextTitle
    }

    const link = document.querySelector<HTMLLinkElement>('#dynamic-favicon')
    if (!link) return
    if (status === 'idle') {
      if (link.href !== DEFAULT_FAVICON) link.href = DEFAULT_FAVICON
      return
    }

    const mins = Math.max(1, Math.ceil(remainingMsRef.current / MS_PER_MINUTE))
    // 60 progress steps around the circle (matches discrete visual change)
    const progressBucket = Math.round(progressRef.current * 60)
    const cacheKey = `${phase}:${status}:${mins}:${progressBucket}`

    if (lastFaviconRef.current.key !== cacheKey) {
      const uri = canvasFaviconDataUri(
        phase,
        status === 'running',
        progressRef.current,
        remainingMsRef.current,
      )
      lastFaviconRef.current = { key: cacheKey, uri }
      link.href = uri
    }

    return () => {
      document.title = 'Pomau'
      const linkEl = document.querySelector<HTMLLinkElement>('#dynamic-favicon')
      if (linkEl && linkEl.href !== DEFAULT_FAVICON) {
        linkEl.href = DEFAULT_FAVICON
      }
    }
  }, [phase, status, time, t])
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

  useDocumentChrome(phase, status, time, progress, remaining)
  return null
})