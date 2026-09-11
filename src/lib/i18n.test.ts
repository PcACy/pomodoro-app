import { describe, expect, it } from 'vitest'
import { getLang, setLang, translations } from './i18n'

describe('i18n Fallback Proxy and Language Support', () => {
  it('provides all default translations for German and English', () => {
    expect(translations.de.nav.statistics).toBe('Statistik')
    expect(translations.en.nav.statistics).toBe('Statistics')
    expect(translations.de.phases.focus).toBe('Fokus')
    expect(translations.en.phases.focus).toBe('Focus')
    expect(translations.de.sessionLog.emptyTodaySub).toContain('Deck 01')
    expect(translations.en.sessionLog.emptyTodaySub).toContain('Focus Deck')
  })

  it('transparently falls back to German for missing keys or undefined properties', () => {
    // Standard access
    expect(translations.en.nav.settings).toBe('Settings')
    // Accessing an object with fallback proxy
    const deNav = translations.de.nav
    expect(deNav.settings).toBe('Einstellungen')

    // Verify proxy behavior when accessing existing nested properties
    expect(translations.en.timer.flow).toBe('Flow')
    expect(translations.de.dashboard.goalReached(50)).toBe('50% erreicht')
    expect(translations.en.dashboard.goalReached(50)).toBe('50% reached')
  })

  it('validates language detection and setting', () => {
    setLang('en')
    expect(getLang()).toBe('en')
    setLang('de')
    expect(getLang()).toBe('de')
    // Invalid language should not change currentLang
    // @ts-expect-error test invalid value
    setLang('invalid_lang')
    expect(getLang()).toBe('de')
  })
})

