import { memo, useEffect, useRef } from 'react'

// Interactive Dot-Matrix background, exclusive to the HeroTimerCard.
// Square dots on a 14px grid. Dots near the cursor scale up and brighten
// (inner core in Nothing signal red). Strictly contained: the canvas lives
// inside the card's overflow-hidden box and never intercepts pointer events.
const GRID_PX = 14
const RADIUS_PX = 80
const INNER_RADIUS_PX = 28
const BASE_SIZE_PX = 1.75
const MAX_SIZE_PX = 3.75
const REST_ALPHA = 0.08
// Asymmetric response: fast attack (dots ignite instantly), slow release
// (dots decay gradually) — this creates the trailing phosphor tail.
const ATTACK = 0.5
const DECAY = 0.93
const STOP_EPSILON = 0.01
// Below this energy a dot is indistinguishable from its rest state, so the
// cached rest layer already paints it and the frame loop can skip it.
const REST_EPSILON = 0.004

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

const rgb = (c: [number, number, number]): string => `rgb(${c[0]},${c[1]},${c[2]})`

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
    let dpr = 1
    let cols = 0
    let rows = 0
    // Dot centres are fixed by the grid, so they are computed once per resize
    // instead of per frame per dot. The previous hot loop called a `dotPos`
    // helper that allocated a fresh `[x, y]` tuple for all ~2400 dots on every
    // animation frame — a quarter of a million throwaway arrays per second.
    let dotX = new Float32Array(0)
    let dotY = new Float32Array(0)
    let energies = new Float32Array(0)
    // The resting grid never changes except on resize or theme flip, so it is
    // pre-rendered into an offscreen canvas. Each frame then costs one blit
    // plus the handful of dots that are actually lit, instead of one fillRect
    // and one rgba() string per grid cell.
    const restLayer = document.createElement('canvas')
    const restCtx = restLayer.getContext('2d')
    let raf = 0
    let running = false
    let disposed = false
    const pointer = { x: -9999, y: -9999, inside: false }
    let fg: [number, number, number] = [255, 255, 255]
    let accent: [number, number, number] = [215, 25, 33]
    let fgFill = rgb(fg)
    let accentFill = rgb(accent)

    const resolveColors = () => {
      fg = parseRgbVar('--c-fg', [255, 255, 255])
      accent = parseRgbVar('--c-accent', [215, 25, 33])
      fgFill = rgb(fg)
      accentFill = rgb(accent)
    }
    resolveColors()

    /** Repaints the cached rest grid. Device-resolution so the blit is 1:1. */
    const renderRestLayer = () => {
      if (!restCtx) return
      restLayer.width = canvas.width
      restLayer.height = canvas.height
      restCtx.clearRect(0, 0, restLayer.width, restLayer.height)
      restCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
      restCtx.fillStyle = fgFill
      restCtx.globalAlpha = REST_ALPHA
      const half = BASE_SIZE_PX / 2
      for (let i = 0; i < energies.length; i++) {
        restCtx.fillRect(dotX[i] - half, dotY[i] - half, BASE_SIZE_PX, BASE_SIZE_PX)
      }
      restCtx.globalAlpha = 1
    }

    /** Blits the cached rest grid and clears whatever the last frame lit. */
    const drawStatic = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      if (restCtx) ctx.drawImage(restLayer, 0, 0)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.globalAlpha = 1
    }

    const rebuild = () => {
      const rect = parent.getBoundingClientRect()
      cssW = Math.max(1, Math.floor(rect.width))
      cssH = Math.max(1, Math.floor(rect.height))
      dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.floor(cssW * dpr)
      canvas.height = Math.floor(cssH * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      cols = Math.max(1, Math.floor(cssW / GRID_PX))
      rows = Math.max(1, Math.floor(cssH / GRID_PX))
      const count = cols * rows
      energies = new Float32Array(count)
      dotX = new Float32Array(count)
      dotY = new Float32Array(count)
      // Center the grid in the available space
      const ox = (cssW - (cols - 1) * GRID_PX) / 2
      const oy = (cssH - (rows - 1) * GRID_PX) / 2
      for (let i = 0; i < count; i++) {
        dotX[i] = ox + (i % cols) * GRID_PX
        dotY[i] = oy + ((i / cols) | 0) * GRID_PX
      }
      renderRestLayer()
    }

    const frame = () => {
      if (disposed) return
      // Rest grid first: it repaints the pixels the previous frame lit, so only
      // this frame's lit dots need drawing on top.
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      if (restCtx) ctx.drawImage(restLayer, 0, 0)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      let max = 0
      let fill: string | null = null
      const r2 = RADIUS_PX * RADIUS_PX
      for (let i = 0; i < energies.length; i++) {
        const x = dotX[i]
        const y = dotY[i]
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
        const e = energies[i]
        // Fast attack toward the cursor-driven target, slow exponential
        // decay afterward — the dot keeps glowing briefly after the cursor
        // moved on, producing the fading trail ("tail").
        const next = target > e ? e + (target - e) * ATTACK : e * DECAY
        energies[i] = next
        if (next > max) max = next
        // At rest the cached layer already shows the right pixel.
        if (next < REST_EPSILON) continue

        const size = BASE_SIZE_PX + (MAX_SIZE_PX - BASE_SIZE_PX) * next
        // Color gradient: fresh dots near the cursor glow in signal red,
        // the decaying tail fades through dim gray back to rest.
        // accentMix is distance-driven, so only freshly activated dots turn
        // red while the tail (cursor moved away) cools down to gray.
        const isFresh = accentMix > 0.35 && next > 0.4
        // The lit dot composites over the rest dot's REST_ALPHA instead of over
        // a cleared canvas, so undo that base to land on the intended alpha:
        //   a + base*(1 - a) = target  =>  a = (target - base)/(1 - base)
        const alpha = REST_ALPHA + (0.93 - REST_ALPHA) * next
        const wantFill = isFresh ? accentFill : fgFill
        if (wantFill !== fill) {
          ctx.fillStyle = wantFill
          fill = wantFill
        }
        ctx.globalAlpha = (alpha - REST_ALPHA) / (1 - REST_ALPHA)
        ctx.fillRect(x - size / 2, y - size / 2, size, size)
      }
      ctx.globalAlpha = 1

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
          renderRestLayer()
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
