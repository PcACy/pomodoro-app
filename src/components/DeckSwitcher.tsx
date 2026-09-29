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

// One mechanical settle for every moving part of the pill: the label reveal,
// the gap that precedes it, and the sibling reflow all share this curve so the
// pill grows as a single continuous width change.
const PILL_EASE = 'ease-[cubic-bezier(0.32,0.72,0,1)]'
const PILL_DURATION = 'duration-300'

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
            className={`group flex min-h-[36px] cursor-pointer items-center rounded-full border px-2.5 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors ${PILL_DURATION} ${PILL_EASE} sm:min-h-[40px] ${
              isActive
                ? 'border-fg bg-fg text-canvas'
                : 'border-line text-muted hover:border-fg/30 hover:text-fg'
            }`}
            aria-pressed={isActive}
            aria-label={`${deck.label} deck`}
            title={`${deck.label} Deck (${deck.num})`}
          >
            {/* The 6px gap before the label is padding on the number, not on the
                clipped label box: padding inside the 0fr track survives the
                collapse and would leave collapsed pills slightly oval. */}
            <span
              className={`tabular-nums transition-[padding] ${PILL_DURATION} ${PILL_EASE} motion-reduce:transition-none ${
                isActive ? 'pr-1.5' : 'pr-0'
              }`}
            >
              {deck.num}
            </span>
            {/* 0fr → 1fr interpolates to the label's exact content width, so the
                pill grows at a constant rate. Animating max-width instead would
                finish the visual travel early and leave dead time at the end. */}
            <span
              className={`grid items-center overflow-hidden transition-[grid-template-columns] ${PILL_DURATION} ${PILL_EASE} motion-reduce:transition-none ${
                isActive ? 'grid-cols-[1fr]' : 'grid-cols-[0fr]'
              }`}
              aria-hidden={!isActive}
            >
              <span
                className={`min-w-0 overflow-hidden whitespace-nowrap transition-opacity duration-200 ease-out motion-reduce:transition-none ${
                  // Fade the label out fast on collapse, but hold it until the
                  // pill has opened before fading in — masks the text wipe.
                  isActive ? 'opacity-100 delay-100' : 'opacity-0 delay-0'
                }`}
              >
                {deck.label}
              </span>
            </span>
          </button>
        )
      })}
    </nav>
  )
})
