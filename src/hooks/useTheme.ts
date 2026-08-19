import { useCallback, useMemo, useState } from 'react'
import { DEFAULT_THEME, THEME_KEY, type ThemeId } from '../themes'

const applyTheme = (id: ThemeId): void => {
  document.documentElement.dataset.theme = id
}

const VALID_THEMES: Record<string, true> = {
  'gruvbox-dark': true,
  'gruvbox-light': true,
  'classic-dark': true,
  nord: true,
  catppuccin: true,
}

export function useTheme(): [ThemeId, (id: ThemeId) => void] {
  const [themeId, setThemeId] = useState<ThemeId>(() => {
    let id = DEFAULT_THEME
    try {
      const saved = localStorage.getItem(THEME_KEY)
      if (saved && saved in VALID_THEMES) id = saved as ThemeId
    } catch {
      /* ignore */
    }
    applyTheme(id)
    return id
  })

  const setTheme = useCallback((id: ThemeId) => {
    applyTheme(id)
    setThemeId(id)
    try {
      localStorage.setItem(THEME_KEY, id)
    } catch {
      /* ignore */
    }
  }, [])

  return [themeId, setTheme]
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
export function useThemeColors(themeId: ThemeId): ThemeColors {
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
  }, [themeId])
}