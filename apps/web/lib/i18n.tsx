'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import idMessages from '../messages/id.json';
import enMessages from '../messages/en.json';

// ---- Types ----

type Locale = 'id' | 'en';
type TranslationKey = string;

interface I18nContextValue {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: (key: TranslationKey) => string;
}

// ---- Messages map ----

// JSON imports have deeply nested types from TypeScript's JSON module resolution.
// Cast to Record<string, unknown> for dynamic traversal via getNestedValue().
const messages: Record<Locale, Record<string, unknown>> = {
    id: idMessages as Record<string, unknown>,
    en: enMessages as Record<string, unknown>,
};

// ---- Helper: get nested value ----

// Dev-only dedupe: warn once per missing key to avoid flooding the console.
const warnedMissingKeys = new Set<string>();

function warnMissingKey(path: string) {
    if (process.env.NODE_ENV !== 'development') return;
    if (warnedMissingKeys.has(path)) return;
    warnedMissingKeys.add(path);
    console.warn(`[i18n] Missing translation key: "${path}"`);
}

// NOTE: Return value must stay identical to the pre-Session-85 behavior
// (silent fallback to the raw key path) — only a dev-mode warning is added.
function getNestedValue(obj: Record<string, unknown>, path: string): string {
    const keys = path.split('.');
    let current: unknown = obj;
    for (const key of keys) {
        if (current === null || current === undefined) {
            warnMissingKey(path);
            return path;
        }
        current = (current as Record<string, unknown>)[key];
    }
    if (typeof current === 'string') return current;
    warnMissingKey(path);
    return path;
}

// ---- Context ----

const I18nContext = createContext<I18nContextValue | null>(null);

const LOCALE_KEY = 'qalcuity-locale';

// ---- Provider ----

export function I18nProvider({ children }: { children: React.ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>('id');

    useEffect(() => {
        try {
            const stored = localStorage.getItem(LOCALE_KEY) as Locale | null;
            if (stored && (stored === 'id' || stored === 'en')) {
                setLocaleState(stored);
            }
        } catch {
            // SSR or localStorage unavailable
        }
    }, []);

    const setLocale = useCallback((newLocale: Locale) => {
        setLocaleState(newLocale);
        try {
            localStorage.setItem(LOCALE_KEY, newLocale);
        } catch {
            // ignore
        }
    }, []);

    const t = useCallback(
        (key: TranslationKey): string => {
            return getNestedValue(messages[locale], key);
        },
        [locale]
    );

    const value: I18nContextValue = { locale, setLocale, t };

    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

// ---- Hook ----

export function useI18n(): I18nContextValue {
    const ctx = useContext(I18nContext);
    if (!ctx) {
        return {
            locale: 'id',
            setLocale: () => { },
            t: (key: string) => getNestedValue(idMessages as unknown as Record<string, unknown>, key),
        };
    }
    return ctx;
}

// ---- Convenience ----

export function useLocale() {
    return useI18n().locale;
}

export function useTranslation() {
    const { t, locale, setLocale } = useI18n();
    return { t, locale, setLocale };
}
