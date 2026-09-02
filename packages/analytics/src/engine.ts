// ============================================
// @qalcuity/analytics — Analytics Query Engine
// Builds and processes analytics queries
// ============================================

import type {
    AnalyticsQueryConfig,
    AnalyticsFilter,
    AnalyticsResult,
    AnalyticsRow,
    AnalyticsColumn,
    DateRange,
} from './types';

/**
 * Build a Prisma-compatible query from AnalyticsQueryConfig.
 * This is a query builder — it generates Prisma findMany options.
 *
 * @param config - The analytics query configuration
 * @returns Prisma-compatible query object
 */
export function buildAnalyticsQuery(config: AnalyticsQueryConfig): Record<string, unknown> {
    const where: Record<string, unknown> = {};

    // Apply filters
    if (config.filters && config.filters.length > 0) {
        for (const filter of config.filters) {
            where[filter.field] = buildFilterCondition(filter);
        }
    }

    // Apply date range
    if (config.dateRange) {
        where['createdAt'] = {
            gte: new Date(config.dateRange.from),
            lte: new Date(config.dateRange.to),
        };
    }

    // Build select
    const select: Record<string, boolean | Record<string, boolean>> = {};
    for (const dim of config.dimensions) {
        select[dim] = true;
    }
    for (const measure of config.measures) {
        select[measure] = true;
    }

    // Build orderBy
    const orderBy: Record<string, string>[] = [];
    if (config.orderBy) {
        for (const order of config.orderBy) {
            orderBy.push({ [order.field]: order.direction });
        }
    }

    return {
        where,
        select,
        orderBy: orderBy.length > 0 ? orderBy : undefined,
        take: config.limit || 1000,
        skip: config.offset || 0,
    };
}

/**
 * Build a Prisma filter condition from an AnalyticsFilter.
 *
 * @param filter - The analytics filter to convert
 * @returns Prisma-compatible filter condition
 */
function buildFilterCondition(filter: AnalyticsFilter): unknown {
    switch (filter.operator) {
        case 'eq':
            return filter.value;
        case 'neq':
            return { not: filter.value };
        case 'gt':
            return { gt: filter.value };
        case 'gte':
            return { gte: filter.value };
        case 'lt':
            return { lt: filter.value };
        case 'lte':
            return { lte: filter.value };
        case 'in':
            return { in: filter.value };
        case 'not_in':
            return { notIn: filter.value };
        case 'contains':
            return { contains: filter.value, mode: 'insensitive' };
        case 'starts_with':
            return { startsWith: filter.value, mode: 'insensitive' };
        case 'ends_with':
            return { endsWith: filter.value, mode: 'insensitive' };
        case 'between': {
            const [min, max] = filter.value as [number, number];
            return { gte: min, lte: max };
        }
        case 'is_null':
            return null;
        case 'is_not_null':
            return { not: null };
        default:
            return filter.value;
    }
}

/**
 * Process raw query results into AnalyticsResult format.
 * Groups by dimensions and aggregates measures.
 *
 * @param rawData - Raw rows from the database
 * @param config - The analytics query configuration
 * @param columns - Column definitions for the result
 * @returns Processed analytics result
 */
export function processAnalyticsResults(
    rawData: Record<string, unknown>[],
    config: AnalyticsQueryConfig,
    columns: AnalyticsColumn[]
): AnalyticsResult {
    const startTime = Date.now();

    // Group by dimensions
    const groups = new Map<string, Record<string, unknown>[]>();

    for (const row of rawData) {
        const groupKey = config.dimensions
            .map(dim => String(row[dim] || ''))
            .join('|');

        if (!groups.has(groupKey)) {
            groups.set(groupKey, []);
        }
        groups.get(groupKey)!.push(row);
    }

    // Aggregate measures per group
    const resultRows: AnalyticsRow[] = [];
    for (const [, groupRows] of groups) {
        const row: AnalyticsRow = {};

        // Set dimension values from first row
        for (const dim of config.dimensions) {
            row[dim] = (groupRows[0] as Record<string, unknown>)[dim] as string | number | boolean | null;
        }

        // Aggregate measures
        for (const measureId of config.measures) {
            const values = groupRows.map(r => Number((r as Record<string, unknown>)[measureId]) || 0);
            row[measureId] = aggregateValues(values, 'sum');
        }

        resultRows.push(row);
    }

    const executionTimeMs = Date.now() - startTime;

    return {
        data: resultRows,
        columns,
        metadata: {
            totalRows: resultRows.length,
            executionTimeMs,
            queryHash: generateQueryHash(config),
            generatedAt: new Date().toISOString(),
        },
    };
}

