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
 * Default PPN rate for Indonesia (as of 2025).
 * Used as fallback when no TaxRate record is configured.
 * 
 * NOTE: This constant exists only as a safety net.
 * The preferred approach is to fetch the default TaxRate from the database
 * via GET /api/finance/tax-rates?active=true and let the user select.
 */
export const DEFAULT_PPN_RATE = 11;

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
