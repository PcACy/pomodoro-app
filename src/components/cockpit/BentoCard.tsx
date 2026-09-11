import { memo, type ReactNode } from 'react'

interface BentoCardProps {
  label: string
  action?: ReactNode
  indicator?: ReactNode
  children: ReactNode
  className?: string
  contentClassName?: string
  onClick?: () => void
}

export const BentoCard = memo(function BentoCard({
  label,
  action,
  indicator,
  children,
  className = '',
  contentClassName = '',
  onClick,
}: BentoCardProps) {
  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden rounded-[24px] backdrop-blur-md bg-white/85 dark:bg-neutral-950/60 border border-black/10 dark:border-white/10 shadow-none dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_4px_24px_-4px_rgba(0,0,0,0.3)] p-4 sm:p-5 flex flex-col justify-between select-none transition-all duration-200 ${className}`}
    >
      {/* Header with proportional Sans label (Sentence Case) and optional actions */}
      <div className="relative z-10 flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          {indicator}
          <span className="font-sans font-medium text-xs sm:text-[13px] text-muted/90 dark:text-neutral-300 tracking-normal truncate">
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

