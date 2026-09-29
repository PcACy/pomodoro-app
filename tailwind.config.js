/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['selector', '[data-mode="dark"]'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      borderRadius: {
        card: 'var(--r-card)',
        panel: 'var(--r-panel)',
        control: 'var(--r-control)',
        pill: 'var(--r-pill)',
        badge: 'var(--r-pill)',
        sm: 'var(--r-sm)',
        xs: 'var(--r-xs)',
        // Retained for the few legacy call sites; prefer `control` / `panel`.
        btn: 'var(--r-pill)',
      },
      fontFamily: {
        body: ['Space Grotesk', 'system-ui', 'sans-serif'],
        sans: ['Space Grotesk', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['Space Mono', 'ui-monospace', 'SF Mono', 'Menlo', 'monospace'],
        doto: ['Doto', 'monospace'],
      },
      spacing: {
        18: '4.5rem',
        22: '5.5rem',
      },
      colors: {
        canvas: 'rgb(var(--c-canvas) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        raised: 'rgb(var(--c-raised) / <alpha-value>)',
        track: 'rgb(var(--c-track) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',
        fg: 'rgb(var(--c-fg) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
        'text-muted': 'rgb(var(--c-muted) / <alpha-value>)',
        'text-primary': 'rgb(var(--c-fg) / <alpha-value>)',
        'text-secondary': 'rgb(var(--c-muted) / <alpha-value>)',
        'text-display': 'rgb(var(--c-fg) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        'accent-strong': 'rgb(var(--accent-strong) / <alpha-value>)',
        'accent-subtle': 'var(--accent-subtle)',
        'border-visible': 'rgb(var(--c-line) / <alpha-value>)',
        'on-accent': 'rgb(var(--c-on-accent) / <alpha-value>)',
        break: 'rgb(var(--c-break) / <alpha-value>)',
        long: 'rgb(var(--c-long) / <alpha-value>)',
        'heatmap-l0': 'var(--heatmap-l0)',
        'heatmap-l0-border': 'var(--heatmap-l0-border)',
      },
      opacity: {
        glow: 'var(--glow-opacity)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-4px)' },
          '40%, 80%': { transform: 'translateX(4px)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s cubic-bezier(0.32, 0.72, 0, 1)',
        shake: 'shake 0.35s ease-in-out',
      },
    },
  },
  plugins: [],
}
