import { useCallback, useLayoutEffect, useMemo, useState } from 'react'
import {
  DEFAULT_MODE,
  DEFAULT_THEME,
  MODE_KEY,
  THEME_KEY,
  THEMES,
} from '../themes'
import type { ColorMode, ThemeId } from '../themes'

export const applyTheme = (themeId: ThemeId): void => {
  if (typeof document === 'undefined') return
  const config = THEMES[themeId] || THEMES[DEFAULT_THEME]
  const root = document.documentElement

  root.dataset.theme = 'nothing'
  root.dataset.themeId = config.id
  root.dataset.mode = config.colorMode
  root.classList.toggle('dark', config.colorMode === 'dark')

  // Reactive semantic CSS variables
  root.style.setProperty('--bg-canvas', config.canvas)
  root.style.setProperty('--bg-card', config.cardBg)
  root.style.setProperty('--card-border', config.cardBorder)
  root.style.setProperty('--accent', config.accentRgb)
  root.style.setProperty('--accent-hex', config.accent)
  root.style.setProperty('--accent-subtle', config.accentSubtle)
  root.style.setProperty('--text-primary', config.textPrimary)
  root.style.setProperty('--text-muted', config.textMuted)

  // Framework mapped tokens for Tailwind classes
  root.style.setProperty('--c-canvas', config.canvasRgb)
  root.style.setProperty(
    '--c-surface',
    config.colorMode === 'dark' ? '15 15 15' : '255 255 255',
  )
  root.style.setProperty(
    '--c-raised',
    config.colorMode === 'dark' ? '24 24 24' : '240 240 240',
  )
  root.style.setProperty(
    '--c-line',
    config.colorMode === 'dark' ? '38 38 38' : '220 220 220',
  )
  root.style.setProperty('--c-fg', config.textPrimaryRgb)
  root.style.setProperty('--c-muted', config.textMutedRgb)
  root.style.setProperty('--c-accent', config.accentRgb)
  root.style.setProperty('--c-accent-strong', config.accentRgb)

  // Dynamically synchronize OS status bar & browser chrome theme-color
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute('name', 'theme-color')
    document.head.appendChild(meta)
  }
  meta.setAttribute('content', config.canvas)
}

export type ThemeHookTuple = [
  ColorMode,
  (mode: ColorMode) => void,
  ThemeId,
  (theme: ThemeId) => void,
] & {
  colorMode: ColorMode
  setColorMode: (mode: ColorMode) => void
  themeId: ThemeId
  setThemeId: (theme: ThemeId) => void
}

export function useTheme(): ThemeHookTuple {
  const [themeId, setThemeIdState] = useState<ThemeId>(() => {
    try {
      const savedTheme = localStorage.getItem(THEME_KEY)
      if (savedTheme && savedTheme in THEMES) {
        return savedTheme as ThemeId
      }
      const legacyMode = localStorage.getItem(MODE_KEY)
      if (legacyMode === 'light') {
        return 'nothing-light'
      }
    } catch {
      /* ignore */
    }
    return DEFAULT_THEME
  })

  useLayoutEffect(() => {
    applyTheme(themeId)
  }, [themeId])

  const setThemeId = useCallback((id: ThemeId) => {
    if (!THEMES[id]) return
    applyTheme(id)
    setThemeIdState(id)
    try {
      localStorage.setItem(THEME_KEY, id)
      localStorage.setItem(MODE_KEY, THEMES[id].colorMode)
    } catch {
      /* ignore */
    }
  }, [])

  const colorMode = THEMES[themeId]?.colorMode ?? DEFAULT_MODE

  const setColorMode = useCallback(
    (mode: ColorMode) => {
      if (mode === 'light') {
        setThemeId('nothing-light')
      } else {
        // If current theme is light, switch back to default dark or keep dark theme
        setThemeId(themeId === 'nothing-light' ? 'nothing-dark' : themeId)
      }
    },
    [themeId, setThemeId],
  )

  const result = useMemo(() => {
    const tuple = [colorMode, setColorMode, themeId, setThemeId] as ThemeHookTuple
    tuple.colorMode = colorMode
    tuple.setColorMode = setColorMode
    tuple.themeId = themeId
    tuple.setThemeId = setThemeId
    return tuple
  }, [colorMode, setColorMode, themeId, setThemeId])

  return result
}

const readVar = (name: string): string =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim()

export interface ThemeColors {
  canvas: string
  surface: string
  raised: string
  line: string
  fg: string
  muted: string
  accent: string
  accentStrong: string
  break: string
  long: string
  chart: string[]
}

/** Resolves the theme CSS variables to concrete `rgb(...)` strings (for Recharts, inline styles). */
export function useThemeColors(colorMode: ColorMode): ThemeColors {
  return useMemo(() => {
    const rgb = (name: string) => `rgb(${readVar(name)})`
    return {
      canvas: rgb('--c-canvas'),
      surface: rgb('--c-surface'),
      raised: rgb('--c-raised'),
      line: rgb('--c-line'),
      fg: rgb('--c-fg'),
      muted: rgb('--c-muted'),
      accent: rgb('--c-accent'),
      accentStrong: rgb('--c-accent-strong'),
      break: rgb('--c-break'),
      long: rgb('--c-long'),
      chart: Array.from({ length: 8 }, (_, i) => rgb(`--c-chart-${i + 1}`)),
    }
  }, [colorMode])
}