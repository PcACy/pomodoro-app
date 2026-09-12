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
    <nav
      aria-label="Deck Switcher"
      className="flex items-center gap-1 font-mono select-none shrink-0"
    >
      {DECKS.map((deck) => {
        const isActive = activeDeck === deck.id
        return (
          <div key={deck.id} className="flex items-center">
            <button
              type="button"
              onClick={() => onSelectDeck(deck.id)}
              className="relative flex items-center min-h-[40px] sm:min-h-[44px] cursor-pointer outline-none select-none rounded-full focus-visible:ring-1 focus-visible:ring-fg/50 touch-manipulation"
              aria-pressed={isActive}
              title={`${deck.label} Deck (${deck.num})`}
            >
              <div
                className={`flex items-center rounded-full font-mono font-semibold tracking-wider uppercase text-[10px] sm:text-[11px] px-2.5 py-1 transition-colors duration-200 ease-out ${
                  isActive
                    ? 'bg-fg text-canvas shadow-xs ring-1 ring-fg/10'
                    : 'text-muted sm:hover:text-fg sm:hover:bg-fg/5'
                }`}
              >
                <span className="tabular-nums opacity-90">{deck.num}</span>
                <span
                  className={`inline-block overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-200 ease-out motion-reduce:transition-none ${
                    isActive
                      ? 'max-w-[60px] opacity-100 pl-1.5'
                      : 'max-w-0 opacity-0 pl-0 pointer-events-none'
                  }`}
                  aria-hidden={!isActive}
                >
                  {deck.label}
                </span>
              </div>
            </button>
          </div>
        )
      })}
    </nav>
  )
})
