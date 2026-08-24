import { useCallback, useMemo, useState } from 'react'
import { DEFAULT_MODE, DEFAULT_THEME, MODE_KEY, THEME_KEY } from '../themes'
import type { ColorMode, ThemeId } from '../themes'

const THEME_BG_HEX: Record<ThemeId, Record<ColorMode, string>> = {
  gruvbox: {
    dark: '#282828',
    light: '#fbf1c7',
  },
  'ios-26': {
    dark: '#000000',
    light: '#f2f2f7',
  },
  'material-you': {
    dark: '#141218',
    light: '#fdf8fd',
  },
}

const applyTheme = (id: ThemeId, mode: ColorMode): void => {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = id
  document.documentElement.dataset.mode = mode
  document.documentElement.classList.toggle('dark', mode === 'dark')

  // Dynamically synchronize OS status bar & browser chrome theme-color
  const hex = THEME_BG_HEX[id]?.[mode] ?? (mode === 'dark' ? '#282828' : '#fbf1c7')
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute('name', 'theme-color')
    document.head.appendChild(meta)
  }
  meta.setAttribute('content', hex)
}

const VALID_THEMES: Record<string, ThemeId> = {
  gruvbox: 'gruvbox',
  'gruvbox-dark': 'gruvbox',
  'gruvbox-light': 'gruvbox',
  'ios-26': 'ios-26',
  'material-you': 'material-you',
}

const VALID_MODES: Record<string, ColorMode> = {
  dark: 'dark',
  light: 'light',
}

export function useTheme(): [
  ThemeId,
  (id: ThemeId) => void,
  ColorMode,
  (mode: ColorMode) => void,
] {
  const [themeId, setThemeId] = useState<ThemeId>(() => {
    let id = DEFAULT_THEME
    try {
      const saved = localStorage.getItem(THEME_KEY)
      if (saved && saved in VALID_THEMES) {
        id = VALID_THEMES[saved]
      }
    } catch {
      /* ignore */
    }
    return id
  })

  const [colorMode, setColorModeState] = useState<ColorMode>(() => {
    let mode = DEFAULT_MODE
    try {
      const savedMode = localStorage.getItem(MODE_KEY)
      if (savedMode && savedMode in VALID_MODES) {
        mode = savedMode as ColorMode
      } else {
        const savedTheme = localStorage.getItem(THEME_KEY)
        if (savedTheme === 'gruvbox-light') mode = 'light'
      }
    } catch {
      /* ignore */
    }
    return mode
  })

  // Synchronously ensure root datasets are set
  applyTheme(themeId, colorMode)

  const setTheme = useCallback(
    (id: ThemeId) => {
      applyTheme(id, colorMode)
      setThemeId(id)
      try {
        localStorage.setItem(THEME_KEY, id)
      } catch {
        /* ignore */
      }
    },
    [colorMode],
  )

  const setColorMode = useCallback(
    (mode: ColorMode) => {
      applyTheme(themeId, mode)
      setColorModeState(mode)
      try {
        localStorage.setItem(MODE_KEY, mode)
      } catch {
        /* ignore */
      }
    },
    [themeId],
  )

  return [themeId, setTheme, colorMode, setColorMode]
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
export function useThemeColors(themeId: ThemeId, colorMode: ColorMode): ThemeColors {
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
  }, [themeId, colorMode])
}