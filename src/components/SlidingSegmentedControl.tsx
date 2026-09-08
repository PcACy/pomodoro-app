import {
  type ReactNode,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { playMicroClick } from '../lib/sound'

export interface SlidingSegmentOption<T extends string> {
  value: T
  label: ReactNode
  icon?: ReactNode
}

export interface SlidingSegmentedControlProps<T extends string> {
  options: readonly SlidingSegmentOption<T>[] | SlidingSegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  size?: 'sm' | 'md'
  className?: string
  ariaLabel?: string
  fullWidth?: boolean
}

export function SlidingSegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'sm',
  className = '',
  ariaLabel,
  fullWidth = false,
}: SlidingSegmentedControlProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Map<T, HTMLButtonElement>>(new Map())
  const [indicator, setIndicator] = useState<{
    left: number
    top: number
    width: number
    height: number
    ready: boolean
  }>({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    ready: false,
  })

  const updateIndicator = useCallback(() => {
    const el = itemRefs.current.get(value)
    const container = containerRef.current
    if (el && container) {
      setIndicator({
        left: el.offsetLeft,
        top: el.offsetTop,
        width: el.offsetWidth,
        height: el.offsetHeight,
        ready: true,
      })
    }
  }, [value])

  useLayoutEffect(() => {
    updateIndicator()
    if (!containerRef.current) return
    const ro = new ResizeObserver(() => {
      updateIndicator()
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [updateIndicator])

  const isSmall = size === 'sm'
  const containerPadding = isSmall ? 'p-0.5' : 'p-1'
  const buttonPadding = isSmall
    ? 'px-2.5 py-0.5 text-[10px]'
    : 'px-4 py-1.5 text-xs'

  return (
    <div
      ref={containerRef}
      role="radiogroup"
      aria-label={ariaLabel}
      className={`relative inline-flex items-center rounded-full border border-line bg-canvas font-mono select-none ${containerPadding} ${
        fullWidth ? 'w-full sm:w-auto flex' : ''
      } ${className}`}
    >
      {/* Sliding Mechanical Pill Thumb */}
      <div
        className={`absolute top-0 left-0 rounded-full bg-fg pointer-events-none ${
          indicator.ready
            ? 'transition-all duration-200 ease-out motion-reduce:transition-none'
            : 'opacity-0'
        }`}
        style={{
          transform: `translate3d(${indicator.left}px, ${indicator.top}px, 0)`,
          width: `${indicator.width}px`,
          height: `${indicator.height}px`,
        }}
        aria-hidden="true"
      />

      {/* Segment Option Buttons */}
      {options.map((opt) => {
        const isSelected = opt.value === value
        return (
          <button
            key={opt.value}
            ref={(el) => {
              if (el) {
                itemRefs.current.set(opt.value, el)
              } else {
                itemRefs.current.delete(opt.value)
              }
            }}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => {
              playMicroClick('tab')
              onChange(opt.value)
            }}
            className={`relative z-10 rounded-full flex items-center justify-center gap-1.5 font-bold uppercase tracking-wider transition-colors duration-150 cursor-pointer ${buttonPadding} ${
              fullWidth ? 'flex-1 sm:flex-initial' : ''
            } ${isSelected ? 'text-canvas' : 'text-muted hover:text-fg'}`}
          >
            {opt.icon}
            <span>{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}

