import { describe, it, expect } from 'vitest'
import { renderToString } from 'react-dom/server'
import { setFlowTickSnapshot } from '../../lib/timerStore'
import { HeroTimerCard } from './HeroTimerCard'

const baseProps = {
  phaseLabel: 'Focus',
  status: 'idle' as const,
  mode: 'pomodoro' as const,
  flowStatus: 'idle' as const,
  completedFocusInCycle: 0,
  roundsBeforeLongBreak: 4,
  onModeChange: () => {},
  onToggle: () => {},
  onSkip: () => {},
  onReset: () => {},
}

// useFlowTimer publishes the coarse flow state (the source of the `flowTime`
// prop) only on start/pause/finish/reset — never on ticks. The per-second value
// reaches the card through the shared tick store instead.
describe('HeroTimerCard flow clock', () => {
  it('renders the live tick while flow is running, not the frozen flowTime prop', () => {
    setFlowTickSnapshot({ elapsedMs: 95_000, time: '01:35' })

    const html = renderToString(
      <HeroTimerCard {...baseProps} mode="flow" flowStatus="running" flowTime="00:00" />,
    )

    expect(html).toContain('01:35')
    // The regression: the stale prop won, so the clock sat at 00:00 for the
    // whole session while the rest of the app counted up.
    expect(html).not.toContain('00:00')
  })

  it('uses the flowTime prop when the flow timer is not running', () => {
    setFlowTickSnapshot({ elapsedMs: 549_000, time: '09:09' })

    const html = renderToString(
      <HeroTimerCard {...baseProps} mode="flow" flowStatus="paused" flowTime="02:00" />,
    )

    expect(html).toContain('02:00')
    expect(html).not.toContain('09:09')
  })

  it('falls back to the flowTime prop when the tick has not initialised', () => {
    setFlowTickSnapshot({ elapsedMs: 0, time: '' })

    const html = renderToString(
      <HeroTimerCard {...baseProps} mode="flow" flowStatus="paused" flowTime="02:00" />,
    )

    expect(html).toContain('02:00')
  })
})
