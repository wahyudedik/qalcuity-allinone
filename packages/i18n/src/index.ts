// ============================================
// @qalcuity/i18n — Internationalization Utilities
// Pure utility functions (no React dependency)
// ============================================

// --------------------------------------------
// Types
// --------------------------------------------

export type Locale = 'id' | 'en';
export type TranslationKey = string;
export type Messages = Record<string, unknown>;

// --------------------------------------------
// Constants
// --------------------------------------------

export const DEFAULT_LOCALE: Locale = 'id';
export const SUPPORTED_LOCALES: Locale[] = ['id', 'en'];
export const LOCALE_STORAGE_KEY = 'qalcuity-locale';

// --------------------------------------------
// Locale Detection
// --------------------------------------------

/**
 * Detect user's preferred locale from browser settings
 */
export function detectBrowserLocale(): Locale {
    if (typeof navigator === 'undefined') return DEFAULT_LOCALE;

    const browserLang = navigator.language || (navigator as { userLanguage?: string }).userLanguage || '';
    const langCode = browserLang.split('-')[0]?.toLowerCase();

    if (langCode === 'en') return 'en';
    return DEFAULT_LOCALE;
}

/**
 * Detect locale from localStorage, falling back to browser locale
 */
export function detectLocale(): Locale {
    if (typeof localStorage === 'undefined') return detectBrowserLocale();

    try {
        const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
        if (stored && isValidLocale(stored)) {
            return stored;
        }
    } catch {
        // localStorage unavailable
    }

    return detectBrowserLocale();
}

/**
 * Save locale preference to localStorage
 */
export function saveLocale(locale: Locale): void {
    if (typeof localStorage === 'undefined') return;

    try {
        localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
        // localStorage unavailable
    }
}

/**
 * Check if a string is a valid locale
 */
export function isValidLocale(locale: string): locale is Locale {
    return SUPPORTED_LOCALES.includes(locale as Locale);
}

// --------------------------------------------
// Translation Helpers
// --------------------------------------------

/**
 * Get a nested value from an object using dot notation path
 * e.g., getNestedValue(obj, 'finance.invoices.title')
 */
export function getNestedValue(obj: Record<string, unknown>, path: string): string {
    const keys = path.split('.');
    let current: unknown = obj;

    for (const key of keys) {
        if (current === null || current === undefined) return path;
        current = (current as Record<string, unknown>)[key];
    }

    return typeof current === 'string' ? current : path;
}

/**
 * Set a nested value in an object using dot notation path
 */
export function setNestedValue(
    obj: Record<string, unknown>,
    path: string,
    value: unknown
): void {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!(key in current) || typeof current[key] !== 'object') {
            current[key] = {};
        }
        current = current[key] as Record<string, unknown>;
    }

    current[keys[keys.length - 1]] = value;
}

// --------------------------------------------
// Translation Engine
// --------------------------------------------

export interface TranslationOptions {
    /** Locale to translate to (default: current locale) */
    locale?: Locale;
    /** Fallback locale if key not found */
    fallbackLocale?: Locale;
    /** Values to interpolate into the translated string */
    values?: Record<string, string | number>;
}

/**
 * Create a translator function bound to specific messages
 */
export function createTranslator(messages: Record<Locale, Messages>) {
    return function t(
        key: TranslationKey,
        options: TranslationOptions = {}
    ): string {
        const {
            locale = DEFAULT_LOCALE,
            fallbackLocale = DEFAULT_LOCALE,
            values,
        } = options;

        // Try primary locale first
        let translated = getNestedValue(
            messages[locale] as Record<string, unknown>,
            key
        );

        // Try fallback if not found
        if (translated === key && locale !== fallbackLocale) {
            translated = getNestedValue(
                messages[fallbackLocale] as Record<string, unknown>,
                key
            );
        }

        // Interpolate values if provided
        if (values) {
            translated = interpolate(translated, values);
        }

        return translated;
    };
}

/**
 * Interpolate variables into a translated string
 * Supports {{variable}} syntax
 */
export function interpolate(
    template: string,
    values: Record<string, string | number>
): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
        return values[key] !== undefined ? String(values[key]) : `{{${key}}}`;
    });
}

// --------------------------------------------
// Module Namespace Helpers
// --------------------------------------------

/**
 * Create a namespaced translator for a specific module
 * e.g., const tFinance = createModuleTranslator(messages, 'finance', 'id')
 * tFinance('invoices.title') → translates 'finance.invoices.title'
 */
export function createModuleTranslator(
    messages: Record<Locale, Messages>,
    module: string,
    locale: Locale = DEFAULT_LOCALE
) {
    return function tModule(key: TranslationKey): string {
        return getNestedValue(
            messages[locale] as Record<string, unknown>,
            `${module}.${key}`
        );
    };
}

// --------------------------------------------
// Formatting Helpers
// --------------------------------------------

/**
 * Format a number as currency (IDR by default)
 */
