import { memo } from 'react'

export interface DeckSwitcherProps {
  activeDeck: number
  onSelectDeck: (deck: number) => void
}

const DECKS = [
  { id: 0, num: '01', label: 'Focus' },
  { id: 1, num: '02', label: 'Tasks' },
  { id: 2, num: '03', label: 'Stats' },
] as const

export const DeckSwitcher = memo(function DeckSwitcher({
  activeDeck,
  onSelectDeck,
}: DeckSwitcherProps) {
  return (
    <nav aria-label="Deck Switcher" className="flex shrink-0 select-none items-center gap-1">
      {DECKS.map((deck) => {
        const isActive = activeDeck === deck.id
        return (
          <button
            key={deck.id}
            type="button"
            onClick={() => onSelectDeck(deck.id)}
            className={`group flex min-h-[36px] cursor-pointer items-center rounded-full border px-2.5 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors duration-200 sm:min-h-[40px] ${
              isActive
                ? 'border-fg bg-fg text-canvas'
                : 'border-line text-muted hover:border-fg/30 hover:text-fg'
            }`}
            aria-pressed={isActive}
            aria-label={`${deck.label} deck`}
            title={`${deck.label} Deck (${deck.num})`}
          >
            <span className="tabular-nums">{deck.num}</span>
            <span
              className={`overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-200 motion-reduce:transition-none ${
                isActive ? 'ml-1.5 max-w-[60px] opacity-100' : 'max-w-0 opacity-0'
              }`}
              aria-hidden={!isActive}
            >
              {deck.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
})
