export function cn(...classes: (string | boolean | undefined | null)[]) {
    return classes.filter(Boolean).join(" ");
}

export function formatCurrency(amount: number, currency = "IDR"): string {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

export function formatDate(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(d);
}

export function formatDateTime(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(d);
}

export function formatNumber(num: number): string {
    return new Intl.NumberFormat("id-ID").format(num);
}

export function generateId(): string {
    return Math.random().toString(36).substring(2, 15);
}

export function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^\w ]+/g, "")
        .replace(/ +/g, "-");
}

export function truncate(text: string, length: number): string {
    if (text.length <= length) return text;
    return text.substring(0, length) + "...";
}

export function getInitials(name: string): string {
    return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2);
}

/**
 * Convert a Prisma Decimal / string / number to a safe JavaScript number.
 *
 * Prisma `Decimal` fields must not be arithmetically mixed with `number`
 * directly — TypeScript rejects `Decimal + number`. Always coerce through
 * this helper before arithmetic, comparison, or JSON serialization.
 *
 * Handles:
 * - `null` / `undefined` → `0`
 * - `number` → returned as-is
 * - `string` (e.g. `"1000000.0000"`) → parsed via `parseFloat`
 * - Prisma `Decimal` objects (duck-typed via `toNumber()` method)
 *
 * Usable from Web (`apps/web`), Mobile (`apps/mobile`), and Desktop —
 * no Prisma import required (duck-typing keeps this package dependency-free).
 *
 * @example
 * const total = decimalToNumber(invoice.total) + decimalToNumber(payment.amount)
 */
export function decimalToNumber(value: unknown): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return parseFloat(value) || 0;
    // Prisma Decimal objects expose a toNumber() method
    if (
        typeof value === 'object' &&
        value !== null &&
        'toNumber' in value &&
        typeof (value as { toNumber: () => number }).toNumber === 'function'
    ) {
        return (value as { toNumber: () => number }).toNumber();
    }
    return 0;
}

/**
 * Semantic alias of {@link decimalToNumber} for monetary / aggregate values
 * (invoice totals, payment amounts, `_sum` aggregates, etc.).
 *
 * @example
 * const totalPaid = payments.reduce((sum, p) => sum + safeDecimal(p.amount), 0)
 */
export function safeDecimal(value: unknown): number {
    return decimalToNumber(value);
}
