import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { translations, type Locale, type TranslationTree } from './translations'

type LangContextValue = {
  locale: Locale
  setLocale: (l: Locale) => void
  t: TranslationTree
}

const LangContext = createContext<LangContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>('ru')
  const value = useMemo(
    () => ({ locale, setLocale, t: translations[locale] }),
    [locale],
  )
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

export function useLang() {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang must be used within LanguageProvider')
  return ctx
}
