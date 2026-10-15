/**
 * Community Depreciation Unit Tests (Fase 4B)
 *
 * Tests untuk computeAssetBookValue (informasi, ADR-026):
 * - Tanpa biaya perolehan -> bookValue null
 * - Tanpa tanggal perolehan -> bookValue null
 * - Lewat umur pakai -> bookValue 0 (floor)
 * - Mid-life: karpet PERABOT 34/120 bulan sesuai formula straight-line
 * - Kategori tak dikenal -> fallback LAINNYA (5 tahun)
 *
 * Mock pattern mengikuti sod-enforcement.test.ts: mock BOTH relative dan
 * @/ alias path karena community.ts import './db'.
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../lib/db', () => ({
    prisma: {},
}));
vi.mock('@/lib/db', () => ({
    prisma: {},
}));

import {
    computeAssetBookValue,
    ASSET_USEFUL_LIFE_YEARS,
} from '../../../lib/community';

/** 34 bulan lalu dari hari ini — elapsedMonths pasti 34 (bulan saja, abaikan hari). */
function monthsAgo(months: number): Date {
    const d = new Date();
    d.setMonth(d.getMonth() - months);
    return d;
}

describe('Community Depreciation (computeAssetBookValue)', () => {
    it('bookValue null bila tanpa biaya perolehan', () => {
        const result = computeAssetBookValue({
            category: 'PERABOT',
            acquisitionCost: null,
            acquisitionDate: new Date('2023-12-01'),
        });
        expect(result.bookValue).toBeNull();
        expect(result.usefulLifeYears).toBe(10);
    });

    it('bookValue null bila tanpa tanggal perolehan', () => {
        const result = computeAssetBookValue({
            category: 'ELEKTRONIK',
            acquisitionCost: 5000000,
            acquisitionDate: null,
        });
        expect(result.bookValue).toBeNull();
        expect(result.usefulLifeYears).toBe(5);
    });

    it('bookValue 0 bila lewat umur pakai (BANGUNAN 20 thn, akuisisi 25 thn lalu)', () => {
        const result = computeAssetBookValue({
            category: 'BANGUNAN',
            acquisitionCost: 100000000,
            acquisitionDate: monthsAgo(25 * 12),
        });
        expect(result.bookValue).toBe(0);
        expect(result.usefulLifeYears).toBe(20);
    });

    it('mid-life karpet PERABOT: 34/120 bulan sesuai formula straight-line', () => {
        // Karpet AST/2026-012: cost 700.000, PERABOT (10 tahun = 120 bulan).
        const result = computeAssetBookValue({
            category: 'PERABOT',
            acquisitionCost: 700000,
            acquisitionDate: monthsAgo(34),
        });
        expect(result.usefulLifeYears).toBe(10);
        // bookValue = max(0, round(700000 × (1 − 34/120))) = round(501666.67) = 501667
        expect(result.bookValue).toBe(Math.round(700000 * (1 - 34 / 120)));
        expect(result.bookValue).toBe(501667);
    });

    it('kategori tak dikenal fallback ke LAINNYA (5 tahun)', () => {
        expect(ASSET_USEFUL_LIFE_YEARS.LAINNYA).toBe(5);
        const result = computeAssetBookValue({
            category: 'KATEGORI_TIDAK_DIKENAL',
            acquisitionCost: 1000000,
            acquisitionDate: monthsAgo(0),
        });
        expect(result.usefulLifeYears).toBe(5);
        // Bulan-0: belum ada pemakaian -> nilai buku penuh.
        expect(result.bookValue).toBe(1000000);
    });

    it('tabel umur pakai sesuai spesifikasi §5.2', () => {
        expect(ASSET_USEFUL_LIFE_YEARS.ELEKTRONIK).toBe(5);
        expect(ASSET_USEFUL_LIFE_YEARS.PERABOT).toBe(10);
        expect(ASSET_USEFUL_LIFE_YEARS.KENDARAAN).toBe(5);
        expect(ASSET_USEFUL_LIFE_YEARS.ALAT).toBe(8);
        expect(ASSET_USEFUL_LIFE_YEARS.BANGUNAN).toBe(20);
        expect(ASSET_USEFUL_LIFE_YEARS.LAINNYA).toBe(5);
    });

    it('akuisisi bulan ini (0 bulan pemakaian) -> nilai buku penuh', () => {
        const result = computeAssetBookValue({
            category: 'ALAT',
            acquisitionCost: 2200000,
            acquisitionDate: monthsAgo(0),
        });
        expect(result.usefulLifeYears).toBe(8);
        expect(result.bookValue).toBe(2200000);
    });
});
