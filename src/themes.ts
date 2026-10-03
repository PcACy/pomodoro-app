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
    canvas: '#000000',
    canvasRgb: '0 0 0',
    cardBg: '#111111',
    cardBorder: '#222222',
    accent: '#D71921',
    accentRgb: '215 25 33',
    accentSubtle: 'rgba(215, 25, 33, 0.15)',
    textPrimary: '#e8e8e8',
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
    canvas: '#f5f5f5',
    canvasRgb: '245 245 245',
    cardBg: '#ffffff',
    cardBorder: '#e8e8e8',
    accent: '#D71921',
    accentRgb: '215 25 33',
    accentSubtle: 'rgba(215, 25, 33, 0.15)',
    textPrimary: '#1a1a1a',
    textPrimaryRgb: '26 26 26',
    textMuted: '#666666',
    textMutedRgb: '102 102 102',
    badge: 'NOTHING-LIGHT',
  },
  'cmf-orange': {
    id: 'cmf-orange',
    name: 'CMF Orange',
    label: 'CMF Orange',
    subtitle: 'Industrial Safety',
    colorMode: 'dark',
    canvas: '#08080a',
    canvasRgb: '8 8 10',
    cardBg: '#121214',
    cardBorder: 'rgba(255, 85, 0, 0.18)',
    accent: '#FF5500',
    accentRgb: '255 85 0',
    accentSubtle: 'rgba(255, 85, 0, 0.15)',
    textPrimary: '#f0f0f2',
    textPrimaryRgb: '240 240 242',
    textMuted: '#8e8e95',
    textMutedRgb: '142 142 149',
    badge: 'CMF-ORANGE',
  },
  'nothing-sage': {
    id: 'nothing-sage',
    name: 'Nothing Sage',
    label: 'Sage',
    subtitle: 'OS 5.0 Earth',
    colorMode: 'dark',
    canvas: '#0a0d0b',
    canvasRgb: '10 13 11',
    cardBg: '#121815',
    cardBorder: 'rgba(138, 155, 133, 0.20)',
    accent: '#8A9B85',
    accentRgb: '138 155 133',
    accentSubtle: 'rgba(138, 155, 133, 0.18)',
    textPrimary: '#e9ede9',
    textPrimaryRgb: '233 237 233',
    textMuted: '#8b948b',
    textMutedRgb: '139 148 139',
    badge: 'NOTHING-SAGE',
  },
  'nothing-cobalt': {
    id: 'nothing-cobalt',
    name: 'Nothing Cobalt',
    label: 'Cobalt',
    subtitle: 'Special Edition',
    colorMode: 'dark',
    canvas: '#05070c',
    canvasRgb: '5 7 12',
    cardBg: '#0b0f1a',
    cardBorder: 'rgba(43, 92, 255, 0.22)',
    accent: '#2B5CFF',
    accentRgb: '43 92 255',
    accentSubtle: 'rgba(43, 92, 255, 0.18)',
    textPrimary: '#e9ecf7',
    textPrimaryRgb: '233 236 247',
    textMuted: '#7f86a0',
    textMutedRgb: '127 134 160',
    badge: 'NOTHING-COBALT',
  },
}

export const THEME_LIST: ThemeDefinition[] = Object.values(THEMES)