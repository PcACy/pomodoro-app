import { useCallback, useEffect, useState } from 'react'
import {
  getLang,
  setLang as setGlobalLang,
  subscribeLang,
  translations,
  type Lang,
  type Messages,
} from '../lib/i18n'

export interface Translation {
  t: Messages
  lang: Lang
  setLang: (lang: Lang) => void
}

export function useTranslation(): Translation {
  const [lang, setLangState] = useState<Lang>(getLang)

  useEffect(() => subscribeLang(() => setLangState(getLang())), [])

  const setLang = useCallback((next: Lang) => {
    setGlobalLang(next)
    setLangState(next)
  }, [])

  return { t: translations[lang], lang, setLang }
}