import { describe, it, expect, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import { DeckSwitcher } from './DeckSwitcher'

describe('DeckSwitcher', () => {
  it('renders all three deck options with numbers and labels', () => {
    const html = renderToString(<DeckSwitcher activeDeck={0} onSelectDeck={vi.fn()} />)

    expect(html).toContain('01')
    expect(html).toContain('02')
    expect(html).toContain('03')
    expect(html).toContain('Focus')
    expect(html).toContain('Tasks')
    expect(html).toContain('Stats')
  })

  it('marks activeDeck with aria-pressed="true"', () => {
    const html0 = renderToString(<DeckSwitcher activeDeck={0} onSelectDeck={vi.fn()} />)
    expect(html0).toContain('aria-pressed="true"')

    const html1 = renderToString(<DeckSwitcher activeDeck={1} onSelectDeck={vi.fn()} />)
    expect(html1).toContain('aria-pressed="true"')
  })
})
