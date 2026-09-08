import { memo, useEffect, useRef } from 'react'

// Interactive Dot-Matrix background, exclusive to the HeroTimerCard.
// Square dots on a 14px grid. Dots near the cursor scale up and brighten
// (inner core in Nothing signal red). Strictly contained: the canvas lives
// inside the card's overflow-hidden box and never intercepts pointer events.
const GRID_PX = 14
const RADIUS_PX = 100
const INNER_RADIUS_PX = 32
const BASE_SIZE_PX = 1.5
const MAX_SIZE_PX = 3.5
const REST_ALPHA = 0.08
const LERP = 0.25
const STOP_EPSILON = 0.01

function parseRgbVar(name: string, fallback: [number, number, number]): [number, number, number] {
  try {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
    const parts = raw.split(/\s+/).map(Number)
    if (parts.length >= 3 && parts.every((n) => Number.isFinite(n))) {
      return [parts[0], parts[1], parts[2]]
    }
  } catch {
    /* ignore */
  }
  return fallback
}

export const HeroDotGridCanvas = memo(function HeroDotGridCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.parentElement
    if (!parent) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let cssW = 0
    let cssH = 0
    let cols = 0
    let rows = 0
    let energies = new Float32Array(0)
    let raf = 0
    let running = false
    let disposed = false
    const pointer = { x: -9999, y: -9999, inside: false }
    let fg: [number, number, number] = [255, 255, 255]
    let accent: [number, number, number] = [215, 25, 33]

    const resolveColors = () => {
      fg = parseRgbVar('--c-fg', [255, 255, 255])
      accent = parseRgbVar('--c-accent', [215, 25, 33])
    }
    resolveColors()

    const rebuild = () => {
      const rect = parent.getBoundingClientRect()
      cssW = Math.max(1, Math.floor(rect.width))
      cssH = Math.max(1, Math.floor(rect.height))
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.floor(cssW * dpr)
      canvas.height = Math.floor(cssH * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      cols = Math.max(1, Math.floor(cssW / GRID_PX))
      rows = Math.max(1, Math.floor(cssH / GRID_PX))
      energies = new Float32Array(cols * rows)
    }

    const dotPos = (i: number): [number, number] => {
      const c = i % cols
      const r = Math.floor(i / cols)
      // Center the grid in the available space
      const ox = (cssW - (cols - 1) * GRID_PX) / 2
      const oy = (cssH - (rows - 1) * GRID_PX) / 2
      return [ox + c * GRID_PX, oy + r * GRID_PX]
    }

    const drawDot = (x: number, y: number, size: number, color: [number, number, number], alpha: number) => {
      ctx.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${alpha.toFixed(3)})`
      ctx.fillRect(x - size / 2, y - size / 2, size, size)
    }

    const drawStatic = () => {
      ctx.clearRect(0, 0, cssW, cssH)
      for (let i = 0; i < energies.length; i++) {
        const [x, y] = dotPos(i)
        drawDot(x, y, BASE_SIZE_PX, fg, REST_ALPHA)
      }
    }

    const frame = () => {
      if (disposed) return
      ctx.clearRect(0, 0, cssW, cssH)
      let max = 0
      const r2 = RADIUS_PX * RADIUS_PX
      for (let i = 0; i < energies.length; i++) {
        const [x, y] = dotPos(i)
        let target = 0
        let accentMix = 0
        if (pointer.inside) {
          const dx = x - pointer.x
          const dy = y - pointer.y
          const d2 = dx * dx + dy * dy
          if (d2 < r2) {
            const dist = Math.sqrt(d2)
            const t = 1 - dist / RADIUS_PX
            target = t * t
            if (dist < INNER_RADIUS_PX) {
              accentMix = (1 - dist / INNER_RADIUS_PX) * target
            }
          }
        }
        const e = energies[i] + (target - energies[i]) * LERP
        energies[i] = e
        if (e > max) max = e
        if (e < 0.004 && !pointer.inside) {
          drawDot(x, y, BASE_SIZE_PX, fg, REST_ALPHA)
        } else {
          const size = BASE_SIZE_PX + (MAX_SIZE_PX - BASE_SIZE_PX) * e
          const alpha = REST_ALPHA + (0.93 - REST_ALPHA) * e
          drawDot(x, y, size, accentMix > 0.35 ? accent : fg, alpha)
        }
      }
      if (!pointer.inside && max < STOP_EPSILON) {
        running = false
        drawStatic()
        return
      }
      raf = requestAnimationFrame(frame)
    }

    const kick = () => {
      if (!running && !disposed) {
        running = true
        raf = requestAnimationFrame(frame)
      }
    }

    const toLocal = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect()
      pointer.x = clientX - rect.left
      pointer.y = clientY - rect.top
    }

    const onPointerMove = (e: PointerEvent) => {
      toLocal(e.clientX, e.clientY)
      if (!pointer.inside) pointer.inside = true
      kick()
    }
    const onPointerEnter = (e: PointerEvent) => {
      toLocal(e.clientX, e.clientY)
      pointer.inside = true
      kick()
    }
    const onPointerLeave = () => {
      pointer.inside = false
      kick()
    }

    rebuild()
    drawStatic()

    if (!reduceMotion) {
      parent.addEventListener('pointermove', onPointerMove)
      parent.addEventListener('pointerenter', onPointerEnter)
      parent.addEventListener('pointerleave', onPointerLeave)
    }

    const ro = new ResizeObserver(() => {
      rebuild()
      if (!running) drawStatic()
    })
    ro.observe(parent)

    // Re-resolve dot colors when dark/light mode toggles (data-mode flip)
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.attributeName === 'data-mode' || m.attributeName === 'data-theme') {
          resolveColors()
          if (!running) drawStatic()
          break
        }
      }
    })
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode', 'data-theme'] })

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && pointer.inside) kick()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      running = false
      ro.disconnect()
      mo.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      parent.removeEventListener('pointermove', onPointerMove)
      parent.removeEventListener('pointerenter', onPointerEnter)
      parent.removeEventListener('pointerleave', onPointerLeave)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full rounded-card"
      aria-hidden="true"
    />
  )
})
