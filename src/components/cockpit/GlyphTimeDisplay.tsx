import { memo } from 'react'

interface GlyphTimeDisplayProps {
  time: string // e.g. "25:00"
  isRunning?: boolean
  className?: string
}

// 5x7 Dot-Matrix patterns for Nothing OS Glyph Mode
const GLYPH_5X7: Record<string, number[][]> = {
  '0': [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
  '1': [
    [0, 0, 1, 0, 0],
    [0, 1, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 1, 1, 1, 0],
  ],
  '2': [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [0, 0, 0, 0, 1],
    [0, 0, 1, 1, 0],
    [0, 1, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 1, 1, 1, 1],
  ],
  '3': [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [0, 0, 0, 0, 1],
    [0, 0, 1, 1, 0],
    [0, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
  '4': [
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 1],
    [0, 0, 0, 0, 1],
    [0, 0, 0, 0, 1],
    [0, 0, 0, 0, 1],
  ],
  '5': [
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0],
    [1, 1, 1, 1, 0],
    [0, 0, 0, 0, 1],
    [0, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
  '6': [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 0],
    [1, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
  '7': [
    [1, 1, 1, 1, 1],
    [0, 0, 0, 0, 1],
    [0, 0, 0, 1, 0],
    [0, 0, 1, 0, 0],
    [0, 1, 0, 0, 0],
    [0, 1, 0, 0, 0],
    [0, 1, 0, 0, 0],
  ],
  '8': [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
  '9': [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 1],
    [0, 0, 0, 0, 1],
    [0, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
  ':': [
    [0],
    [0],
    [1],
    [0],
    [1],
    [0],
    [0],
  ],
}

const DOT_SIZE = 5.5
const DOT_GAP = 3.5
const STEP = DOT_SIZE + DOT_GAP // 9px per grid unit
const DIGIT_GAP = 2 * STEP // 18px between characters
const RED_DOT_GAP = 2.5 * STEP // spacing between red dot and first digit

export const GlyphTimeDisplay = memo(function GlyphTimeDisplay({
  time,
  isRunning = false,
  className = '',
}: GlyphTimeDisplayProps) {
  // Parse time characters (e.g. ['2', '5', ':', '0', '0'])
  const chars = time.split('')

  // Compute total width
  // Red dot: 1 col (DOT_SIZE) + RED_DOT_GAP
  let currentX = DOT_SIZE + RED_DOT_GAP
  const charPositions: { char: string; x: number; matrix: number[][] }[] = []

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i]
    const matrix = GLYPH_5X7[char] || GLYPH_5X7['0']
    const charWidth = matrix[0].length * STEP - DOT_GAP
    charPositions.push({ char, x: currentX, matrix })
    currentX += charWidth + DIGIT_GAP
  }

  const totalWidth = currentX - DIGIT_GAP + 2
  const totalHeight = 7 * STEP - DOT_GAP

  return (
    <div className={`relative flex items-center select-none ${className}`}>
      <span className="sr-only">{time}</span>

      <svg
        viewBox={`0 0 ${totalWidth} ${totalHeight}`}
        className="w-full h-auto max-h-[85px] max-w-[340px] sm:max-w-[400px] lg:max-w-[430px] overflow-visible"
        aria-hidden="true"
      >
        {/* Red Status Dot on the left (Row 3, vertically centered) */}
        <rect
          x="0"
          y={3 * STEP}
          width={DOT_SIZE}
          height={DOT_SIZE}
          rx="1.2"
          fill="#d71921"
          className={isRunning ? 'animate-pulse' : ''}
        />

        {/* Lit Matrix Digits */}
        {charPositions.map(({ x, matrix }, charIdx) => (
          <g key={charIdx} transform={`translate(${x}, 0)`}>
            {matrix.map((row, rowIdx) =>
              row.map((val, colIdx) => {
                if (val !== 1) return null
                return (
                  <rect
                    key={`${rowIdx}-${colIdx}`}
                    x={colIdx * STEP}
                    y={rowIdx * STEP}
                    width={DOT_SIZE}
                    height={DOT_SIZE}
                    rx="1.2"
                    className="fill-current text-fg"
                  />
                )
              }),
            )}
          </g>
        ))}
      </svg>
    </div>
  )
})

