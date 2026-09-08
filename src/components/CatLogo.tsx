import type { FC, SVGProps } from 'react'

type CatMascotState = 'idle' | 'focus' | 'break' | 'shortBreak' | 'longBreak' | 'complete' | 'running'

interface CatLogoProps extends SVGProps<SVGSVGElement> {
  className?: string
  size?: number
  state?: CatMascotState | string
  ascii?: boolean
}

export const CatLogo: FC<CatLogoProps> = ({
  className = 'w-6 h-6',
  size = 24,
  state = 'idle',
  ascii = false,
  ...props
}) => {
  const isBreak = state === 'break' || state === 'shortBreak' || state === 'longBreak'
  const isFocus = state === 'focus' || state === 'flow' || state === 'running'

  if (ascii) {
    return (
      <span
        aria-label="Pomau Cat"
        className={`inline-block select-none font-mono font-bold leading-tight tracking-tight ${className}`}
        style={{ fontSize: `${Math.max(10, size * 0.45)}px` }}
      >
        {isBreak ? '[:.-.:]' : isFocus ? '[:o.o:]' : '[:^.^:]'}
      </span>
    )
  }

  return (
    <div
      className="relative inline-flex items-center justify-center select-none"
      title="Pomau"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`transition-transform duration-200 ${className}`}
        {...props}
      >
        {/* Nothing Monoline Geometry: Outer Cat Contour (1.5px stroke) */}
        <path
          d="M4 8.5L3 4.5L7.5 6C9 5.3 10.5 5 12 5C13.5 5 15 5.3 16.5 6L21 4.5L20 8.5C21 10.5 21.5 12.5 21.5 15C21.5 19 18 21 12 21C6 21 2.5 19 2.5 15C2.5 12.5 3 10.5 4 8.5Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Eyes: Precision Nothing Dot-Matrix Circles or Sleeping Ticks */}
        {isBreak ? (
          <>
            <line x1="7.5" y1="13.5" x2="10.5" y2="13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="13.5" y1="13.5" x2="16.5" y2="13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx="8.5" cy="13" r="1.25" fill="currentColor" />
            <circle cx="15.5" cy="13" r="1.25" fill="currentColor" />
          </>
        )}

        {/* Nose / Technical Focal Point */}
        {isFocus ? (
          /* Signature Nothing Red Signal Dot during Focus / Running */
          <circle cx="12" cy="16.5" r="1.5" fill="#D71921" />
        ) : (
          <circle cx="12" cy="16.5" r="1" fill="currentColor" />
        )}
      </svg>
    </div>
  )
}
