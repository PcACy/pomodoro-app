import type { FC, SVGProps } from 'react'

type CatMascotState = 'idle' | 'focus' | 'break' | 'shortBreak' | 'longBreak' | 'complete' | 'running'

interface CatLogoProps extends SVGProps<SVGSVGElement> {
  className?: string
  size?: number
  state?: CatMascotState | string
}

export const CatLogo: FC<CatLogoProps> = ({
  className = 'w-6 h-6',
  size = 24,
  state = 'idle',
  ...props
}) => {
  const isBreak = state === 'break' || state === 'shortBreak' || state === 'longBreak'
  const isFocus = state === 'focus' || state === 'flow' || state === 'running'

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
        {/* Nothing Geometric Monoline Contour */}
        <path
          d="M4 8.5L5.5 4L9 7H15L18.5 4L20 8.5V16L16.5 19.5H7.5L4 16V8.5Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Forehead Dot-Matrix Triad */}
        <circle cx="10.5" cy="9" r="0.65" fill="currentColor" opacity={isFocus ? 0.85 : 0.4} />
        <circle cx="12" cy="9" r="0.65" fill="currentColor" opacity={isFocus ? 0.85 : 0.4} />
        <circle cx="13.5" cy="9" r="0.65" fill="currentColor" opacity={isFocus ? 0.85 : 0.4} />

        {/* Eyes: Precision Dot Matrix or Sleeping Ticks */}
        {isBreak ? (
          <>
            <line x1="6.75" y1="12.5" x2="9.25" y2="12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="14.75" y1="12.5" x2="17.25" y2="12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx="8" cy="12.5" r="1.25" fill="currentColor" />
            <circle cx="16" cy="12.5" r="1.25" fill="currentColor" />
          </>
        )}

        {/* Whisker Micro-Ticks / Hardware Grille */}
        <line x1="5.2" y1="14" x2="6.5" y2="14" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.35" />
        <line x1="17.5" y1="14" x2="18.8" y2="14" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.35" />

        {/* Signature Nothing Red Signal LED Dot (#D71921) */}
        <circle
          cx="12"
          cy="15.5"
          r="1.3"
          fill="#D71921"
          className={`transition-all duration-300 ${isFocus ? 'animate-pulse' : 'opacity-90'}`}
        />
      </svg>
    </div>
  )
}