export function formatCurrency(
    amount: number,
    currency: string = 'IDR',
    locale: Locale = 'id'
): string {
    const localeMap: Record<Locale, string> = {
        id: 'id-ID',
        en: 'en-US',
    };

    try {
        return new Intl.NumberFormat(localeMap[locale], {
            style: 'currency',
            currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    } catch {
        return `${currency} ${amount.toLocaleString()}`;
    }
}

/**
 * Format a date string based on locale
 */
export function formatDate(
    date: Date | string,
    locale: Locale = 'id'
): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const localeMap: Record<Locale, string> = {
        id: 'id-ID',
        en: 'en-US',
    };

    try {
        return d.toLocaleDateString(localeMap[locale], {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    } catch {
        return d.toISOString().split('T')[0];
    }
}

/**
 * Format a datetime string based on locale
 */
export function formatDateTime(
    date: Date | string,
    locale: Locale = 'id'
): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const localeMap: Record<Locale, string> = {
        id: 'id-ID',
        en: 'en-US',
    };

    try {
        return d.toLocaleDateString(localeMap[locale], {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return d.toISOString();
    }
}

// --------------------------------------------
// Locale-aware status labels
// --------------------------------------------

export const STATUS_LABELS: Record<Locale, Record<string, string>> = {
    id: {
        // Invoice
        DRAFT: 'Draf',
        SENT: 'Terkirim',
        VIEWED: 'Dilihat',
        ACCEPTED: 'Diterima',
        REJECTED: 'Ditolak',
        EXPIRED: 'Kadaluarsa',
        CANCELLED: 'Dibatalkan',
        PAID: 'Dibayar',
        PARTIAL: 'Sebagian',
        UNPAID: 'Belum Dibayar',
        OVERDUE: 'Jatuh Tempo',
        // Quotation
        // Purchase Order
        CONFIRMED: 'Dikonfirmasi',
        RECEIVED: 'Diterima',
        COMPLETED: 'Selesai',
        // Payment
        PENDING: 'Menunggu',
        APPROVED: 'Disetujui',
        REJECTED_PAYMENT: 'Ditolak',
        // Employee
        ACTIVE: 'Aktif',
        INACTIVE: 'Non-aktif',
        PROBATION: 'Masa Percobaan',
        TERMINATED: 'Diberhentikan',
        RESIGNED: 'Mengundurkan Diri',
        // Leave
        SICK: 'Sakit',
        ANNUAL: 'Cuti Tahunan',
        PERSONAL: 'Cuti Pribadi',
        MATERNITY: 'Cuti Melahirkan',
        PARENTAL: 'Cuti Orang Tua',
        UNPAID_LEAVE: 'Cuti Tanpa Gaji',
        OTHER: 'Lainnya',
        // Attendance
        PRESENT: 'Hadir',
        ABSENT: 'Tidak Hadir',
        LATE: 'Terlambat',
        HALF_DAY: 'Setengah Hari',
        // Subscription
        TRIAL: 'Uji Coba',
        ACTIVE_SUB: 'Aktif',
        PAST_DUE: 'Jatuh Tempo',
        CANCELED: 'Dibatalkan',
        // Billing
        WAITING_APPROVAL: 'Menunggu Persetujuan',
        APPROVED_BILLING: 'Disetujui',
        REJECTED_BILLING: 'Ditolak',
    },
    en: {
        // Invoice
        DRAFT: 'Draft',
        SENT: 'Sent',
        VIEWED: 'Viewed',
        ACCEPTED: 'Accepted',
        REJECTED: 'Rejected',
        EXPIRED: 'Expired',
        CANCELLED: 'Cancelled',
        PAID: 'Paid',
        PARTIAL: 'Partial',
        UNPAID: 'Unpaid',
        OVERDUE: 'Overdue',
        // Purchase Order
        CONFIRMED: 'Confirmed',
        RECEIVED: 'Received',
        COMPLETED: 'Completed',
        // Payment
        PENDING: 'Pending',
        APPROVED: 'Approved',
        REJECTED_PAYMENT: 'Rejected',
        // Employee
        ACTIVE: 'Active',
        INACTIVE: 'Inactive',
        PROBATION: 'Probation',
        TERMINATED: 'Terminated',
        RESIGNED: 'Resigned',
        // Leave
        SICK: 'Sick Leave',
        ANNUAL: 'Annual Leave',
        PERSONAL: 'Personal Leave',
        MATERNITY: 'Maternity Leave',
        PARENTAL: 'Parental Leave',
        UNPAID_LEAVE: 'Unpaid Leave',
        OTHER: 'Other',
        // Attendance
        PRESENT: 'Present',
        ABSENT: 'Absent',
        LATE: 'Late',
        HALF_DAY: 'Half Day',
        // Subscription
        TRIAL: 'Trial',
        ACTIVE_SUB: 'Active',
        PAST_DUE: 'Past Due',
        CANCELED: 'Canceled',
        // Billing
        WAITING_APPROVAL: 'Waiting Approval',
        APPROVED_BILLING: 'Approved',
        REJECTED_BILLING: 'Rejected',
    },
};

/**
 * Get a localized status label
 */
export function getStatusLabel(status: string, locale: Locale = 'id'): string {
    return STATUS_LABELS[locale][status] || status;
}

// --------------------------------------------
// Re-export messages (for shared access)
// --------------------------------------------

// Messages will be imported directly by consumers:
// import idMessages from '@qalcuity/i18n/messages/id.json';
// import enMessages from '@qalcuity/i18n/messages/en.json';
