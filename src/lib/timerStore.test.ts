import { describe, expect, it, vi } from 'vitest'
import {
  getFlowTickSnapshot,
  getTimerTickSnapshot,
  setFlowTickSnapshot,
  setTimerTickSnapshot,
  subscribeFlowTick,
  subscribeTimerTick,
} from './timerStore'

describe('timerStore', () => {
  it('updates timer tick snapshot and notifies subscribers', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeTimerTick(listener)

    // Derive values guaranteed to differ from the (settings-derived) initial
    // snapshot so the test holds regardless of stored focus duration.
    const initial = getTimerTickSnapshot()
    const first =
      initial.remainingMs === 1500000
        ? { remainingMs: 1499000, time: '24:59', progress: 0.999 }
        : { remainingMs: 1500000, time: '25:00', progress: 1 }

    setTimerTickSnapshot(first)

    expect(getTimerTickSnapshot()).toEqual(first)
    expect(listener).toHaveBeenCalledTimes(1)

    // Identical update should be ignored (no redundant notify)
    setTimerTickSnapshot(first)
    expect(listener).toHaveBeenCalledTimes(1)

    // Different update should notify
    const second =
      first.remainingMs === 1500000
        ? { remainingMs: 1499000, time: '24:59', progress: 0.999 }
        : { remainingMs: 1498000, time: '24:58', progress: 0.998 }
    setTimerTickSnapshot(second)
    expect(listener).toHaveBeenCalledTimes(2)

    unsubscribe()
    setTimerTickSnapshot({
      remainingMs: 1497000,
      time: '24:57',
      progress: 0.997,
    })
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('updates flow tick snapshot and notifies subscribers', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeFlowTick(listener)

    setFlowTickSnapshot({
      elapsedMs: 60000,
      time: '01:00',
    })

    expect(getFlowTickSnapshot()).toEqual({
      elapsedMs: 60000,
      time: '01:00',
    })
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
  })
})
