import { memo } from 'react'
import { BentoCard } from './BentoCard'

interface SystemStatusCardProps {
  isOnline?: boolean
  className?: string
}

export const SystemStatusCard = memo(function SystemStatusCard({
  isOnline = true,
  className = '',
}: SystemStatusCardProps) {
  return (
    <BentoCard
      label="STATUS"
      className={className}
      contentClassName="justify-center py-2"
    >
      <div className="grid grid-cols-2 gap-2 font-mono text-[9px] sm:text-[10px] tracking-wider uppercase">
        {/* Pill 1: Database */}
        <div className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-full border border-line bg-canvas text-fg">
          <span className="h-1.5 w-1.5 rounded-full bg-[#4a9e5c]" />
          <span>INDEXEDDB</span>
        </div>

        {/* Pill 2: Sync */}
        <div className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-full border border-line bg-canvas text-fg">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          <span>SYNCED</span>
        </div>

        {/* Pill 3: Network / Offline */}
        <div className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-full border border-line bg-canvas text-fg">
          <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-[#4a9e5c]' : 'bg-accent'}`} />
          <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
        </div>

        {/* Pill 4: Version */}
        <div className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-full border border-line bg-canvas text-muted">
          <span>V1.0.0</span>
        </div>
      </div>
    </BentoCard>
  )
})

