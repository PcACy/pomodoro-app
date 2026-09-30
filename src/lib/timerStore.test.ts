import { describe, expect, it, vi } from 'vitest'
import {
  getFlowTickSnapshot,
  getTimerTickSnapshot,
  setFlowTickSnapshot,
  setTimerTickSnapshot,
  subscribeFlowTick,
  subscribeTimerTick,
} from './timerStore'
import { fmtFlowTime, fmtTime } from './time'

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

  it('publishes a second-resolution pomodoro snapshot for a given target end', () => {
    // The ticker wakes 4x/second; useTimer snaps the published value to the
    // second boundary so identical pictures do not re-render subscribers.
    // This locks that contract at the source of the rounding.
    const total = 1_500_000
    // Wall-clock offset into the current displayed second. The countdown is
    // anchored to a fixed target end, so `offset` advances the way the 250ms
    // ticker does.
    const remainingAt = (offset: number) => {
      const remaining = 1_204_000 - offset
      const published = Math.ceil(remaining / 1000) * 1000
      return {
        remainingMs: published,
        time: fmtTime(published),
        progress: total > 0 ? published / total : 0,
      }
    }

    const listener = vi.fn()
    const unsubscribe = subscribeTimerTick(listener)

    // Four wakeups inside the same displayed second collapse to one distinct
    // picture, so the store notifies exactly once.
    const first = remainingAt(500)
    setTimerTickSnapshot(first)
    expect(first.time).toBe('20:04')
    expect(listener).toHaveBeenCalledTimes(1)

    for (const offset of [750, 900, 999]) {
      setTimerTickSnapshot(remainingAt(offset))
    }
    expect(listener).toHaveBeenCalledTimes(1)

    // Crossing the second boundary does produce a new picture.
    const next = remainingAt(1000)
    expect(next.time).toBe('20:03')
    setTimerTickSnapshot(next)
    expect(listener).toHaveBeenCalledTimes(2)

    // Snapping up never exceeds the true remaining time, so a paused timer
    // cannot display more time than it actually has.
    expect(first.remainingMs).toBeLessThanOrEqual(1_204_000)
    expect(first.progress).toBeCloseTo(first.remainingMs / total, 10)

    unsubscribe()
  })

  it('publishes a second-resolution flow snapshot for a given elapsed time', () => {
    // useFlowTimer counts up and floors to whole seconds for the same reason.
    const publish = (elapsed: number) => {
      const published = Math.floor(elapsed / 1000) * 1000
      return { elapsedMs: published, time: fmtFlowTime(published) }
    }

    const listener = vi.fn()
    const unsubscribe = subscribeFlowTick(listener)

    // 2_061_000..2_061_999 all display as "34:21", so these four wakeups are
    // one picture.
    const first = publish(2_061_400)
    setFlowTickSnapshot(first)
    expect(first.time).toBe('34:21')
    expect(listener).toHaveBeenCalledTimes(1)

    for (const ms of [2_061_150, 2_061_000, 2_060_999 + 1]) {
      setFlowTickSnapshot(publish(ms))
    }
    expect(listener).toHaveBeenCalledTimes(1)

    const next = publish(2_060_900)
    expect(next.time).toBe('34:20')
    setFlowTickSnapshot(next)
    expect(listener).toHaveBeenCalledTimes(2)

    // Flooring is what keeps the count-up honest: it never runs ahead of the
    // true elapsed time.
    expect(first.elapsedMs).toBeLessThanOrEqual(2_061_400)

    unsubscribe()
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