/**
 * Aggregate an array of numbers using the specified method.
 *
 * @param values - Array of numbers to aggregate
 * @param method - Aggregation method
 * @returns Aggregated value
 */
export function aggregateValues(
    values: number[],
    method: 'sum' | 'avg' | 'min' | 'max' | 'count'
): number {
    if (values.length === 0) return 0;

    switch (method) {
        case 'sum':
            return values.reduce((a, b) => a + b, 0);
        case 'avg':
            return values.reduce((a, b) => a + b, 0) / values.length;
        case 'min':
            return Math.min(...values);
        case 'max':
            return Math.max(...values);
        case 'count':
            return values.length;
        default:
            return values.reduce((a, b) => a + b, 0);
    }
}

/**
 * Build a time series from data, grouped by date granularity.
 *
 * @param data - Array of analytics rows
 * @param dateField - Field name containing the date
 * @param measureField - Field name containing the value to aggregate
 * @param granularity - Time granularity for grouping
 * @returns Time series with labels and values
 */
export function buildTimeSeries(
    data: AnalyticsRow[],
    dateField: string,
    measureField: string,
    granularity: 'day' | 'week' | 'month' | 'quarter' | 'year' = 'month'
): { labels: string[]; values: number[] } {
    const groups = new Map<string, number[]>();

    for (const row of data) {
        const date = new Date(row[dateField] as string);
        const key = truncateDate(date, granularity);

        if (!groups.has(key)) {
            groups.set(key, []);
        }
        groups.get(key)!.push(Number(row[measureField]) || 0);
    }

    const labels = Array.from(groups.keys()).sort();
    const values = labels.map(label =>
        aggregateValues(groups.get(label) || [], 'sum')
    );

    return { labels, values };
}

/**
 * Truncate a date to the specified granularity.
 *
 * @param date - The date to truncate
 * @param granularity - The granularity level
 * @returns Truncated date string
 */
function truncateDate(date: Date, granularity: string): string {
    switch (granularity) {
        case 'day':
            return date.toISOString().split('T')[0];
        case 'week': {
            const d = new Date(date);
            d.setDate(d.getDate() - d.getDay());
            return d.toISOString().split('T')[0];
        }
        case 'month':
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        case 'quarter':
            return `${date.getFullYear()}-Q${Math.ceil((date.getMonth() + 1) / 3)}`;
        case 'year':
            return `${date.getFullYear()}`;
        default:
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }
}

/**
 * Generate a simple hash for query caching.
 *
 * @param config - The analytics query configuration
 * @returns Hash string
 */
function generateQueryHash(config: AnalyticsQueryConfig): string {
    const str = JSON.stringify(config);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return `q_${Math.abs(hash).toString(36)}`;
}

/**
 * Calculate period-over-period change.
 *
 * @param current - Current period value
 * @param previous - Previous period value
 * @returns Change value and percentage
 */
export function calculateChange(
    current: number,
    previous: number
): { value: number; percent: number } {
    const change = current - previous;
    const percent = previous !== 0
        ? ((current - previous) / Math.abs(previous)) * 100
        : 0;
    return { value: change, percent: Math.round(percent * 100) / 100 };
}

/**
 * Calculate percentage from two numbers.
 *
 * @param part - The part value
 * @param total - The total value
 * @returns Percentage value
 */
export function calculatePercentage(part: number, total: number): number {
    return total !== 0 ? Math.round((part / total) * 100 * 100) / 100 : 0;
}
