import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppLanguage, translations, Translations } from './translations.js';

export interface LanguageOption {
  id: AppLanguage;
  label: string;
  flag: string;
  nativeName: string;
  description: string;
}

export const AVAILABLE_LANGUAGES: LanguageOption[] = [
  {
    id: 'pt',
    label: 'Português (Brasil)',
    nativeName: 'Português',
    flag: '🇧🇷',
    description: 'Português Brasileiro (Padrão)'
  },
  {
    id: 'en',
    label: 'English (US)',
    nativeName: 'English',
    flag: '🇺🇸',
    description: 'English (United States)'
  },
  {
    id: 'es',
    label: 'Español',
    nativeName: 'Español',
    flag: '🇪🇸',
    description: 'Español (Castellano / Internacional)'
  }
];

interface LanguageContextType {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => Promise<void>;
  t: (path: string, paramsOrFallback?: Record<string, string | number> | string, fallback?: string) => string;
  currentLanguageOption: LanguageOption;
  languagesList: LanguageOption[];
}

const LanguageContext = createContext<LanguageContextType | null>(null);

function getNestedValue(obj: any, path: string): string | undefined {
  if (!obj || !path) return undefined;
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }
  return typeof current === 'string' ? current : undefined;
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<AppLanguage>(() => {
    try {
      const saved = localStorage.getItem('drivegram_language') as AppLanguage;
      if (saved && (saved === 'pt' || saved === 'en' || saved === 'es')) {
        return saved;
      }
      // Check navigator language
      const navLang = navigator.language?.toLowerCase() || '';
      if (navLang.startsWith('en')) return 'en';
      if (navLang.startsWith('es')) return 'es';
      return 'pt';
    } catch {
      return 'pt';
    }
  });

  // Sync with server on initial mount
  useEffect(() => {
    fetch('/api/settings/language')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.language && (data.language === 'pt' || data.language === 'en' || data.language === 'es')) {
          setLanguageState(data.language);
          localStorage.setItem('drivegram_language', data.language);
        }
      })
      .catch(() => {});
  }, []);

  const setLanguage = useCallback(async (newLang: AppLanguage) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem('drivegram_language', newLang);
      window.dispatchEvent(new CustomEvent('drivegram-language-changed', { detail: { language: newLang } }));
      await fetch('/api/settings/language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: newLang })
      });
    } catch (e) {
      console.warn('[i18n] Failed to persist language to server:', e);
    }
  }, []);

  const t = useCallback((path: string, paramsOrFallback?: Record<string, string | number> | string, fallback?: string): string => {
    let params: Record<string, string | number> | undefined;
    let fallbackText: string | undefined;

    if (typeof paramsOrFallback === 'string') {
      fallbackText = paramsOrFallback;
    } else if (paramsOrFallback && typeof paramsOrFallback === 'object') {
      params = paramsOrFallback;
      fallbackText = fallback;
    }

    const currentDict = translations[language] || translations.pt;
    let text = getNestedValue(currentDict, path);

    // Fallback to Portuguese if not found in current language
    if (!text && language !== 'pt') {
      text = getNestedValue(translations.pt, path);
    }

    if (!text) {
      return fallbackText !== undefined ? fallbackText : path;
    }

    if (params) {
      return Object.entries(params).reduce((acc, [key, val]) => {
        return acc.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val));
      }, text);
    }

    return text;
  }, [language]);

  const currentLanguageOption = AVAILABLE_LANGUAGES.find(l => l.id === language) || AVAILABLE_LANGUAGES[0];

  return (
    <LanguageContext.Provider value={{
      language,
      setLanguage,
      t,
      currentLanguageOption,
      languagesList: AVAILABLE_LANGUAGES
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    // Graceful fallback for tests or components rendered outside provider
    return {
      language: 'pt' as AppLanguage,
      setLanguage: async () => {},
      t: (path: string, paramsOrFallback?: any, fallback?: string) => {
        if (typeof paramsOrFallback === 'string') return paramsOrFallback;
        if (fallback) return fallback;
        const currentDict = translations.pt;
        return getNestedValue(currentDict, path) || path;
      },
      currentLanguageOption: AVAILABLE_LANGUAGES[0],
      languagesList: AVAILABLE_LANGUAGES
    };
  }
  return context;
}

export const useLanguage = useTranslation;
