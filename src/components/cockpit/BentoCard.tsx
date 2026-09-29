import { memo, type ReactNode } from 'react'

interface BentoCardProps {
  label: string
  action?: ReactNode
  indicator?: ReactNode
  children: ReactNode
  className?: string
  contentClassName?: string
  /** Removes the header rule; used when the card body is a single visual. */
  bare?: boolean
}

export const BentoCard = memo(function BentoCard({
  label,
  action,
  indicator,
  children,
  className = '',
  contentClassName = '',
  bare = false,
}: BentoCardProps) {
  return (
    <section
      className={`panel flex min-h-0 flex-col overflow-hidden p-4 select-none sm:p-5 ${className}`}
    >
      {!bare && (
        <header className="relative z-10 mb-3 flex shrink-0 items-center gap-2">
          <span aria-hidden="true" className="dot bg-fg/25" />
          <h2 className="label truncate text-fg/80">{label}</h2>
          {indicator ? (
            <div className="flex min-w-0 shrink items-center gap-2">{indicator}</div>
          ) : null}
          {action ? <div className="relative z-10 ml-auto shrink-0">{action}</div> : null}
        </header>
      )}
      <div
        className={`relative z-10 flex min-h-0 flex-1 flex-col ${contentClassName}`}
      >
        {children}
      </div>
    </section>
  )
})
