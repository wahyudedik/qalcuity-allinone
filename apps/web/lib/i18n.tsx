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

const messages: Record<Locale, Record<string, unknown>> = {
    id: idMessages as unknown as Record<string, unknown>,
    en: enMessages as unknown as Record<string, unknown>,
};

// ---- Helper: get nested value ----

function getNestedValue(obj: Record<string, unknown>, path: string): string {
    const keys = path.split('.');
    let current: unknown = obj;
    for (const key of keys) {
        if (current === null || current === undefined) return path;
        current = (current as Record<string, unknown>)[key];
    }
    return typeof current === 'string' ? current : path;
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
