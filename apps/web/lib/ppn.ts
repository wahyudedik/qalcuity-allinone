/**
 * PPN/Tax Calculation Library
 * Replaces hardcoded tax rate calculations across the codebase.
 * 
 * When tax rates change (e.g., PPN 11% → 12%), only this file needs updating.
 */

export interface TaxCalculationResult {
    subtotal: number;
    discount: number;
    taxableAmount: number;      // subtotal - discount
    taxRatePercent: number;
    taxAmount: number;           // taxableAmount * taxRatePercent / 100
    total: number;               // taxableAmount + taxAmount
}

/**
 * Calculate tax (PPN/VAT) for a given subtotal.
 * This is the SINGLE source of truth for tax calculations.
 */
export function calculateTax(
    subtotal: number,
    taxRatePercent: number,
    discount: number = 0
): TaxCalculationResult {
    const taxableAmount = Math.max(0, subtotal - discount);
    const taxAmount = parseFloat((taxableAmount * taxRatePercent / 100).toFixed(2));
    const total = parseFloat((taxableAmount + taxAmount).toFixed(2));

    return {
        subtotal,
        discount,
        taxableAmount,
        taxRatePercent,
        taxAmount,
        total,
    };
}

/**
 * Reverse-calculate tax from a total that includes tax.
 * Useful when user enters total amount and we need to extract the tax.
 */
export function reverseCalculateTax(
    totalIncludingTax: number,
    taxRatePercent: number
): { subtotal: number; taxAmount: number } {
    // total = subtotal * (1 + taxRate/100)
    // subtotal = total / (1 + taxRate/100)
    const divisor = 1 + taxRatePercent / 100;
    const subtotal = parseFloat((totalIncludingTax / divisor).toFixed(2));
    const taxAmount = parseFloat((totalIncludingTax - subtotal).toFixed(2));
    return { subtotal, taxAmount };
}

/**
 * Fallback tax rate when no TaxRate is configured in the database.
 * Set to 0 (no tax) — user should configure tax rates via /dashboard/finance/tax-rates.
 *
 * To set a default tax rate for your tenant:
 * 1. Go to /dashboard/finance/tax-rates
 * 2. Create a tax rate (e.g., "PPN 11%", code: "PPN", rate: 11)
 * 3. Toggle "Default" on that tax rate
 * 4. All forms will auto-select this default rate
 */
export const DEFAULT_TAX_RATE = 0;

/**
 * @deprecated Use DEFAULT_TAX_RATE instead. Kept for backward compatibility during migration.
 */
export const DEFAULT_PPN_RATE = DEFAULT_TAX_RATE;

/**
 * Default PPh 23 rate for Indonesia.
 */
export const DEFAULT_PPH23_RATE = 2;

/**
 * Format tax rate for display (e.g., 11 → "11%", 1.5 → "1.5%")
 */
export function formatTaxRate(rate: number): string {
    return `${rate}%`;
}

/**
 * Format currency amount for display (Indonesian Rupiah).
 */
export function formatIDR(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}
