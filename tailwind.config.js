/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      borderRadius: {
        card: 'var(--radius-card)',
        btn: 'var(--radius-btn)',
        sm: 'var(--radius-sm)',
        badge: 'var(--badge-radius)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Geist', 'Outfit', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'Geist', 'system-ui', 'sans-serif'],
        sans: ['Geist', 'Outfit', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'Geist Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        canvas: 'rgb(var(--c-canvas) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        raised: 'rgb(var(--c-raised) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',
        fg: 'rgb(var(--c-fg) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
        accent: 'rgb(var(--c-accent) / <alpha-value>)',
        'accent-strong': 'rgb(var(--c-accent-strong) / <alpha-value>)',
        'on-accent': 'rgb(var(--c-on-accent) / <alpha-value>)',
        break: 'rgb(var(--c-break) / <alpha-value>)',
        long: 'rgb(var(--c-long) / <alpha-value>)',
        track: 'rgb(var(--c-track) / <alpha-value>)',
        streak: 'var(--color-streak)',
        success: 'var(--color-success)',
        'tag-bg': 'var(--color-tag-bg)',
        'tag-text': 'var(--color-tag-text)',
        'tag-border': 'var(--color-tag-border)',
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
        'fade-in': 'fade-in 0.25s ease-out',
        shake: 'shake 0.35s ease-in-out',
      },
    },
  },
  plugins: [],
}