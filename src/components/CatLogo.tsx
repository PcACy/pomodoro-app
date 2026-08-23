import type { FC, SVGProps } from 'react'

export type CatMascotState = 'idle' | 'focus' | 'break' | 'shortBreak' | 'longBreak' | 'complete' | 'running'

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
  const isComplete = state === 'complete'

  if (ascii) {
    return (
      <span
        aria-label="Pomau Cat"
        className={`inline-block select-none font-mono font-bold leading-tight tracking-tighter ${className}`}
        style={{ fontSize: `${Math.max(10, size * 0.45)}px` }}
      >
        {isBreak ? '( -.-) zZ' : isComplete ? '( ^.^)/' : isFocus ? '( o.o)' : '( =^.^=)'}
      </span>
    )
  }

  return (
    <div className={`relative inline-flex items-center justify-center ${isComplete ? 'animate-mascot-hop' : ''}`}>
      {/* Animated zZz particles for Break/Sleeping mode */}
      {isBreak && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-2.5 -top-2.5 flex flex-col font-mono text-[9px] font-bold text-break animate-zzz select-none opacity-80"
        >
          z<span className="ml-1 text-[11px]">Z</span><span className="ml-2 text-[13px]">z</span>
        </span>
      )}

      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`transition-transform duration-300 ${isFocus ? 'scale-105' : ''} ${className}`}
        {...props}
      >
        {/* Cat head & perked / resting ears */}
        <path
          d={
            isBreak
              ? 'M3.5 9.5L2 5.5L7.5 6.5C9 5.8 10.5 5.5 12 5.5C13.5 5.5 15 5.8 16.5 6.5L22 5.5L20.5 9.5C21.5 11.5 22 13.5 22 15.5C22 19.5 18 21.5 12 21.5C6 21.5 2 19.5 2 15.5C2 13.5 2.5 11.5 3.5 9.5Z'
              : 'M3.5 8.5L2 3.5L7.5 5C9 4.3 10.5 4 12 4C13.5 4 15 4.3 16.5 5L22 3.5L20.5 8.5C21.5 10.5 22 12.5 22 15C22 19 18 21.5 12 21.5C6 21.5 2 19 2 15C2 12.5 2.5 10.5 3.5 8.5Z'
          }
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Ear contours */}
        <path
          d={isBreak ? 'M4.8 7.8L6 9.5M19.2 7.8L18 9.5' : 'M4.8 6.8L6 8.5M19.2 6.8L18 8.5'}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Eyes: Curved sleeping arcs during break, joyful triangles on complete, alert almonds on focus/idle */}
        {isBreak ? (
          /* Sleeping closed happy arcs */
          <>
            <path d="M7 13.5C8 15 9.5 15 10.5 13.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            <path d="M13.5 13.5C14.5 15 16 15 17 13.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </>
        ) : isComplete ? (
          /* Joyful starry complete eyes */
          <>
            <path d="M7 14.5L8.5 12.5L10 14.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M14 14.5L15.5 12.5L17 14.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </>
        ) : isFocus ? (
          /* Alert focused eyes with sharp pupils */
          <>
            <path
              d="M7 13.5C8 12 9.5 12.3 10 13.8C9.2 14.5 7.8 14.5 7 13.5ZM17 13.5C16 12 14.5 12.3 14 13.8C14.8 14.5 16.2 14.5 17 13.5Z"
              fill="currentColor"
            />
            {/* Sparkle glint in focus eyes */}
            <circle cx="8.8" cy="13.2" r="0.65" fill="var(--c-canvas, #ffffff)" />
            <circle cx="15.2" cy="13.2" r="0.65" fill="var(--c-canvas, #ffffff)" />
          </>
        ) : (
          /* Default Siam Almond Eyes */
          <path
            d="M7 13.5C8 12.5 9.5 12.8 10 13.8C9.2 14.3 7.8 14.3 7 13.5ZM17 13.5C16 12.5 14.5 12.8 14 13.8C14.8 14.3 16.2 14.3 17 13.5Z"
            fill="currentColor"
          />
        )}

        {/* Nose / Muzzle */}
        <path
          d="M11.2 16.8L12 17.5L12.8 16.8"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Whiskers */}
        {isFocus && (
          <>
            <path d="M4 14.5L1.5 14M4 16.5L1.5 17" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
            <path d="M20 14.5L22.5 14M20 16.5L22.5 17" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
          </>
        )}
      </svg>
    </div>
  )
}

