// ============================================
// @qalcuity/analytics — Analytics Utilities
// Utility functions for analytics processing and formatting
// ============================================

import type { MetricFormat, KPIStatus, AnalyticsQueryConfig } from './types';

/**
 * Format a metric value based on its format type.
 *
 * @param value - The numeric value to format
 * @param format - The format type
 * @param options - Optional formatting options
 * @returns Formatted string
 */
export function formatMetricValue(
    value: number,
    format: MetricFormat,
    options?: { currency?: string; decimals?: number; locale?: string }
): string {
    const locale = options?.locale || 'id-ID';
    const decimals = options?.decimals ?? 2;

    switch (format) {
        case 'currency':
            return new Intl.NumberFormat(locale, {
                style: 'currency',
                currency: options?.currency || 'IDR',
                minimumFractionDigits: 0,
                maximumFractionDigits: decimals,
            }).format(value);

        case 'number':
            return new Intl.NumberFormat(locale, {
                minimumFractionDigits: 0,
                maximumFractionDigits: decimals,
            }).format(value);

        case 'percentage':
            return `${value.toFixed(decimals)}%`;

        case 'duration': {
            const hours = Math.floor(Math.abs(value) / 60);
            const minutes = Math.abs(value) % 60;
            return `${hours}h ${minutes}m`;
        }

        case 'count':
            return new Intl.NumberFormat(locale).format(Math.round(value));

        default:
            return String(value);
    }
}

/**
 * Get KPI status based on value, target, and thresholds.
 *
 * @param value - Current metric value
 * @param target - Target value
 * @param thresholds - Optional warning and critical thresholds
 * @returns KPI status
 */
export function getKPIStatus(
    value: number,
    target: number,
    thresholds?: { warning: number; critical: number }
): KPIStatus {
    if (target === 0) return 'on_target';

    const ratio = value / target;

    if (ratio >= 1) return 'above_target';

    if (thresholds) {
        if (ratio < (1 - thresholds.critical / 100)) return 'critical';
        if (ratio < (1 - thresholds.warning / 100)) return 'below_target';
    }

    if (ratio >= 0.9) return 'on_target';
    if (ratio >= 0.7) return 'below_target';
    return 'critical';
}

/**
 * Get status color for KPI.
 *
 * @param status - KPI status string
 * @returns Hex color code
 */
export function getKPIStatusColor(status: string): string {
    switch (status) {
        case 'above_target':
            return '#22c55e'; // green
        case 'on_target':
            return '#3b82f6'; // blue
        case 'below_target':
            return '#f59e0b'; // amber
        case 'critical':
            return '#ef4444'; // red
        default:
            return '#6b7280'; // gray
    }
}

/**
 * Generate a unique ID for analytics entities.
 *
 * @param prefix - Prefix for the ID
 * @returns Unique identifier string
 */
export function generateAnalyticsId(prefix: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}`;
}

/**
 * Validate analytics query configuration.
 *
 * @param config - The query configuration to validate
 * @returns Validation result with errors
 */
export function validateQueryConfig(
    config: AnalyticsQueryConfig
): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.dataset) {
        errors.push('Dataset is required');
    }

    if (!config.dimensions || config.dimensions.length === 0) {
        errors.push('At least one dimension is required');
    }

    if (!config.measures || config.measures.length === 0) {
        errors.push('At least one measure is required');
    }

    if (config.dimensions && config.dimensions.length > 5) {
        errors.push('Maximum 5 dimensions allowed');
    }

    if (config.measures && config.measures.length > 10) {
        errors.push('Maximum 10 measures allowed');
    }

    if (config.limit && config.limit > 10000) {
        errors.push('Maximum limit is 10,000 rows');
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Truncate text with ellipsis.
 *
 * @param text - The text to truncate
 * @param maxLength - Maximum character length
 * @returns Truncated text
 */
export function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
}

/**
 * Calculate trend direction from a series of values using linear regression.
 *
 * @param values - Array of numeric values over time
 * @returns Trend direction and strength
 */
export function calculateTrend(
    values: number[]
): { direction: 'up' | 'down' | 'flat'; strength: number } {
    if (values.length < 2) return { direction: 'flat', strength: 0 };

    const n = values.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    for (let i = 0; i < n; i++) {
        sumX += i;
        sumY += values[i];
        sumXY += i * values[i];
        sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const avgY = sumY / n;
    const strength = avgY !== 0 ? Math.abs(slope / avgY) * 100 : 0;

    if (Math.abs(slope) < 0.001) return { direction: 'flat', strength: 0 };
    return {
        direction: slope > 0 ? 'up' : 'down',
        strength: Math.min(100, Math.round(strength * 100) / 100),
    };
}
