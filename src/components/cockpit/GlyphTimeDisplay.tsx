import { memo } from 'react'

interface GlyphTimeDisplayProps {
  time: string // e.g. "25:00"
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
const SLOT_COLS = 5 // every character (digits AND colon) owns a fixed 5-cell slot
const SLOT_WIDTH = SLOT_COLS * STEP - DOT_GAP
const DIGIT_GAP = 2 * STEP // 18px between character slots

export const GlyphTimeDisplay = memo(function GlyphTimeDisplay({
  time,
  className = '',
}: GlyphTimeDisplayProps) {
  // Parse time characters (e.g. ['2', '5', ':', '0', '0'])
  const chars = time.split('')

  // Fixed slot per character: digit matrices fill the slot, the narrow colon
  // matrix is centered inside it — total width and every glyph position stay
  // absolutely static no matter which digits are shown.
  const charPositions: { char: string; x: number; dx: number; matrix: number[][] }[] = []

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i]
    const matrix = GLYPH_5X7[char] || GLYPH_5X7['0']
    const glyphWidth = matrix[0].length * STEP - DOT_GAP
    const x = i * (SLOT_WIDTH + DIGIT_GAP)
    const dx = (SLOT_WIDTH - glyphWidth) / 2
    charPositions.push({ char, x, dx, matrix })
  }

  const totalWidth = chars.length * SLOT_WIDTH + (chars.length - 1) * DIGIT_GAP
  const totalHeight = 7 * STEP - DOT_GAP

  return (
    <div className={`relative flex items-center justify-center tabular-nums select-none ${className || 'w-full max-w-[340px] sm:max-w-[400px] lg:max-w-[430px] my-auto py-2'}`}>
      <span className="sr-only">{time}</span>

      <svg
        viewBox={`0 0 ${totalWidth} ${totalHeight}`}
        className="w-full h-auto shrink-0 overflow-visible"
        aria-hidden="true"
      >
        {/* Lit Matrix Digits */}
        {charPositions.map(({ x, dx, matrix }, charIdx) => (
          <g key={charIdx} transform={`translate(${x + dx}, 0)`}>
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

