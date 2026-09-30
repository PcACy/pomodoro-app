import { describe, expect, it } from 'vitest'
import { findScrollerWithTravel, hasScrollTravel, type ScrollMetrics } from './scroll'

describe('hasScrollTravel', () => {
  it('reports no travel when the content already fits', () => {
    expect(hasScrollTravel(0, 0, 120)).toBe(false)
    expect(hasScrollTravel(0, -5, 120)).toBe(false)
  })

  it('allows a downward wheel until the bottom is reached', () => {
    expect(hasScrollTravel(0, 300, 120)).toBe(true)
    expect(hasScrollTravel(150, 300, 120)).toBe(true)
    expect(hasScrollTravel(300, 300, 120)).toBe(false)
  })

  it('allows an upward wheel until the top is reached', () => {
    expect(hasScrollTravel(0, 300, -120)).toBe(false)
    expect(hasScrollTravel(150, 300, -120)).toBe(true)
    expect(hasScrollTravel(300, 300, -120)).toBe(true)
  })

  it('ignores sub-pixel overflow so a settled list is not still scrollable', () => {
    expect(hasScrollTravel(0, 1, 120)).toBe(false)
    expect(hasScrollTravel(0.5, 0.9, -120)).toBe(false)
    expect(hasScrollTravel(0, 1.6, 120)).toBe(true)
  })
})

interface FakeEl {
  name: string
  maxScroll: number
  scrollTop: number
  parentElement: FakeEl | null
}

function node(
  name: string,
  opts: { maxScroll?: number; scrollTop?: number; parent?: FakeEl | null } = {},
): FakeEl {
  return {
    name,
    maxScroll: opts.maxScroll ?? 0,
    scrollTop: opts.scrollTop ?? 0,
    parentElement: opts.parent ?? null,
  }
}

/** Only elements that overflow behave like scrollers. */
const metrics = (el: FakeEl): ScrollMetrics | null =>
  el.maxScroll > 0 ? { maxScroll: el.maxScroll, scrollTop: el.scrollTop } : null

describe('findScrollerWithTravel', () => {
  it('finds nothing when the chain has no scroller', () => {
    const pager = node('pager')
    const card = node('card', { parent: pager })
    const leaf = node('leaf', { parent: card })
    expect(findScrollerWithTravel(leaf, pager, 120, metrics)).toBeNull()
  })

  it('returns the scroller that still has travel', () => {
    const pager = node('pager')
    const scroller = node('scroller', { maxScroll: 300, scrollTop: 40, parent: pager })
    const leaf = node('leaf', { parent: scroller })
    expect(findScrollerWithTravel(leaf, pager, 120, metrics)).toBe(scroller)
  })

  it('prefers the innermost scroller with travel', () => {
    const pager = node('pager')
    const outer = node('outer', { maxScroll: 500, scrollTop: 100, parent: pager })
    const inner = node('inner', { maxScroll: 200, scrollTop: 10, parent: outer })
    const leaf = node('leaf', { parent: inner })
    expect(findScrollerWithTravel(leaf, pager, 120, metrics)).toBe(inner)
  })

  it('hands an exhausted scroller to the next one up', () => {
    const pager = node('pager')
    const outer = node('outer', { maxScroll: 500, scrollTop: 100, parent: pager })
    const spent = node('spent', { maxScroll: 200, scrollTop: 200, parent: outer })
    const leaf = node('leaf', { parent: spent })
    expect(findScrollerWithTravel(leaf, pager, 120, metrics)).toBe(outer)
  })

  it('returns null when the only scroller is at its limit in that direction', () => {
    // The first-page Quick Settings list: it can never scroll, so the wheel
    // has to fall through to deck paging instead of dying here.
    const pager = node('pager')
    const fits = node('fits', { maxScroll: 0, scrollTop: 0, parent: pager })
    const leaf = node('leaf', { parent: fits })
    expect(findScrollerWithTravel(leaf, pager, 120, metrics)).toBeNull()
  })

  it('does not scroll a list that is pinned to the bottom when scrolling up', () => {
    const pager = node('pager')
    const bottomed = node('bottomed', { maxScroll: 200, scrollTop: 0, parent: pager })
    const leaf = node('leaf', { parent: bottomed })
    expect(findScrollerWithTravel(leaf, pager, -120, metrics)).toBeNull()
  })

  it('stops before the host it is given', () => {
    const pager = node('pager', { maxScroll: 900, scrollTop: 0 })
    const card = node('card', { parent: pager })
    const leaf = node('leaf', { parent: card })
    // The pager itself is a scroller, but the caller never wants it considered.
    expect(findScrollerWithTravel(leaf, pager, 120, metrics)).toBeNull()
  })

  it('tolerates a null target and a null host', () => {
    expect(findScrollerWithTravel<FakeEl>(null, null, 120, metrics)).toBeNull()
    const scroller = node('scroller', { maxScroll: 100 })
    expect(findScrollerWithTravel(scroller, null, 120, metrics)).toBe(scroller)
  })
})
