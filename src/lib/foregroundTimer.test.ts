import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Capacitor } from '@capacitor/core'

const mockTimerForeground = vi.hoisted(() => ({
  startTimer: vi.fn(),
  stopTimer: vi.fn(),
  checkPermissions: vi.fn(),
  requestPermissions: vi.fn(),
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(),
    getPlatform: vi.fn(),
  },
  registerPlugin: vi.fn(() => mockTimerForeground),
}))

import * as foregroundModule from './foregroundTimer'

describe('foregroundTimer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does nothing when running on web (non-native)', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false)
    vi.mocked(Capacitor.getPlatform).mockReturnValue('web')

    expect(foregroundModule.isForegroundServiceSupported()).toBe(false)

    await foregroundModule.startForegroundTimer({
      title: 'Focus',
      content: 'Coding',
      targetTime: Date.now() + 25 * 60 * 1000,
      isCountDown: true,
    })
    expect(mockTimerForeground.startTimer).not.toHaveBeenCalled()

    await foregroundModule.stopForegroundTimer()
    expect(mockTimerForeground.stopTimer).not.toHaveBeenCalled()
  })

  it('starts and stops foreground service when running on native Android', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)
    vi.mocked(Capacitor.getPlatform).mockReturnValue('android')
    mockTimerForeground.checkPermissions.mockResolvedValue({ notifications: 'granted' })
    mockTimerForeground.startTimer.mockResolvedValue(undefined)
    mockTimerForeground.stopTimer.mockResolvedValue(undefined)

    expect(foregroundModule.isForegroundServiceSupported()).toBe(true)

    const targetTime = Date.now() + 1500_000
    await foregroundModule.startForegroundTimer({
      title: 'Focus',
      content: 'Feature dev',
      targetTime,
      isCountDown: true,
    })

    expect(mockTimerForeground.startTimer).toHaveBeenCalledWith({
      title: 'Focus',
      content: 'Feature dev',
      targetTime,
      isCountDown: true,
    })

    await foregroundModule.stopForegroundTimer()
    expect(mockTimerForeground.stopTimer).toHaveBeenCalled()
  })
})
