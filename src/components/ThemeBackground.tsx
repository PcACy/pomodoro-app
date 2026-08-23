import { memo } from 'react'
import type { ThemeId, ColorMode } from '../themes'
import type { PhaseId } from '../types'

interface ThemeBackgroundProps {
  themeId: ThemeId
  colorMode: ColorMode
  phase: PhaseId
  isRunning: boolean
}

export const ThemeBackground = memo(function ThemeBackground({
  themeId,
  colorMode,
  phase,
  isRunning,
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

      {/* 2. iOS 26: Liquid Glass Ambient Aurora-Blobs & Vignette */}
      {themeId === 'ios-26' && (
        <>
          {/* Subtle Viewport Edge Vignette */}
          <div
            className="absolute inset-0 transition-opacity duration-700"
            style={{
              background: isDark
                ? 'radial-gradient(ellipse 110% 90% at 50% 30%, rgba(20, 24, 38, 0.7) 0%, rgba(8, 9, 14, 1) 100%)'
                : 'radial-gradient(ellipse 110% 90% at 50% 30%, rgba(255, 255, 255, 0.95) 0%, rgba(242, 242, 247, 1) 100%)',
            }}
          />

          {/* Floating Aurora Orb 1 (Top Left / Primary Accent) */}
          <div
            className="absolute -top-24 -left-20 h-[500px] w-[500px] rounded-full blur-[120px] opacity-20 transition-all duration-1000 animate-aurora-1"
            style={{
              backgroundColor: 'rgb(var(--c-accent))',
            }}
          />

          {/* Floating Aurora Orb 2 (Middle Right / Secondary Phase Color) */}
          <div
            className="absolute top-1/4 -right-24 h-[520px] w-[520px] rounded-full blur-[130px] opacity-15 transition-all duration-1000 animate-aurora-2"
            style={{
              backgroundColor: phase === 'focus' ? 'rgb(var(--c-break))' : 'rgb(var(--c-long))',
            }}
          />

          {/* Floating Aurora Orb 3 (Bottom Center / Breathing Pulse) */}
          <div
            className={`absolute -bottom-36 left-1/4 h-[460px] w-[460px] rounded-full blur-[140px] transition-all duration-1000 animate-aurora-3 ${
              isRunning ? 'opacity-25' : 'opacity-10'
            }`}
            style={{
              backgroundColor: 'rgb(var(--c-accent))',
            }}
          />
        </>
      )}

      {/* 3. MATERIAL YOU (M3): Clean Tonal Matte & Spotlight Depth */}
      {themeId === 'material-you' && (
        <div
          className="absolute inset-0 transition-opacity duration-700"
          style={{
            background: isDark
              ? 'radial-gradient(circle at 50% 45%, rgba(43, 41, 48, 0.65) 0%, rgba(20, 18, 24, 1) 75%)'
              : 'radial-gradient(circle at 50% 45%, rgba(236, 230, 238, 0.75) 0%, rgba(253, 248, 253, 1) 75%)',
          }}
        />
      )}
    </div>
  )
})
