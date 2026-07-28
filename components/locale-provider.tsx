'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { type Locale, type Dictionary, defaultLocale, getDictionary, parseLocale } from '@/lib/i18n/dictionaries';

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Dictionary;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  // Corrects from the cookie after mount, same reasoning as the theme
  // toggle: SSR always renders the default so there's no hydration
  // mismatch, and this fires before the user can interact with anything
  // that reads `locale`.
  useEffect(() => {
    const match = document.cookie.match(/(?:^|; )locale=([^;]+)/);
    setLocaleState(parseLocale(match?.[1]));
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    document.cookie = `locale=${next}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}`;
  }, []);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t: getDictionary(locale) }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return ctx;
}
