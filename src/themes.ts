export type ColorMode = 'dark' | 'light'

export const MODE_KEY = 'pomodoro.colorMode'
export const THEME_KEY = 'pomodoro.themeId'
export const DEFAULT_MODE: ColorMode = 'dark'
export const DEFAULT_THEME: ThemeId = 'nothing-dark'

export type ThemeId =
  | 'nothing-dark'
  | 'nothing-light'
  | 'cmf-orange'
  | 'nothing-sage'
  | 'nothing-cobalt'

export interface ThemeDefinition {
  id: ThemeId
  name: string
  label: string
  subtitle: string
  colorMode: ColorMode
  canvas: string
  canvasRgb: string
  cardBg: string
  cardBorder: string
  accent: string
  accentRgb: string
  accentSubtle: string
  textPrimary: string
  textPrimaryRgb: string
  textMuted: string
  textMutedRgb: string
  badge: string
}

export const THEMES: Record<ThemeId, ThemeDefinition> = {
  'nothing-dark': {
    id: 'nothing-dark',
    name: 'Nothing Dark',
    label: 'Dark',
    subtitle: 'Default Monochrome',
    colorMode: 'dark',
    canvas: '#050505',
    canvasRgb: '5 5 5',
    cardBg: 'rgba(15, 15, 15, 0.7)',
    cardBorder: 'rgba(255, 255, 255, 0.08)',
    accent: '#E51E2B',
    accentRgb: '229 30 43',
    accentSubtle: 'rgba(229, 30, 43, 0.125)',
    textPrimary: '#E8E8E8',
    textPrimaryRgb: '232 232 232',
    textMuted: '#999999',
    textMutedRgb: '153 153 153',
    badge: 'NOTHING-DARK',
  },
  'nothing-light': {
    id: 'nothing-light',
    name: 'Nothing Light',
    label: 'Light',
    subtitle: 'Braun / Rams Red',
    colorMode: 'light',
    canvas: '#EFEFEF',
    canvasRgb: '239 239 239',
    cardBg: 'rgba(255, 255, 255, 0.85)',
    cardBorder: 'rgba(0, 0, 0, 0.06)',
    accent: '#D71921',
    accentRgb: '215 25 33',
    accentSubtle: 'rgba(215, 25, 33, 0.12)',
    textPrimary: '#171717',
    textPrimaryRgb: '23 23 23',
    textMuted: '#737373',
    textMutedRgb: '115 115 115',
    badge: 'NOTHING-LIGHT',
  },
  'cmf-orange': {
    id: 'cmf-orange',
    name: 'CMF Orange',
    label: 'CMF Orange',
    subtitle: 'Industrial Safety',
    colorMode: 'dark',
    canvas: '#0B0B0C',
    canvasRgb: '11 11 12',
    cardBg: 'rgba(20, 20, 22, 0.8)',
    cardBorder: 'rgba(255, 85, 0, 0.12)',
    accent: '#FF5500',
    accentRgb: '255 85 0',
    accentSubtle: 'rgba(255, 85, 0, 0.15)',
    textPrimary: '#EAEAEA',
    textPrimaryRgb: '234 234 234',
    textMuted: '#9E9EA4',
    textMutedRgb: '158 158 164',
    badge: 'CMF-ORANGE',
  },
  'nothing-sage': {
    id: 'nothing-sage',
    name: 'Nothing Sage',
    label: 'Sage',
    subtitle: 'OS 5.0 Earth',
    colorMode: 'dark',
    canvas: '#121614',
    canvasRgb: '18 22 20',
    cardBg: 'rgba(26, 32, 28, 0.8)',
    cardBorder: 'rgba(138, 155, 133, 0.15)',
    accent: '#8A9B85',
    accentRgb: '138 155 133',
    accentSubtle: 'rgba(138, 155, 133, 0.2)',
    textPrimary: '#E8EBE8',
    textPrimaryRgb: '232 235 232',
    textMuted: '#9BA49B',
    textMutedRgb: '155 164 155',
    badge: 'NOTHING-SAGE',
  },
  'nothing-cobalt': {
    id: 'nothing-cobalt',
    name: 'Nothing Cobalt',
    label: 'Cobalt',
    subtitle: 'Special Edition',
    colorMode: 'dark',
    canvas: '#080A10',
    canvasRgb: '8 10 16',
    cardBg: 'rgba(16, 20, 32, 0.8)',
    cardBorder: 'rgba(24, 72, 224, 0.15)',
    accent: '#2B5CFF',
    accentRgb: '43 92 255',
    accentSubtle: 'rgba(43, 92, 255, 0.2)',
    textPrimary: '#E8EAF6',
    textPrimaryRgb: '232 234 246',
    textMuted: '#9499B3',
    textMutedRgb: '148 153 179',
    badge: 'NOTHING-COBALT',
  },
}

export const THEME_LIST: ThemeDefinition[] = Object.values(THEMES)