import { memo } from 'react'
import type { ThemeId, ColorMode } from '../themes'
import type { PhaseId } from '../types'

interface ThemeBackgroundProps {
  themeId: ThemeId
  colorMode: ColorMode
  phase?: PhaseId
  isRunning?: boolean
}

export const ThemeBackground = memo(function ThemeBackground({
  themeId,
  colorMode,
}: ThemeBackgroundProps) {
  const isDark = colorMode === 'dark'

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden select-none"
    >
      {/* 1. GRUVBOX: Analog Paper-Grain & Warm Canvas Texture */}
      {themeId === 'gruvbox' && (
        <>
          {/* Subtle Warm Canvas Vignette */}
          <div
            className="absolute inset-0 transition-opacity duration-700"
            style={{
              background: isDark
                ? 'radial-gradient(ellipse 90% 70% at 50% 35%, rgba(60, 56, 54, 0.45) 0%, rgba(40, 40, 40, 1) 100%)'
                : 'radial-gradient(ellipse 90% 70% at 50% 35%, rgba(242, 229, 188, 0.55) 0%, rgba(251, 241, 199, 1) 100%)',
            }}
          />

          {/* Inline SVG Noise / Paper-Fiber Grain Texture */}
          <div
            className="absolute inset-0 opacity-[0.035] mix-blend-overlay"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='paperGrain'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23paperGrain)'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'repeat',
            }}
          />
        </>
      )}

      {/* 2. iOS 26: Studio Silver Slate Canvas */}
      {themeId === 'ios-26' && (
        <div
          className="absolute inset-0 transition-opacity duration-700"
          style={{
            background: isDark
              ? `radial-gradient(circle at 50% 40%, rgba(255, 107, 0, 0.06) 0%, transparent 60%),
                 radial-gradient(120% 120% at 50% 0%, #1c1d21 0%, #121316 50%, #0a0a0c 100%)`
              : `radial-gradient(circle at 50% 40%, rgba(255, 107, 0, 0.04) 0%, transparent 60%),
                 radial-gradient(120% 120% at 50% 0%, #ffffff 0%, #f4f5f7 50%, #e5e8eb 100%)`,
          }}
        />
      )}

      {/* 3. MATERIAL YOU (M3): Damped Spotlight on Deep Tonal Matte */}
      {themeId === 'material-you' && (
        <div
          className="absolute inset-0 transition-opacity duration-700"
          style={{
            background: isDark
              ? 'radial-gradient(circle at 50% 45%, rgba(43, 41, 48, 0.08) 0%, rgba(18, 16, 22, 1) 45%)'
              : 'radial-gradient(circle at 50% 45%, rgba(236, 230, 238, 0.3) 0%, rgba(254, 247, 255, 1) 55%)',
          }}
        />
      )}
    </div>
  )
})
