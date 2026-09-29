import { useCallback, useLayoutEffect, useMemo, useState } from 'react'
import {
  DEFAULT_MODE,
  DEFAULT_THEME,
  MODE_KEY,
  THEME_KEY,
  THEMES,
} from '../themes'
import type { ColorMode, ThemeId } from '../themes'

/** Card backgrounds are opaque hex values; derive an RGB triplet for Tailwind. */
function surfaceRgb(cardBg: string, mode: ColorMode): string {
  const hex = cardBg.trim()
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (m) {
    const n = parseInt(m[1], 16)
    return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`
  }
  return mode === 'dark' ? '11 11 12' : '255 255 255'
}

const applyTheme = (themeId: ThemeId): void => {
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
  root.style.setProperty('--accent-subtle', config.accentSubtle)

  // Framework mapped tokens for Tailwind classes. These mirror the ramps
  // declared in index.css — the inline values win so every colorway keeps the
  // same surface elevation model instead of drifting per theme.
  root.style.setProperty('--c-canvas', config.canvasRgb)
  root.style.setProperty('--c-surface', surfaceRgb(config.cardBg, config.colorMode))
  root.style.setProperty(
    '--c-raised',
    config.colorMode === 'dark' ? '22 22 24' : '240 240 242',
  )
  root.style.setProperty(
    '--c-line',
    config.colorMode === 'dark' ? '42 42 46' : '214 214 218',
  )
  root.style.setProperty(
    '--c-track',
    config.colorMode === 'dark' ? '26 26 28' : '232 232 235',
  )
  root.style.setProperty('--c-fg', config.textPrimaryRgb)
  root.style.setProperty('--c-muted', config.textMutedRgb)
  root.style.setProperty('--accent-strong', config.accentRgb)

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