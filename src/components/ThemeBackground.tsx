import { memo } from 'react'
import type { ThemeId, ColorMode } from '../themes'
import type { PhaseId } from '../types'

interface ThemeBackgroundProps {
  themeId?: ThemeId
  colorMode: ColorMode
  phase?: PhaseId
  isRunning?: boolean
}

export const ThemeBackground = memo(function ThemeBackground({
  colorMode,
}: ThemeBackgroundProps) {
  const isDark = colorMode === 'dark'

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden select-none"
    >
      {/* Gruvbox: Analog Paper-Grain & Warm Canvas Texture */}
      <div
        className="absolute inset-0 transition-opacity duration-700"
        style={{
          background: isDark
            ? 'radial-gradient(ellipse 90% 70% at 50% 35%, rgba(60, 56, 54, 0.45) 0%, rgba(40, 40, 40, 1) 100%)'
            : 'radial-gradient(ellipse 90% 70% at 50% 35%, rgba(242, 229, 188, 0.55) 0%, rgba(251, 241, 199, 1) 100%)',
        }}
      />

      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='paperGrain'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23paperGrain)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      />
    </div>
  )
})
