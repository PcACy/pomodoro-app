import { useCallback, useLayoutEffect, useMemo, useState } from 'react'
import { DEFAULT_MODE, MODE_KEY } from '../themes'
import type { ColorMode } from '../themes'

const THEME_BG_HEX: Record<ColorMode, string> = {
  dark: '#000000',
  light: '#f5f5f5',
}

const applyTheme = (mode: ColorMode): void => {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = 'nothing'
  document.documentElement.dataset.mode = mode
  document.documentElement.classList.toggle('dark', mode === 'dark')

  // Dynamically synchronize OS status bar & browser chrome theme-color
  const hex = THEME_BG_HEX[mode] ?? (mode === 'dark' ? '#000000' : '#f5f5f5')
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute('name', 'theme-color')
    document.head.appendChild(meta)
  }
  meta.setAttribute('content', hex)
}

const VALID_MODES: Record<string, ColorMode> = {
  dark: 'dark',
  light: 'light',
}

export function useTheme(): [ColorMode, (mode: ColorMode) => void] {
  const [colorMode, setColorModeState] = useState<ColorMode>(() => {
    let mode = DEFAULT_MODE
    try {
      const savedMode = localStorage.getItem(MODE_KEY)
      if (savedMode && savedMode in VALID_MODES) {
        mode = savedMode as ColorMode
      }
    } catch {
      /* ignore */
    }
    return mode
  })

  useLayoutEffect(() => {
    applyTheme(colorMode)
  }, [colorMode])

  const setColorMode = useCallback(
    (mode: ColorMode) => {
      applyTheme(mode)
      setColorModeState(mode)
      try {
        localStorage.setItem(MODE_KEY, mode)
      } catch {
        /* ignore */
      }
    },
    [],
  )

  return [colorMode, setColorMode]
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
    // `colorMode` is intentionally a dependency even though the memo body
    // never names it: `readVar` reads live DOM values that `applyTheme`
    // rewrites on every mode change, so the cache must invalidate exactly then.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorMode])
}