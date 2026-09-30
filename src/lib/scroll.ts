export interface ScrollMetrics {
  maxScroll: number
  scrollTop: number
}

/**
 * Whether a vertical scroller still has travel in the wheel's direction.
 *
 * The one-pixel slack matters: a list resting at 143.4px of a 144px range
 * would otherwise read as "still scrollable" and swallow the gesture.
 */
export function hasScrollTravel(scrollTop: number, maxScroll: number, direction: number): boolean {
  if (maxScroll <= 1) return false
  return direction > 0 ? scrollTop < maxScroll - 1 : scrollTop > 1
}

/**
 * Nearest element from `start` up to (but excluding) `stop` that `metrics`
 * reports as a scroller with travel left in the wheel's direction.
 *
 * The search runs outwards on purpose. A card list that has run out must hand
 * the gesture to the next scroller up instead of swallowing it, otherwise the
 * wheel dies at the end of every list — the list simply has nothing to scroll,
 * yet it still keeps the event from reaching the app.
 */
export function findScrollerWithTravel<T>(
  start: T | null,
  stop: T | null,
  direction: number,
  metrics: (el: T) => ScrollMetrics | null,
): T | null {
  let el: T | null = start
  while (el != null && el !== stop) {
    const m = metrics(el)
    if (m && hasScrollTravel(m.scrollTop, m.maxScroll, direction)) return el
    el = (el as { parentElement?: T | null } | null)?.parentElement ?? null
  }
  return null
}
