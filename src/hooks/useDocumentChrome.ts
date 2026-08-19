import { useEffect } from 'react'
import type { PhaseId, TimerStatus } from '../types'
import { PHASE_LABELS } from '../types'

const CSS_VAR: Record<PhaseId, string> = {
  focus: '--c-accent',
  shortBreak: '--c-break',
  longBreak: '--c-long',
}

function themeColor(varName: string): string {
  const val = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
  return val ? `rgb(${val})` : '#808080'
}

function faviconDataUri(phase: PhaseId, running: boolean): string {
  const dot = running ? themeColor(CSS_VAR[phase]) : themeColor('--c-muted')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="13" fill="${dot}"/></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

/** Keep the browser tab title and favicon in sync with the timer. */
export function useDocumentChrome(phase: PhaseId, status: TimerStatus, time: string): void {
  useEffect(() => {
    const paused = status === 'paused'
    document.title = `${time} · ${PHASE_LABELS[phase]}${paused ? ' (pausiert)' : ''}`
    const link = document.querySelector<HTMLLinkElement>('#dynamic-favicon')
    if (link) link.href = faviconDataUri(phase, status === 'running')
  }, [phase, status, time])
}