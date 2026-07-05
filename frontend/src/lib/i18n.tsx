'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import en from './i18n/en.json';
import zh from './i18n/zh.json';

export type Language = 'en' | 'zh';

type Translations = typeof en;

const translations: Record<Language, Translations> = { en, zh };

interface I18nContextType {
  lang: Language;
  t: Translations;
  toggleLang: () => void;
  setLang: (lang: Language) => void;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>('zh');

  // Load saved language from localStorage on mount
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('aetherfi-lang') as Language : null;
    if (saved && (saved === 'en' || saved === 'zh')) {
      setLangState(saved);
    }
  }, []);

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('aetherfi-lang', newLang);
    }
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === 'en' ? 'zh' : 'en');
  }, [lang, setLang]);

  return (
    <I18nContext.Provider value={{ lang, t: translations[lang], toggleLang, setLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return ctx;
}
