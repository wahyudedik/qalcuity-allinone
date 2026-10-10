/**
 * Unit Test — Inventory Demo Seed Module (apps/web/lib/seed-data/inventory.ts)
 *
 * Menguji helper murni & invariant dataset statis (Subtask C4–C6):
 *  - Warehouse 2 (tepat 1 default), Product 23 SKU unik
 *  - INVARIAN KUNCI C5: untuk setiap SKU fisik,
 *      opening + ΣIN + ΣADJ − ΣOUT === INV_PRODUCTS[].stock
 *  - buildStockMovementSpecs() → 60 gerakan (22 OPENING + 38 eksplisit)
 *  - StockOpname 2 (1 COMPLETED selisih −2, 1 DRAFT nol)
 *
 * Jalankan: npx vitest run apps/web/__tests__/unit/lib/inventory-seed.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
    INV_DEFAULT_ANCHOR_DATE,
    INV_WAREHOUSES,
    INV_PRODUCTS,
    INV_OPNAMES,
    buildStockMovementSpecs,
    computeOpeningQty,
    computeFinalStockBySku,
    opnameTotalDifference,
    type StockMovementSpec,
} from '../../../lib/seed-data/inventory';
import { CRM_CATEGORIES } from '../../../lib/seed-data/crm';

// ============================================================
// Dataset — C4 Warehouse + Product
// ============================================================

describe('dataset INV_WAREHOUSES (C4)', () => {
    it('2 gudang, kode unik, tepat satu default (GUDANG-PUSAT)', () => {
        expect(INV_WAREHOUSES).toHaveLength(2);
        const codes = INV_WAREHOUSES.map((w) => w.code);
        expect(new Set(codes).size).toBe(2);
        expect(codes).toContain('GUDANG-PUSAT');
        expect(codes).toContain('GUDANG-CABANG');
        const defaults = INV_WAREHOUSES.filter((w) => w.isDefault);
        expect(defaults).toHaveLength(1);
        expect(defaults[0].code).toBe('GUDANG-PUSAT');
    });

    it('warehouse props lengkap (anchor konsisten)', () => {
        expect(INV_DEFAULT_ANCHOR_DATE).toBe('2026-10-10');
        for (const w of INV_WAREHOUSES) {
            expect(w.name.length).toBeGreaterThan(0);
            expect(w.address.length).toBeGreaterThan(0);
            expect(w.city.length).toBeGreaterThan(0);
        }
    });
});

describe('dataset INV_PRODUCTS (C4/C5)', () => {
    it('23 SKU unik dengan harga/biaya/stok wajar', () => {
        expect(INV_PRODUCTS).toHaveLength(23);
        const skus = INV_PRODUCTS.map((p) => p.sku);
        expect(new Set(skus).size).toBe(23);
        for (const p of INV_PRODUCTS) {
            expect(p.price).toBeGreaterThan(0);
            expect(p.cost).toBeGreaterThan(0);
            expect(p.stock).toBeGreaterThanOrEqual(0);
            expect(p.minStock).toBeGreaterThanOrEqual(0);
        }
    });

    it('categoryIdx selalu valid ke CRM_CATEGORIES', () => {
        for (const p of INV_PRODUCTS) {
            expect(p.categoryIdx).toBeGreaterThanOrEqual(0);
            expect(p.categoryIdx).toBeLessThan(CRM_CATEGORIES.length);
        }
    });

    it('warehouse hanya PUSAT/CABANG dan terdistribusi (setengah cabang)', () => {
        const valid = ['PUSAT', 'CABANG'];
        for (const p of INV_PRODUCTS) {
            expect(valid).toContain(p.warehouse);
        }
        const cabang = INV_PRODUCTS.filter((p) => p.warehouse === 'CABANG').length;
        // setengah dari 23 → 11 atau 12
        expect(cabang).toBeGreaterThanOrEqual(10);
        expect(cabang).toBeLessThanOrEqual(13);
    });

    it('tepat satu produk layanan (SVC-001) tanpa stok fisik', () => {
        const services = INV_PRODUCTS.filter((p) => p.service);
        expect(services).toHaveLength(1);
        expect(services[0].sku).toBe('SVC-001');
    });
});

// ============================================================
// Helper murni — C5 StockMovement
// ============================================================

describe('computeOpeningQty', () => {
    it('tanpa gerakan lain → opening = stok akhir', () => {
        expect(computeOpeningQty(100, [])).toBe(100);
    });

    it('menghitung mundur dari stok akhir (IN/ADJ signed, OUT subtract)', () => {
        const others: Pick<StockMovementSpec, 'type' | 'quantity'>[] = [
            { type: 'IN', quantity: 30 },
            { type: 'OUT', quantity: 20 },
            { type: 'ADJUSTMENT', quantity: -5 },
        ];
        // net = 30 − 20 − 5 = 5 → opening = 100 − 5 = 95
        expect(computeOpeningQty(100, others)).toBe(95);
    });

    it('hanya OUT → opening = stok akhir + ΣOUT', () => {
        expect(computeOpeningQty(50, [{ type: 'OUT', quantity: 15 }])).toBe(65);
    });
});

describe('buildStockMovementSpecs (C5)', () => {
    const specs = buildStockMovementSpecs();

    it('60 gerakan: 22 OPENING + 38 eksplisit', () => {
        expect(specs).toHaveLength(60);
        const opening = specs.filter((s) => s.reference === 'OPENING-2026');
        expect(opening).toHaveLength(22); // 23 SKU − 1 service
    });

    it('deterministik: dua panggilan menghasilkan spesifikasi identik', () => {
        expect(buildStockMovementSpecs()).toEqual(specs);
    });

    it('setiap produk fisik punya tepat 1 OPENING; SVC-001 tanpa gerakan', () => {
        const openingBySku = new Map<string, number>();
        for (const s of specs.filter((x) => x.reference === 'OPENING-2026')) {
            openingBySku.set(s.sku, (openingBySku.get(s.sku) ?? 0) + 1);
        }
        for (const p of INV_PRODUCTS) {
            if (p.service) {
                expect(specs.some((s) => s.sku === p.sku)).toBe(false);
            } else {
                expect(openingBySku.get(p.sku)).toBe(1);
            }
        }
    });

    it('semua quantity OPENING bernilai positif', () => {
        for (const s of specs.filter((x) => x.reference === 'OPENING-2026')) {
            expect(s.quantity).toBeGreaterThan(0);
        }
    });

    it('SKU pada gerakan selalu ada di INV_PRODUCTS', () => {
        const validSkus = new Set(INV_PRODUCTS.map((p) => p.sku));
        for (const s of specs) {
            expect(validSkus.has(s.sku)).toBe(true);
        }
    });

    it('type gerakan valid dan ADJUSTMENT bernilai signed', () => {
        for (const s of specs) {
            expect(['IN', 'OUT', 'ADJUSTMENT']).toContain(s.type);
        }
        for (const s of specs.filter((x) => x.type === 'ADJUSTMENT')) {
            expect(Number.isInteger(s.quantity)).toBe(true);
        }
    });
});

describe('INVARIAN KUNCI C5 — stok akhir gerakan === Product.stock', () => {
    it('untuk SETIAP SKU fisik: opening + ΣIN + ΣADJ − ΣOUT === INV_PRODUCTS[].stock', () => {
        const finalBySku = computeFinalStockBySku();
        for (const p of INV_PRODUCTS) {
            if (p.service) continue;
            expect(finalBySku.get(p.sku), `SKU ${p.sku}`).toBe(p.stock);
        }
    });

    it('SVC-001 (layanan) tidak punya gerakan stok', () => {
        const finalBySku = computeFinalStockBySku();
        expect(finalBySku.has('SVC-001')).toBe(false);
    });

    it('computeFinalStockBySku menghormati OUT sebagai pengurang (custom specs)', () => {
        const custom: StockMovementSpec[] = [
            { sku: 'X', type: 'IN', quantity: 10, reference: 'R1', notes: '', dayOffset: -1 },
            { sku: 'X', type: 'OUT', quantity: 4, reference: 'R2', notes: '', dayOffset: -1 },
            { sku: 'X', type: 'ADJUSTMENT', quantity: -1, reference: 'R3', notes: '', dayOffset: -1 },
        ];
        const map = computeFinalStockBySku(custom);
        expect(map.get('X')).toBe(5);
    });
});

// ============================================================
// Dataset + helper — C6 StockOpname
// ============================================================

describe('dataset INV_OPNAMES (C6)', () => {
    it('2 opname: 1 COMPLETED (3 item, selisih −2) + 1 DRAFT (2 item, nol)', () => {
        expect(INV_OPNAMES).toHaveLength(2);
        const numbers = INV_OPNAMES.map((o) => o.opnameNumber);
        expect(new Set(numbers).size).toBe(2);

        const completed = INV_OPNAMES.find((o) => o.status === 'COMPLETED')!;
        const draft = INV_OPNAMES.find((o) => o.status === 'DRAFT')!;
        expect(completed.opnameNumber).toBe('OPNAME-2026-001');
        expect(completed.items).toHaveLength(3);
        expect(opnameTotalDifference(completed.items)).toBe(-2);
        expect(draft.opnameNumber).toBe('OPNAME-2026-002');
        expect(draft.items).toHaveLength(2);
        expect(opnameTotalDifference(draft.items)).toBe(0);
    });

    it('setiap item opname menunjuk SKU valid', () => {
        const validSkus = new Set(INV_PRODUCTS.map((p) => p.sku));
        for (const op of INV_OPNAMES) {
            expect(op.opnameDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            for (const item of op.items) {
                expect(validSkus.has(item.sku), `SKU opname ${item.sku}`).toBe(true);
            }
        }
    });

    it('ada tepat 1 item dengan selisih fisik (bukan nol)', () => {
        const allItems = INV_OPNAMES.flatMap((o) => o.items);
        const withDiff = allItems.filter((i) => i.difference !== 0);
        expect(withDiff).toHaveLength(1);
        expect(withDiff[0].sku).toBe('ELC-002');
        expect(withDiff[0].difference).toBe(-2);
    });
});

describe('opnameTotalDifference', () => {
    it('menjumlahkan selisih semua item (negatif = kurang fisik)', () => {
        expect(opnameTotalDifference([{ sku: 'A', difference: 0 }, { sku: 'B', difference: -2 }])).toBe(-2);
        expect(opnameTotalDifference([{ sku: 'A', difference: 3 }])).toBe(3);
    });

    it('daftar kosong → 0', () => {
        expect(opnameTotalDifference([])).toBe(0);
    });
});
