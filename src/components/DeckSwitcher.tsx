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
      className="flex items-center gap-0.5 sm:gap-1 font-mono select-none shrink-0 min-w-[165px] sm:min-w-[180px] contain-paint"
    >
      {DECKS.map((deck) => {
        const isActive = activeDeck === deck.id
        return (
          <div key={deck.id} className="flex items-center">
            <button
              type="button"
              onClick={() => onSelectDeck(deck.id)}
              className="relative flex items-center justify-center min-h-[44px] min-w-[36px] sm:min-w-[40px] px-0.5 cursor-pointer outline-none select-none group focus-visible:ring-1 focus-visible:ring-fg/50 rounded-full"
              aria-pressed={isActive}
              title={`${deck.label} Deck (${deck.num})`}
            >
              <div
                className={`flex items-center rounded-full font-mono font-semibold tracking-wider uppercase text-[10px] sm:text-[11px] px-2.5 py-1 transition-[background-color,color,box-shadow] duration-200 ease-out will-change-[background-color,color] ${
                  isActive
                    ? 'bg-fg text-canvas shadow-sm ring-1 ring-fg/10'
                    : 'text-muted hover:text-fg hover:bg-fg/5'
                }`}
              >
                <span className="tabular-nums opacity-90">{deck.num}</span>
                <span
                  className={`inline-block overflow-hidden whitespace-nowrap transition-[max-width,opacity,padding] duration-200 ease-out will-change-[max-width,opacity] transform-gpu motion-reduce:transition-none ${
                    isActive
                      ? 'max-w-[70px] opacity-100 pl-1.5'
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

