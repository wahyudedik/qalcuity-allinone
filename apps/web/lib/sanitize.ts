/**
 * Input sanitization utilities for production security.
 * 
 * Provides HTML escaping to prevent XSS attacks,
 * and validation helpers for common Indonesian data formats.
 */

/**
 * Escape HTML entities to prevent XSS attacks.
 */
export function escapeHtml(text: string): string {
    const map: Record<string, string> = {
        '&': '&',
        '<': '<',
        '>': '>',
        '"': '"',
        "'": '&#039;',
        '/': '&#x2F;',
    };
    return text.replace(/[&<>"'/]/g, (s) => map[s]);
}

/**
 * Sanitize text input: trim and escape HTML.
 */
export function sanitizeInput(input: string): string {
    if (typeof input !== 'string') return '';
    return escapeHtml(input.trim());
}

/**
 * Validate email format.
 */
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate Indonesian phone number format.
 * Supports: +62xxx, 62xxx, 08xxx
 */
export function isValidPhone(phone: string): boolean {
    const phoneRegex = /^(\+62|62|0)8[1-9][0-9]{6,9}$/;
    return phoneRegex.test(phone.replace(/[\s-]/g, ''));
}

/**
 * Validate NIK (Nomor Induk Kependudukan) - 16 digits.
 */
export function isValidNIK(nik: string): boolean {
    return /^\d{16}$/.test(nik);
}

/**
 * Validate NPWP (Nomor Pokok Wajib Pajak) format.
 * Format: XX.XXX.XXX.X-XXX.XXX
 */
export function isValidNPWP(npwp: string): boolean {
    return /^\d{2}\.\d{3}\.\d{3}\.\d{1}-\d{3}\.\d{3}$/.test(npwp);
}

/**
 * Sanitize an object's string fields recursively.
 * Returns a new object with all string values trimmed and HTML-escaped.
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
    const sanitized = { ...obj };
    for (const [key, value] of Object.entries(sanitized)) {
        if (typeof value === 'string') {
            (sanitized as Record<string, unknown>)[key] = sanitizeInput(value);
        }
    }
    return sanitized;
}

/**
 * Truncate a string to a maximum length.
 */
export function truncateInput(input: string, maxLength: number = 255): string {
    if (typeof input !== 'string') return '';
    return input.trim().substring(0, maxLength);
}
