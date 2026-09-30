import { describe, it, expect } from 'vitest'
import { renderToString } from 'react-dom/server'
import { mergeWithDefaults } from '../../hooks/useSettings'
import { GoalLoadCard } from './GoalLoadCard'
import { FocusTimeCard } from './FocusTimeCard'
import { DEFAULT_SETTINGS } from '../../types'

// mergeWithDefaults accepts 0 as a valid goal (Math.max(0, …)). `||` used to map
// that 0 to the default, which made each card's Math.max floor dead code and
// rendered the default target instead of the documented minimum.
describe('goal minutes treat 0 as a real value', () => {
  it('mergeWithDefaults preserves a 0 goal instead of substituting the default', () => {
    expect(mergeWithDefaults({ weeklyGoalMinutes: 0 }).weeklyGoalMinutes).toBe(0)
    expect(mergeWithDefaults({ dailyGoalMinutes: 0 }).dailyGoalMinutes).toBe(0)
  })

  it('GoalLoadCard applies the 60-minute floor to a 0 weekly goal', () => {
    const settings = mergeWithDefaults({ weeklyGoalMinutes: 0 })

    const html = renderToString(<GoalLoadCard sessions={[]} settings={settings} />)

    // 60 min renders as "1.0h" — the floor, not the 300-minute default ("5.0h").
    expect(html).toContain('1.0')
    expect(html).not.toContain('5.0')
  })

  it('FocusTimeCard applies the 15-minute floor to a 0 daily goal', () => {
    const settings = mergeWithDefaults({ dailyGoalMinutes: 0 })

    const html = renderToString(<FocusTimeCard sessions={[]} settings={settings} />)

    expect(html).toContain('0.3') // 15 min -> 0.25h -> "0.3" with toFixed(1)
    expect(html).not.toContain('2.0') // the 120-minute default
  })

  it('still renders the default when the goal is absent entirely', () => {
    const html = renderToString(
      <FocusTimeCard sessions={[]} settings={{ ...DEFAULT_SETTINGS }} />,
    )

    expect(html).toContain('2.0')
  })
})
