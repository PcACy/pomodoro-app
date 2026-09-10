import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as foregroundModule from './foregroundTimer'
import { ForegroundService, Importance } from '@capawesome-team/capacitor-android-foreground-service'
import { Capacitor } from '@capacitor/core'

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(),
    getPlatform: vi.fn(),
  },
}))

vi.mock('@capawesome-team/capacitor-android-foreground-service', () => ({
  ForegroundService: {
    createNotificationChannel: vi.fn(),
    checkPermissions: vi.fn(),
    requestPermissions: vi.fn(),
    startForegroundService: vi.fn(),
    updateForegroundService: vi.fn(),
    stopForegroundService: vi.fn(),
  },
  Importance: {
    Low: 2,
  },
}))

describe('foregroundTimer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does nothing when running on web (non-native)', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false)
    vi.mocked(Capacitor.getPlatform).mockReturnValue('web')

    expect(foregroundModule.isForegroundServiceSupported()).toBe(false)

    await foregroundModule.updateForegroundTimer('Focus', '25:00')
    expect(ForegroundService.startForegroundService).not.toHaveBeenCalled()

    await foregroundModule.stopForegroundTimer()
    expect(ForegroundService.stopForegroundService).not.toHaveBeenCalled()
  })

  it('starts, updates, and stops foreground service when native Android', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)
    vi.mocked(Capacitor.getPlatform).mockReturnValue('android')
    vi.mocked(ForegroundService.createNotificationChannel).mockResolvedValue(undefined)
    vi.mocked(ForegroundService.checkPermissions).mockResolvedValue({ display: 'granted' as const })
    vi.mocked(ForegroundService.startForegroundService).mockResolvedValue(undefined)
    vi.mocked(ForegroundService.updateForegroundService).mockResolvedValue(undefined)
    vi.mocked(ForegroundService.stopForegroundService).mockResolvedValue(undefined)

    expect(foregroundModule.isForegroundServiceSupported()).toBe(true)

    // First update starts service
    await foregroundModule.updateForegroundTimer('Focus', '25:00')
    expect(ForegroundService.createNotificationChannel).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'pomodoro_timer_channel',
        importance: Importance.Low,
      }),
    )
    expect(ForegroundService.startForegroundService).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Focus',
        body: '25:00',
        silent: true,
      }),
    )

    // Second update calls updateForegroundService
    await foregroundModule.updateForegroundTimer('Focus', '24:59')
    expect(ForegroundService.updateForegroundService).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Focus',
        body: '24:59',
      }),
    )

    // Stopping service
    await foregroundModule.stopForegroundTimer()
    expect(ForegroundService.stopForegroundService).toHaveBeenCalled()
  })
})
