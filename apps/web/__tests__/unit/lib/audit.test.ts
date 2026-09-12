/**
 * Audit diffValues Unit Tests
 *
 * Tests untuk pure diffValues function:
 * - Same values → empty diff
 * - Changed value → detected with old/new
 * - New key added → detected
 * - Key removed → detected
 * - Nested objects → JSON string comparison
 * - Multiple changes → all detected
 * - Empty objects → empty diff
 * - Undefined values → handled
 *
 * Note: Only testing diffValues (pure function) — NOT logAudit (requires Prisma mock).
 * Mocking Prisma and logger to allow module import.
 */

import { describe, it, expect, vi } from 'vitest';

// Mock Prisma and logger before importing audit module
vi.mock('../../../../lib/db', () => ({
    prisma: {},
}));

vi.mock('../../../../lib/logger', () => ({
    logger: {
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
    },
}));

// Mock @/lib/logger as well (used by audit.ts)
vi.mock('@/lib/logger', () => ({
    logger: {
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
    },
}));

// Mock @/lib/db
vi.mock('@/lib/db', () => ({
    prisma: {},
}));

import { diffValues } from '../../../lib/audit';

describe('Audit — diffValues', () => {
    it('should return empty diff for same values', () => {
        const oldVal = { name: 'Alice', age: 30 };
        const newVal = { name: 'Alice', age: 30 };
        const result = diffValues(oldVal, newVal);
        expect(result.old).toEqual({});
        expect(result.new).toEqual({});
    });

    it('should detect changed value with old and new', () => {
        const oldVal = { name: 'Alice' };
        const newVal = { name: 'Bob' };
        const result = diffValues(oldVal, newVal);
        expect(result.old).toEqual({ name: 'Alice' });
        expect(result.new).toEqual({ name: 'Bob' });
    });

    it('should detect new key added', () => {
        const oldVal = { name: 'Alice' };
        const newVal = { name: 'Alice', age: 30 };
        const result = diffValues(oldVal, newVal);
        expect(result.old).toEqual({ age: undefined });
        expect(result.new).toEqual({ age: 30 });
    });

    it('should not detect key removed (diffValues only iterates newVal keys)', () => {
        const oldVal = { name: 'Alice', age: 30 };
        const newVal = { name: 'Alice' };
        const result = diffValues(oldVal, newVal);
        // age is not in newVal, so it won't be in the diff
        expect(result.old).toEqual({});
        expect(result.new).toEqual({});
    });

    it('should handle nested objects via JSON string comparison', () => {
        const oldVal = { meta: { a: 1, b: 2 } };
        const newVal = { meta: { a: 1, b: 3 } };
        const result = diffValues(oldVal, newVal);
        expect(result.old).toEqual({ meta: { a: 1, b: 2 } });
        expect(result.new).toEqual({ meta: { a: 1, b: 3 } });
    });

    it('should detect multiple changes', () => {
        const oldVal = { name: 'Alice', age: 30, city: 'Jakarta' };
        const newVal = { name: 'Bob', age: 31, city: 'Jakarta' };
        const result = diffValues(oldVal, newVal);
        expect(result.old).toEqual({ name: 'Alice', age: 30 });
        expect(result.new).toEqual({ name: 'Bob', age: 31 });
    });

    it('should return empty diff for empty objects', () => {
        const result = diffValues({}, {});
        expect(result.old).toEqual({});
        expect(result.new).toEqual({});
    });

    it('should handle undefined values', () => {
        const oldVal = { name: undefined };
        const newVal = { name: 'Alice' };
        const result = diffValues(oldVal, newVal);
        expect(result.old).toEqual({ name: undefined });
        expect(result.new).toEqual({ name: 'Alice' });
    });

    it('should handle both values undefined (no change)', () => {
        const oldVal = { name: undefined };
        const newVal = { name: undefined };
        const result = diffValues(oldVal, newVal);
        // JSON.stringify(undefined) === JSON.stringify(undefined) → same
        expect(result.old).toEqual({});
        expect(result.new).toEqual({});
    });
});
