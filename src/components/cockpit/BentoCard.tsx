import { memo, type ReactNode } from 'react'

interface BentoCardProps {
  label: string
  action?: ReactNode
  indicator?: ReactNode
  children: ReactNode
  className?: string
  contentClassName?: string
}

export const BentoCard = memo(function BentoCard({
  label,
  action,
  indicator,
  children,
  className = '',
  contentClassName = '',
}: BentoCardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-card bg-surface border border-line p-4 sm:p-5 flex flex-col justify-between select-none transition-colors duration-150 ${className}`}
    >
      {/* Subtle Nothing dot-grid substrate background inside the card */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03] dark:opacity-[0.05] [background-image:radial-gradient(var(--color-fg)_1px,transparent_1px)] [background-size:12px_12px]"
        aria-hidden="true"
      />

      {/* Header with technical mono ALL-CAPS label and optional actions */}
      <div className="relative z-10 flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          {indicator}
          <span className="font-mono text-[10px] sm:text-xs tracking-widest text-muted uppercase truncate">
            {label}
          </span>
        </div>
        {action && <div className="relative z-10 shrink-0">{action}</div>}
      </div>

      {/* Content */}
      <div className={`relative z-10 flex-1 flex flex-col ${contentClassName}`}>{children}</div>
    </div>
  )
})

