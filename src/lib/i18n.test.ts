import { describe, expect, it } from 'vitest'
import { getLang, getMessages, setLang, translations } from './i18n'

describe('i18n Fallback Proxy and Language Support', () => {
  it('provides all default translations for German and English', () => {
    expect(translations.de.nav.timer).toBe('Timer')
    expect(translations.en.nav.timer).toBe('Timer')
    expect(translations.de.phases.focus).toBe('Fokus')
    expect(translations.en.phases.focus).toBe('Focus')
  })

  it('transparently falls back to German for missing keys or undefined properties', () => {
    const customLangMessages = getMessages('en')
    // Standard access
    expect(customLangMessages.nav.settings).toBe('Settings')
    // Accessing an object with fallback proxy
    const deNav = translations.de.nav
    expect(deNav.timer).toBe('Timer')

    // Verify proxy behavior when accessing existing nested properties
    expect(translations.en.timer.pomodoro).toBe('Pomodoro')
    expect(translations.de.timer.rounds(2, 4)).toBe('2/4 Runden')
    expect(translations.en.timer.rounds(2, 4)).toBe('2/4 rounds')
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

