import { memo, useEffect, useRef } from 'react'

interface InteractiveGridCanvasProps {
  className?: string
  gridSize?: number
  spotlightRadius?: number
  decayDurationMs?: number
}

export const InteractiveGridCanvas = memo(function InteractiveGridCanvas({
  className = '',
  gridSize = 14,
  spotlightRadius = 45,
  decayDurationMs = 500,
}: InteractiveGridCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    // Only enable on pointer-capable devices (mouse / trackpad)
    if (typeof window === 'undefined' || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      return
    }

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

    const resize = () => {
      const rect = parent.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      width = rect.width
      height = rect.height
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.resetTransform?.()
      ctx.scale(dpr, dpr)

      cols = Math.ceil(width / gridSize) + 1
      rows = Math.ceil(height / gridSize) + 1
      intensities = new Float32Array(cols * rows)
    }

    resize()

    const resizeObserver = new ResizeObserver(() => {
      resize()
    })
    resizeObserver.observe(parent)

    // Render loop: decays intensities and paints rounded LED matrix squares
    const render = (currentTime: number) => {
      if (lastTime === 0) lastTime = currentTime
      const delta = (currentTime - lastTime) / 1000
      lastTime = currentTime

      ctx.clearRect(0, 0, width, height)

      // Fetch dynamic foreground color from CSS custom property
      const computedStyle = getComputedStyle(canvas)
      const fgRgb = computedStyle.getPropertyValue('--c-fg').trim() || '232 232 232'

      let hasActiveDots = false
      const decayAmount = delta / (decayDurationMs / 1000)

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const idx = r * cols + c
          let intensity = intensities[idx]
          if (intensity <= 0) continue

          intensity -= decayAmount
          if (intensity <= 0) {
            intensities[idx] = 0
            continue
          }
          intensities[idx] = intensity
          hasActiveDots = true

          // Center coordinate of this grid point
          const cx = c * gridSize
          const cy = r * gridSize

          // Size scales from 1.5px up to 4.2px at max intensity
          const size = 1.5 + intensity * 2.7
          const half = size / 2
          const radius = Math.min(1.0, size * 0.28)
          const alpha = (intensity * 0.75).toFixed(3)

          ctx.fillStyle = `rgb(${fgRgb} / ${alpha})`
          ctx.beginPath()
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(cx - half, cy - half, size, size, radius)
          } else {
            ctx.rect(cx - half, cy - half, size, size)
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

    // Pointer move listener updates cells within spotlightRadius
    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return
      const rect = parent.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top

      if (mx < 0 || my < 0 || mx > width || my > height) return

      const minCol = Math.max(0, Math.floor((mx - spotlightRadius) / gridSize))
      const maxCol = Math.min(cols - 1, Math.ceil((mx + spotlightRadius) / gridSize))
      const minRow = Math.max(0, Math.floor((my - spotlightRadius) / gridSize))
      const maxRow = Math.min(rows - 1, Math.ceil((my + spotlightRadius) / gridSize))

      let stimulated = false

      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
          const cx = c * gridSize
          const cy = r * gridSize
          const dx = cx - mx
          const dy = cy - my
          const distSq = dx * dx + dy * dy
          const radiusSq = spotlightRadius * spotlightRadius

          if (distSq <= radiusSq) {
            const dist = Math.sqrt(distSq)
            const strength = Math.pow(1 - dist / spotlightRadius, 1.2)
            const idx = r * cols + c
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

    parent.addEventListener('pointermove', handlePointerMove, { passive: true })

    return () => {
      parent.removeEventListener('pointermove', handlePointerMove)
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
