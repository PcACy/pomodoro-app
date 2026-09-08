import { forwardRef, memo, useEffect, useImperativeHandle, useRef } from 'react'

export interface InteractiveGridCanvasHandle {
  addPoint: (x: number, y: number) => void
}

interface InteractiveGridCanvasProps {
  className?: string
  gridSize?: number
  spotlightRadius?: number
  decayDurationMs?: number
}

function parseRgb(colorStr: string): [number, number, number] {
  const parts = colorStr.trim().split(/[\s,]+/).map(Number)
  if (parts.length >= 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return [parts[0], parts[1], parts[2]]
  }
  return [232, 232, 232]
}

export const InteractiveGridCanvas = memo(
  forwardRef<InteractiveGridCanvasHandle, InteractiveGridCanvasProps>(function InteractiveGridCanvas(
    {
      className = '',
      gridSize = 14,
      spotlightRadius = 55,
      decayDurationMs = 600,
    },
    ref
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const addPointRef = useRef<(x: number, y: number) => void>(() => {})

    useImperativeHandle(ref, () => ({
      addPoint: (x: number, y: number) => {
        addPointRef.current(x, y)
      },
    }))

    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return

      const parent = canvas.parentElement
      if (!parent) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      let width = 0
      let height = 0
      let cols = 0
      let rows = 0
      let intensities = new Float32Array(0)
      let animationFrameId: number | null = null
      let lastTime = 0
      let isSleeping = true

      // The CSS radial-gradient(currentColor 1px, transparent 1px) with 14px tile
      // centers each dot at (7px, 7px), (21px, 7px), etc.
      const offsetX = gridSize / 2
      const offsetY = gridSize / 2

      const resize = () => {
        const rect = parent.getBoundingClientRect()
        const dpr = window.devicePixelRatio || 1
        width = rect.width
        height = rect.height
        if (width === 0 || height === 0) return

        canvas.width = Math.round(width * dpr)
        canvas.height = Math.round(height * dpr)
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

        cols = Math.ceil(width / gridSize) + 1
        rows = Math.ceil(height / gridSize) + 1
        intensities = new Float32Array(cols * rows)
      }

      resize()

      const resizeObserver = new ResizeObserver(() => {
        resize()
      })
      resizeObserver.observe(parent)

      // Render loop: decays intensities and paints rounded LED matrix dots
      const render = (currentTime: number) => {
        if (lastTime === 0) lastTime = currentTime
        const delta = Math.min((currentTime - lastTime) / 1000, 0.1)
        lastTime = currentTime

        ctx.clearRect(0, 0, width, height)

        // Fetch dynamic foreground color from CSS custom property and parse into numbers
        const computedStyle = getComputedStyle(canvas)
        const fgRaw = computedStyle.getPropertyValue('--c-fg') || '232 232 232'
        const [r, g, b] = parseRgb(fgRaw)

        let hasActiveDots = false
        const decayAmount = delta / (decayDurationMs / 1000)

        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            const idx = row * cols + col
            let intensity = intensities[idx]
            if (intensity <= 0) continue

            intensity -= decayAmount
            if (intensity <= 0) {
              intensities[idx] = 0
              continue
            }
            intensities[idx] = intensity
            hasActiveDots = true

            // Exact center coordinate aligned with CSS dot-matrix background
            const cx = col * gridSize + offsetX
            const cy = row * gridSize + offsetY

            // Scale dot size from 1.5px up to 3.2px at full intensity
            const size = 1.5 + intensity * 1.7
            const half = size / 2
            const radius = Math.min(0.8, size * 0.25)
            const alpha = Math.min(0.85, intensity * 0.75).toFixed(3)

            // Standard comma-separated rgba is universally supported in all Canvas 2D engines
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`
            ctx.beginPath()
            if (typeof ctx.roundRect === 'function') {
              ctx.roundRect(cx - half, cy - half, size, size, radius)
            } else {
              ctx.arc(cx, cy, half, 0, Math.PI * 2)
            }
            ctx.fill()
          }
        }

        if (hasActiveDots) {
          animationFrameId = requestAnimationFrame(render)
        } else {
          isSleeping = true
          animationFrameId = null
          lastTime = 0
          ctx.clearRect(0, 0, width, height)
        }
      }

      const wakeUp = () => {
        if (isSleeping) {
          isSleeping = false
          lastTime = 0
          animationFrameId = requestAnimationFrame(render)
        }
      }

      // Stimulate grid points within radius of (mx, my)
      const stimulate = (mx: number, my: number) => {
        if (width === 0 || height === 0 || cols === 0 || rows === 0) return
        if (mx < -spotlightRadius || my < -spotlightRadius || mx > width + spotlightRadius || my > height + spotlightRadius) {
          return
        }

        const minCol = Math.max(0, Math.floor((mx - spotlightRadius - offsetX) / gridSize))
        const maxCol = Math.min(cols - 1, Math.ceil((mx + spotlightRadius - offsetX) / gridSize))
        const minRow = Math.max(0, Math.floor((my - spotlightRadius - offsetY) / gridSize))
        const maxRow = Math.min(rows - 1, Math.ceil((my + spotlightRadius - offsetY) / gridSize))

        const radiusSq = spotlightRadius * spotlightRadius
        let stimulated = false

        for (let row = minRow; row <= maxRow; row++) {
          for (let col = minCol; col <= maxCol; col++) {
            const cx = col * gridSize + offsetX
            const cy = row * gridSize + offsetY
            const dx = cx - mx
            const dy = cy - my
            const distSq = dx * dx + dy * dy

            if (distSq <= radiusSq) {
              const dist = Math.sqrt(distSq)
              const strength = Math.pow(1 - dist / spotlightRadius, 1.1)
              const idx = row * cols + col
              if (strength > intensities[idx]) {
                intensities[idx] = strength
                stimulated = true
              }
            }
          }
        }

        if (stimulated) {
          wakeUp()
        }
      }

      addPointRef.current = stimulate

      // Redundant native event listeners on parent as fallback
      const handleNativeMove = (e: MouseEvent | PointerEvent) => {
        const rect = parent.getBoundingClientRect()
        stimulate(e.clientX - rect.left, e.clientY - rect.top)
      }

      parent.addEventListener('pointermove', handleNativeMove, { passive: true })
      parent.addEventListener('mousemove', handleNativeMove, { passive: true })

      return () => {
        parent.removeEventListener('pointermove', handleNativeMove)
        parent.removeEventListener('mousemove', handleNativeMove)
        resizeObserver.disconnect()
        if (animationFrameId !== null) {
          cancelAnimationFrame(animationFrameId)
        }
      }
    }, [gridSize, spotlightRadius, decayDurationMs])

    return (
      <canvas
        ref={canvasRef}
        className={`pointer-events-none absolute inset-0 z-[1] w-full h-full select-none ${className}`}
        aria-hidden="true"
      />
    )
  })
)
