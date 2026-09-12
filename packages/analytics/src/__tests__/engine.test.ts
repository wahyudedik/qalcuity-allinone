/**
 * Analytics Engine Unit Tests
 *
 * Tests untuk core analytics logic:
 * - buildAnalyticsQuery: query building dengan filters, dateRange, orderBy
 * - aggregateValues: sum, avg, min, max, count
 * - calculateChange: period-over-period change
 * - buildTimeSeries: time series grouping
 * - processAnalyticsResults: grouping + aggregation
 * - calculatePercentage: percentage calculation
 *
 * Note: buildFilterCondition is private — tested indirectly via buildAnalyticsQuery.
 */

import { describe, it, expect } from 'vitest';
import {
    buildAnalyticsQuery,
    aggregateValues,
    calculateChange,
    buildTimeSeries,
    processAnalyticsResults,
    calculatePercentage,
} from '../engine';
import type { AnalyticsQueryConfig, AnalyticsColumn, AnalyticsRow } from '../types';

describe('AnalyticsEngine', () => {
    // ─── buildAnalyticsQuery + buildFilterCondition (indirect) ─────────────

    describe('buildAnalyticsQuery', () => {
        const baseConfig: AnalyticsQueryConfig = {
            dataset: 'finance',
            dimensions: ['category'],
            measures: ['amount'],
            filters: [],
        };

        it('should build basic query with dimensions and measures', () => {
            const result = buildAnalyticsQuery(baseConfig);
            expect(result).toHaveProperty('where');
            expect(result).toHaveProperty('select');
            expect(result.select).toEqual({ category: true, amount: true });
            expect(result.take).toBe(1000);
            expect(result.skip).toBe(0);
        });

        it('should apply eq filter → { fieldName: value }', () => {
            const config: AnalyticsQueryConfig = {
                ...baseConfig,
                filters: [{ field: 'status', operator: 'eq', value: 'active' }],
            };
            const result = buildAnalyticsQuery(config);
            expect((result.where as Record<string, unknown>).status).toBe('active');
        });

        it('should apply neq filter → { fieldName: { not: value } }', () => {
            const config: AnalyticsQueryConfig = {
                ...baseConfig,
                filters: [{ field: 'status', operator: 'neq', value: 'deleted' }],
            };
            const result = buildAnalyticsQuery(config);
            expect((result.where as Record<string, unknown>).status).toEqual({ not: 'deleted' });
        });

        it('should apply gt filter → { fieldName: { gt: value } }', () => {
            const config: AnalyticsQueryConfig = {
                ...baseConfig,
                filters: [{ field: 'amount', operator: 'gt', value: 100 }],
            };
            const result = buildAnalyticsQuery(config);
            expect((result.where as Record<string, unknown>).amount).toEqual({ gt: 100 });
        });

        it('should apply gte filter → { fieldName: { gte: value } }', () => {
            const config: AnalyticsQueryConfig = {
                ...baseConfig,
                filters: [{ field: 'amount', operator: 'gte', value: 50 }],
            };
            const result = buildAnalyticsQuery(config);
            expect((result.where as Record<string, unknown>).amount).toEqual({ gte: 50 });
        });

        it('should apply lt filter → { fieldName: { lt: value } }', () => {
            const config: AnalyticsQueryConfig = {
                ...baseConfig,
                filters: [{ field: 'amount', operator: 'lt', value: 200 }],
            };
            const result = buildAnalyticsQuery(config);
            expect((result.where as Record<string, unknown>).amount).toEqual({ lt: 200 });
        });

        it('should apply lte filter → { fieldName: { lte: value } }', () => {
            const config: AnalyticsQueryConfig = {
                ...baseConfig,
                filters: [{ field: 'amount', operator: 'lte', value: 150 }],
            };
            const result = buildAnalyticsQuery(config);
            expect((result.where as Record<string, unknown>).amount).toEqual({ lte: 150 });
        });

        it('should apply contains filter → { fieldName: { contains, mode: insensitive } }', () => {
            const config: AnalyticsQueryConfig = {
                ...baseConfig,
                filters: [{ field: 'name', operator: 'contains', value: 'test' }],
            };
            const result = buildAnalyticsQuery(config);
            expect((result.where as Record<string, unknown>).name).toEqual({ contains: 'test', mode: 'insensitive' });
        });

        it('should apply starts_with filter → { fieldName: { startsWith, mode: insensitive } }', () => {
            const config: AnalyticsQueryConfig = {
                ...baseConfig,
                filters: [{ field: 'name', operator: 'starts_with', value: 'hello' }],
            };
            const result = buildAnalyticsQuery(config);
            expect((result.where as Record<string, unknown>).name).toEqual({ startsWith: 'hello', mode: 'insensitive' });
        });

        it('should apply ends_with filter → { fieldName: { endsWith, mode: insensitive } }', () => {
            const config: AnalyticsQueryConfig = {
                ...baseConfig,
                filters: [{ field: 'name', operator: 'ends_with', value: 'world' }],
            };
            const result = buildAnalyticsQuery(config);
            expect((result.where as Record<string, unknown>).name).toEqual({ endsWith: 'world', mode: 'insensitive' });
        });

        it('should apply between filter → { fieldName: { gte: min, lte: max } }', () => {
            const config: AnalyticsQueryConfig = {
                ...baseConfig,
                filters: [{ field: 'amount', operator: 'between', value: [100, 500] }],
            };
            const result = buildAnalyticsQuery(config);
            expect((result.where as Record<string, unknown>).amount).toEqual({ gte: 100, lte: 500 });
        });

        it('should apply in filter → { fieldName: { in: array } }', () => {
            const config: AnalyticsQueryConfig = {
                ...baseConfig,
                filters: [{ field: 'status', operator: 'in', value: ['active', 'pending'] }],
            };
            const result = buildAnalyticsQuery(config);
            expect((result.where as Record<string, unknown>).status).toEqual({ in: ['active', 'pending'] });
        });

        it('should apply not_in filter → { fieldName: { notIn: array } }', () => {
            const config: AnalyticsQueryConfig = {
                ...baseConfig,
                filters: [{ field: 'status', operator: 'not_in', value: ['deleted', 'archived'] }],
            };
            const result = buildAnalyticsQuery(config);
            expect((result.where as Record<string, unknown>).status).toEqual({ notIn: ['deleted', 'archived'] });
        });

        it('should apply is_null filter → { fieldName: null }', () => {
            const config: AnalyticsQueryConfig = {
                ...baseConfig,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                filters: [{ field: 'deletedAt', operator: 'is_null', value: null as any }],
            };
            const result = buildAnalyticsQuery(config);
            expect((result.where as Record<string, unknown>).deletedAt).toBeNull();
        });

        it('should apply is_not_null filter → { fieldName: { not: null } }', () => {
            const config: AnalyticsQueryConfig = {
                ...baseConfig,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                filters: [{ field: 'deletedAt', operator: 'is_not_null', value: null as any }],
            };
            const result = buildAnalyticsQuery(config);
            expect((result.where as Record<string, unknown>).deletedAt).toEqual({ not: null });
        });

        it('should apply dateRange filter with createdAt gte/lte', () => {
            const config: AnalyticsQueryConfig = {
                ...baseConfig,
                dateRange: { from: '2024-01-01', to: '2024-12-31' },
            };
            const result = buildAnalyticsQuery(config);
            const where = result.where as Record<string, unknown>;
            expect(where.createdAt).toBeDefined();
            const createdAt = where.createdAt as { gte: Date; lte: Date };
            expect(createdAt.gte).toBeInstanceOf(Date);
            expect(createdAt.lte).toBeInstanceOf(Date);
        });

        it('should apply orderBy', () => {
            const config: AnalyticsQueryConfig = {
                ...baseConfig,
                orderBy: [{ field: 'amount', direction: 'desc' }],
            };
            const result = buildAnalyticsQuery(config);
            expect(result.orderBy).toEqual([{ amount: 'desc' }]);
        });

        it('should apply custom limit and offset', () => {
            const config: AnalyticsQueryConfig = {
                ...baseConfig,
                limit: 50,
                offset: 10,
            };
            const result = buildAnalyticsQuery(config);
            expect(result.take).toBe(50);
            expect(result.skip).toBe(10);
        });

        it('should have undefined orderBy when no orderBy specified', () => {
            const result = buildAnalyticsQuery(baseConfig);
            expect(result.orderBy).toBeUndefined();
        });
    });

    // ─── aggregateValues ───────────────────────────────────────────────────

    describe('aggregateValues', () => {
        it('should calculate sum correctly', () => {
            expect(aggregateValues([10, 20, 30], 'sum')).toBe(60);
        });

        it('should calculate avg correctly', () => {
            expect(aggregateValues([10, 20, 30], 'avg')).toBe(20);
        });

        it('should calculate min correctly', () => {
            expect(aggregateValues([30, 10, 20], 'min')).toBe(10);
        });

        it('should calculate max correctly', () => {
            expect(aggregateValues([30, 10, 20], 'max')).toBe(30);
        });

        it('should calculate count correctly', () => {
            expect(aggregateValues([10, 20, 30], 'count')).toBe(3);
        });

        it('should return 0 for empty array on all aggregates', () => {
            expect(aggregateValues([], 'sum')).toBe(0);
            expect(aggregateValues([], 'avg')).toBe(0);
            expect(aggregateValues([], 'min')).toBe(0);
            expect(aggregateValues([], 'max')).toBe(0);
            expect(aggregateValues([], 'count')).toBe(0);
        });
    });

    // ─── calculateChange ───────────────────────────────────────────────────

    describe('calculateChange', () => {
        it('should calculate positive change correctly', () => {
            const result = calculateChange(100, 80);
            expect(result).toEqual({ value: 20, percent: 25 });
        });

        it('should calculate zero change when values are equal', () => {
            const result = calculateChange(100, 100);
            expect(result).toEqual({ value: 0, percent: 0 });
        });

        it('should handle zero base (0 → 0)', () => {
            const result = calculateChange(0, 0);
            expect(result).toEqual({ value: 0, percent: 0 });
        });

        it('should handle non-zero base with current=0 (0 → 50)', () => {
            const result = calculateChange(0, 50);
            // previous=50, so percent = ((0-50)/50)*100 = -100
            expect(result).toEqual({ value: -50, percent: -100 });
        });

        it('should calculate negative change', () => {
            const result = calculateChange(50, 100);
            expect(result).toEqual({ value: -50, percent: -50 });
        });
    });

    // ─── buildTimeSeries ───────────────────────────────────────────────────

    describe('buildTimeSeries', () => {
        const sampleData: AnalyticsRow[] = [
            { date: '2024-01-15', amount: 100 },
            { date: '2024-01-20', amount: 200 },
            { date: '2024-02-10', amount: 150 },
            { date: '2024-03-05', amount: 300 },
        ];

        it('should group by month correctly', () => {
            const result = buildTimeSeries(sampleData, 'date', 'amount', 'month');
            expect(result.labels).toHaveLength(3);
            expect(result.values).toHaveLength(3);
            expect(result.values[0]).toBe(300); // Jan: 100 + 200
            expect(result.values[1]).toBe(150); // Feb: 150
            expect(result.values[2]).toBe(300); // Mar: 300
        });

        it('should group by year correctly', () => {
            const result = buildTimeSeries(sampleData, 'date', 'amount', 'year');
            expect(result.labels).toHaveLength(1);
            expect(result.labels[0]).toBe('2024');
            expect(result.values[0]).toBe(750); // All in 2024
        });

        it('should group by quarter correctly', () => {
            const result = buildTimeSeries(sampleData, 'date', 'amount', 'quarter');
            // Jan, Feb, Mar all in Q1 → 1 group
            expect(result.labels).toHaveLength(1);
            expect(result.labels[0]).toBe('2024-Q1');
            expect(result.values[0]).toBe(750);
        });

        it('should handle empty data', () => {
            const result = buildTimeSeries([], 'date', 'amount', 'month');
            expect(result.labels).toHaveLength(0);
            expect(result.values).toHaveLength(0);
        });
    });

    // ─── processAnalyticsResults ───────────────────────────────────────────

    describe('processAnalyticsResults', () => {
        const columns: AnalyticsColumn[] = [
            { key: 'category', name: 'Category', nameKey: 'category', type: 'dimension', dataType: 'string' },
            { key: 'amount', name: 'Amount', nameKey: 'amount', type: 'measure', dataType: 'number' },
        ];

        it('should aggregate simple sum across rows grouped by dimension', () => {
            const rawData = [
                { category: 'A', amount: 100 },
                { category: 'A', amount: 200 },
                { category: 'B', amount: 50 },
            ];
            const config: AnalyticsQueryConfig = {
                dataset: 'finance',
                dimensions: ['category'],
                measures: ['amount'],
                filters: [],
            };
            const result = processAnalyticsResults(rawData, config, columns);
            expect(result.data).toHaveLength(2);
            expect(result.metadata.totalRows).toBe(2);
            expect(result.columns).toBe(columns);
            // Group A: sum(100, 200) = 300
            const groupA = result.data.find(r => r.category === 'A');
            expect(groupA?.amount).toBe(300);
            // Group B: sum(50) = 50
            const groupB = result.data.find(r => r.category === 'B');
            expect(groupB?.amount).toBe(50);
        });

        it('should return empty result for empty raw data', () => {
            const config: AnalyticsQueryConfig = {
                dataset: 'finance',
                dimensions: ['category'],
                measures: ['amount'],
                filters: [],
            };
            const result = processAnalyticsResults([], config, columns);
            expect(result.data).toHaveLength(0);
            expect(result.metadata.totalRows).toBe(0);
        });
    });

    // ─── calculatePercentage ───────────────────────────────────────────────

    describe('calculatePercentage', () => {
        it('should calculate percentage correctly', () => {
            expect(calculatePercentage(25, 100)).toBe(25);
            expect(calculatePercentage(1, 3)).toBe(33.33);
        });

        it('should return 0 for zero total', () => {
            expect(calculatePercentage(0, 0)).toBe(0);
            expect(calculatePercentage(5, 0)).toBe(0);
        });

        it('should handle 100%', () => {
            expect(calculatePercentage(100, 100)).toBe(100);
        });
    });
});
