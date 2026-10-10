/**
 * Inventory Demo Seed Module — Shared dataset source untuk SEMUA loader (C4–C6).
 *
 * Digunakan OLEH KEDUA loader sehingga menghasilkan data IDENTIK:
 *  - packages/db/prisma/seed.ts  → import { seedInventoryData } from "../../../apps/web/lib/seed-data/inventory"
 *  - apps/web/lib/seed-data/demo.ts → import { seedInventoryData } from "./inventory"
 *
 * Cakupan (plans/demo-data-enhancement.md §6.2 C4–C6):
 *  C4. Warehouse        — 2 gudang: GUDANG-PUSAT (isDefault=true) + GUDANG-CABANG,
 *                         setengah produk dihubungkan ke masing-masing warehouse.
 *  C5. StockMovement    — 60 gerakan deterministik: OPENING IN per produk (besar),
 *                         PO IN (ref "PO-…"), penjualan OUT (ref "INV-…"),
 *                         2 ADJUSTMENT. KONSISTEN: stok awal + ΣIN − ΣOUT + ΣADJ
 *                         === Product.stock (nilai akhir).
 *  C6. StockOpname      — 2 opname: 1 COMPLETED (1 item selisih kecil) + 1 DRAFT,
 *                         lengkap dengan StockOpnameItem.
 *
 * PRINSIP HARD:
 *  - Idempotent: Warehouse/StockOpname via @@unique (code / opnameNumber + tenantId);
 *    Product via @@unique (sku + tenantId); StockMovement (tanpa unique) via
 *    findFirst kunci bisnis (productId, type, reference).
 *  - Tanpa Math.random() — semua angka & tanggal deterministik dari tabel statis.
 *  - Setiap query menyaring tenantId.
 */

import type { Prisma } from '@prisma/client';
import { addDays, toUtcDate } from './finance';

/** Anchor date default — SAMA dengan finance.ts & crm.ts. */
export const INV_DEFAULT_ANCHOR_DATE = '2026-10-10';

// ============================================================
// 1. Dataset statis (single source of truth — C1/C4)
// ============================================================

// ─── Warehouse (2) ───────────────────────────────────────────

export interface InvWarehouseSpec {
    name: string;
    code: string;
    address: string;
    city: string;
    phone?: string;
    email?: string;
    manager?: string;
    isDefault: boolean;
}

export const INV_WAREHOUSES: readonly InvWarehouseSpec[] = [
    {
        name: 'Gudang Pusat',
        code: 'GUDANG-PUSAT',
        address: 'Jl. Industri Raya No. 1, Kawasan Pergudangan Cakung',
        city: 'Jakarta Timur',
        phone: '021-4600123',
        email: 'pusat@qalcuity.com',
        manager: 'Ahmad Hidayat',
        isDefault: true,
    },
    {
        name: 'Gudang Cabang',
        code: 'GUDANG-CABANG',
        address: 'Jl. Raya Bekasi Km 18, Terminallogistik Cikarang',
        city: 'Bekasi',
        phone: '021-8900456',
        email: 'cabang@qalcuity.com',
        manager: 'Lestari Putri',
        isDefault: false,
    },
];

// ─── Product (23 SKU) ────────────────────────────────────────
// categoryIdx → index CRM_CATEGORIES (crm.ts).
// warehouse → 'PUSAT' | 'CABANG' (setengah terhubung ke cabang — C4).

export interface InvProductSpec {
    sku: string;
    name: string;
    description: string;
    unit: string;
    price: number;
    cost: number;
    /** Nilai AKHIR stok (konsisten dengan ΣStockMovement — C5). */
    stock: number;
    minStock: number;
    categoryIdx: number;
    warehouse: 'PUSAT' | 'CABANG';
    /** true → produk jasa/tanpa stok fisik (tanpa StockMovement). */
    service?: boolean;
}

export const INV_PRODUCTS: readonly InvProductSpec[] = [
    { sku: 'WDG-001', name: 'Widget A', description: 'Widget standar untuk kebutuhan umum', unit: 'pcs', price: 150000, cost: 100000, stock: 150, minStock: 20, categoryIdx: 0, warehouse: 'PUSAT' },
    { sku: 'PRT-001', name: 'Part B', description: 'Komponen mesin tipe B', unit: 'pcs', price: 250000, cost: 180000, stock: 75, minStock: 10, categoryIdx: 1, warehouse: 'CABANG' },
    { sku: 'SVC-001', name: 'Service C', description: 'Layanan konsultasi teknis', unit: 'hour', price: 500000, cost: 300000, stock: 999, minStock: 0, categoryIdx: 2, warehouse: 'PUSAT', service: true },
    { sku: 'OFF-001', name: 'Printer Paper A4', description: 'Kertas printer ukuran A4', unit: 'rim', price: 45000, cost: 35000, stock: 200, minStock: 50, categoryIdx: 3, warehouse: 'PUSAT' },
    { sku: 'WDG-002', name: 'Widget Pro', description: 'Widget versi pro dengan fitur lengkap', unit: 'pcs', price: 250000, cost: 180000, stock: 8, minStock: 15, categoryIdx: 0, warehouse: 'CABANG' },
    { sku: 'ELC-001', name: 'Laptop ASUS VivoBook 14', description: 'Laptop 14 inch AMD Ryzen 5, 8GB RAM, 512GB SSD', unit: 'unit', price: 7500000, cost: 6200000, stock: 25, minStock: 5, categoryIdx: 0, warehouse: 'PUSAT' },
    { sku: 'ELC-002', name: 'Monitor LG 24 inch', description: 'Monitor LED IPS Full HD, HDMI/VGA', unit: 'unit', price: 2200000, cost: 1800000, stock: 40, minStock: 10, categoryIdx: 0, warehouse: 'PUSAT' },
    { sku: 'ELC-003', name: 'Keyboard Mechanical Logitech', description: 'Keyboard mechanical RGB, switch Blue', unit: 'pcs', price: 850000, cost: 600000, stock: 60, minStock: 15, categoryIdx: 0, warehouse: 'CABANG' },
    { sku: 'ELC-004', name: 'Mouse Wireless Logitech M331', description: 'Mouse wireless silent click, 1000 DPI', unit: 'pcs', price: 350000, cost: 220000, stock: 120, minStock: 30, categoryIdx: 0, warehouse: 'CABANG' },
    { sku: 'ELC-005', name: 'Printer Canon PIXMA G3010', description: 'Printer all-in-one, print/scan/copy, WiFi', unit: 'unit', price: 2800000, cost: 2200000, stock: 15, minStock: 5, categoryIdx: 0, warehouse: 'CABANG' },
    { sku: 'FUR-001', name: 'Meja Kerja Direktur', description: 'Meja kerja kayu jati, ukuran 160x80cm, laci 3', unit: 'unit', price: 4500000, cost: 3200000, stock: 10, minStock: 3, categoryIdx: 4, warehouse: 'PUSAT' },
    { sku: 'FUR-002', name: 'Kursi Ergonomis Kerja', description: 'Kursi putar ergonomis, adjustable height, armrest', unit: 'unit', price: 2500000, cost: 1800000, stock: 30, minStock: 10, categoryIdx: 4, warehouse: 'CABANG' },
    { sku: 'FUR-003', name: 'Rak Arsip Besi 4 Susun', description: 'Rak arsip besi, 4 susun, anti karat', unit: 'unit', price: 1200000, cost: 850000, stock: 20, minStock: 5, categoryIdx: 4, warehouse: 'CABANG' },
    { sku: 'OFF-002', name: 'Tinta Printer Canon GI-790', description: 'Tinta botol original Canon GI-790, Black', unit: 'botol', price: 120000, cost: 85000, stock: 150, minStock: 50, categoryIdx: 3, warehouse: 'PUSAT' },
    { sku: 'OFF-003', name: 'Binder Map A4', description: 'Map binder A4, 2 ring, warna biru', unit: 'pcs', price: 15000, cost: 8000, stock: 500, minStock: 100, categoryIdx: 3, warehouse: 'PUSAT' },
    { sku: 'OFF-004', name: 'Pulpen Pilot G2', description: 'Pulpen gel, 0.7mm, hitam', unit: 'pcs', price: 8000, cost: 4000, stock: 1000, minStock: 200, categoryIdx: 3, warehouse: 'PUSAT' },
    { sku: 'AUT-001', name: 'Oli Mesin Castrol GTX 10W-40', description: 'Oli mesin sintetik, 4 liter, API SN', unit: 'botol', price: 350000, cost: 250000, stock: 50, minStock: 15, categoryIdx: 5, warehouse: 'CABANG' },
    { sku: 'AUT-002', name: 'Aki GS Astra MF50L', description: 'Aki maintenance-free, 12V 45Ah', unit: 'pcs', price: 850000, cost: 650000, stock: 20, minStock: 5, categoryIdx: 5, warehouse: 'CABANG' },
    { sku: 'BLD-001', name: 'Semen Portland 50kg', description: 'Semen Portland PC-50, karung 50kg', unit: 'karung', price: 65000, cost: 50000, stock: 300, minStock: 100, categoryIdx: 8, warehouse: 'PUSAT' },
    { sku: 'BLD-002', name: 'Besi Beton 12mm', description: 'Besi beton ulir grade BJTP 24, per batang 12m', unit: 'batang', price: 95000, cost: 75000, stock: 200, minStock: 50, categoryIdx: 8, warehouse: 'PUSAT' },
    { sku: 'BLD-003', name: 'Cat Tembok Vinilex 5kg', description: 'Cat tembok water-based, warna putih, 5 liter', unit: 'kaleng', price: 280000, cost: 200000, stock: 80, minStock: 20, categoryIdx: 8, warehouse: 'CABANG' },
    { sku: 'SFT-001', name: 'Microsoft Office 365 Business', description: 'Langganan Office 365 1 tahun, 1 user', unit: 'license', price: 1800000, cost: 1200000, stock: 50, minStock: 10, categoryIdx: 7, warehouse: 'CABANG' },
    { sku: 'SFT-002', name: 'Antivirus ESET 1 Year', description: 'ESET Smart Security Premium, 1 tahun, 1 device', unit: 'license', price: 450000, cost: 300000, stock: 100, minStock: 20, categoryIdx: 7, warehouse: 'CABANG' },
];

// ─── StockMovement (38 eksplisit + 22 OPENING dihitung = 60) ─

export interface StockMovementSpec {
    sku: string;
    type: 'IN' | 'OUT' | 'ADJUSTMENT';
    /** Untuk ADJUSTMENT bernilai signed (negatif = stok berkurang). */
    quantity: number;
    reference: string;
    notes: string;
    /** Offset hari dari anchorDate (negatif = lampau) untuk createdAt. */
    dayOffset: number;
}

/** Gerakan non-OPENING (38) — OPENING IN diturunkan supaya konsisten dengan Product.stock. */
const OTHER_MOVEMENT_SPECS: readonly StockMovementSpec[] = [
    // ── PO IN (12) — penerimaan purchase order ──
    { sku: 'WDG-001', type: 'IN', quantity: 100, reference: 'PO-2026-001', notes: 'Penerimaan PO Widget A', dayOffset: -45 },
    { sku: 'PRT-001', type: 'IN', quantity: 50, reference: 'PO-2026-002', notes: 'Penerimaan PO Part B', dayOffset: -44 },
    { sku: 'ELC-001', type: 'IN', quantity: 20, reference: 'PO-2026-003', notes: 'Penerimaan PO Laptop ASUS', dayOffset: -43 },
    { sku: 'ELC-002', type: 'IN', quantity: 30, reference: 'PO-2026-004', notes: 'Penerimaan PO Monitor LG', dayOffset: -42 },
    { sku: 'ELC-003', type: 'IN', quantity: 40, reference: 'PO-2026-005', notes: 'Penerimaan PO Keyboard Mechanical', dayOffset: -40 },
    { sku: 'ELC-004', type: 'IN', quantity: 60, reference: 'PO-2026-006', notes: 'Penerimaan PO Mouse Wireless', dayOffset: -38 },
    { sku: 'OFF-002', type: 'IN', quantity: 80, reference: 'PO-2026-007', notes: 'Penerimaan PO Tinta Printer', dayOffset: -35 },
    { sku: 'OFF-003', type: 'IN', quantity: 200, reference: 'PO-2026-008', notes: 'Penerimaan PO Binder Map', dayOffset: -32 },
    { sku: 'OFF-004', type: 'IN', quantity: 500, reference: 'PO-2026-009', notes: 'Penerimaan PO Pulpen', dayOffset: -30 },
    { sku: 'BLD-001', type: 'IN', quantity: 200, reference: 'PO-2026-010', notes: 'Penerimaan PO Semen', dayOffset: -27 },
    { sku: 'BLD-002', type: 'IN', quantity: 100, reference: 'PO-2026-011', notes: 'Penerimaan PO Besi Beton', dayOffset: -24 },
    { sku: 'AUT-001', type: 'IN', quantity: 40, reference: 'PO-2026-012', notes: 'Penerimaan PO Oli Mesin', dayOffset: -21 },
    // ── INV OUT (24) — penjualan keluar ──
    { sku: 'WDG-001', type: 'OUT', quantity: 50, reference: 'INV-2026-001', notes: 'Penjualan ke PT Maju Jaya', dayOffset: -28 },
    { sku: 'WDG-001', type: 'OUT', quantity: 20, reference: 'INV-2026-002', notes: 'Penjualan ke CV Berkah Mandiri', dayOffset: -20 },
    { sku: 'PRT-001', type: 'OUT', quantity: 15, reference: 'INV-2026-003', notes: 'Penjualan ke PT Sejahtera Abadi', dayOffset: -26 },
    { sku: 'WDG-002', type: 'OUT', quantity: 3, reference: 'INV-2026-004', notes: 'Penjualan ke PT Nusantara Jaya', dayOffset: -22 },
    { sku: 'OFF-001', type: 'OUT', quantity: 30, reference: 'INV-2026-005', notes: 'Penjualan ke CV Sukses Mandiri', dayOffset: -18 },
    { sku: 'OFF-001', type: 'OUT', quantity: 25, reference: 'INV-2026-006', notes: 'Penjualan ke PT Harmoni Komputama', dayOffset: -12 },
    { sku: 'ELC-001', type: 'OUT', quantity: 5, reference: 'INV-2026-007', notes: 'Penjualan ke PT Telkom Indonesia', dayOffset: -16 },
    { sku: 'ELC-002', type: 'OUT', quantity: 10, reference: 'INV-2026-008', notes: 'Penjualan ke PT Astra International', dayOffset: -15 },
    { sku: 'ELC-003', type: 'OUT', quantity: 15, reference: 'INV-2026-009', notes: 'Penjualan ke PT Pertamina', dayOffset: -14 },
    { sku: 'ELC-004', type: 'OUT', quantity: 30, reference: 'INV-2026-010', notes: 'Penjualan ke CV Adil Makmur', dayOffset: -13 },
    { sku: 'ELC-005', type: 'OUT', quantity: 5, reference: 'INV-2026-011', notes: 'Penjualan ke PT PLN Indonesia', dayOffset: -11 },
    { sku: 'FUR-001', type: 'OUT', quantity: 3, reference: 'INV-2026-012', notes: 'Penjualan ke PT Bank Central Asia', dayOffset: -10 },
    { sku: 'FUR-002', type: 'OUT', quantity: 8, reference: 'INV-2026-013', notes: 'Penjualan ke PT Unilever Indonesia', dayOffset: -9 },
    { sku: 'FUR-003', type: 'OUT', quantity: 5, reference: 'INV-2026-014', notes: 'Penjualan ke PT Indofood Sukses Makmur', dayOffset: -8 },
    { sku: 'OFF-002', type: 'OUT', quantity: 40, reference: 'INV-2026-015', notes: 'Penjualan ke PT Surya Gemilang', dayOffset: -7 },
    { sku: 'OFF-003', type: 'OUT', quantity: 100, reference: 'INV-2026-016', notes: 'Penjualan ke UD Barokah Jaya', dayOffset: -6 },
    { sku: 'OFF-004', type: 'OUT', quantity: 200, reference: 'INV-2026-017', notes: 'Penjualan ke PT Garuda Teknologi', dayOffset: -5 },
    { sku: 'AUT-001', type: 'OUT', quantity: 20, reference: 'INV-2026-018', notes: 'Penjualan ke CV Mitra Sejati', dayOffset: -5 },
    { sku: 'AUT-002', type: 'OUT', quantity: 5, reference: 'INV-2026-019', notes: 'Penjualan ke PT Maju Terus Perkasa', dayOffset: -4 },
    { sku: 'BLD-001', type: 'OUT', quantity: 100, reference: 'INV-2026-020', notes: 'Penjualan ke CV Kencana Mulia', dayOffset: -4 },
    { sku: 'BLD-002', type: 'OUT', quantity: 50, reference: 'INV-2026-021', notes: 'Penjualan ke PT Bumi Damai Sejahtera', dayOffset: -3 },
    { sku: 'BLD-003', type: 'OUT', quantity: 20, reference: 'INV-2026-022', notes: 'Penjualan ke CV Global Tech', dayOffset: -3 },
    { sku: 'SFT-001', type: 'OUT', quantity: 10, reference: 'INV-2026-023', notes: 'Penjualan lisensi ke PT Maju Jaya', dayOffset: -2 },
    { sku: 'SFT-002', type: 'OUT', quantity: 25, reference: 'INV-2026-024', notes: 'Penjualan lisensi ke PT Telkom Indonesia', dayOffset: -2 },
    // ── ADJUSTMENT (2) — koreksi stok ──
    { sku: 'WDG-002', type: 'ADJUSTMENT', quantity: -1, reference: 'ADJ-2026-001', notes: 'Koreksi selisih stok Widget Pro (opname)', dayOffset: -10 },
    { sku: 'ELC-002', type: 'ADJUSTMENT', quantity: -3, reference: 'ADJ-2026-002', notes: 'Koreksi selisih stok Monitor LG (rusak)', dayOffset: -10 },
];

// ============================================================
// 2. Helper murni (deterministik — unit-tested)
// ============================================================

/**
 * Hitung stok awal (OPENING IN) agar konsisten dengan Product.stock (nilai akhir):
 *   finalStock = opening + ΣIN + ΣADJ − ΣOUT
 *   → opening  = finalStock − ΣIN − ΣADJ + ΣOUT
 */
export function computeOpeningQty(
    finalStock: number,
    otherMovements: readonly Pick<StockMovementSpec, 'type' | 'quantity'>[]
): number {
    let net = 0;
    for (const m of otherMovements) {
        if (m.type === 'OUT') net -= m.quantity;
        else net += m.quantity; // IN & ADJUSTMENT (signed)
    }
    return finalStock - net;
}

/**
 * Bangun daftar lengkap 60 StockMovementSpec (22 OPENING + 38 lainnya).
 * Setiap produk fisik mendapat tepi 1 OPENING IN; SVC-001 (layanan) tanpa gerakan.
 * Invarian (diuji unit test): untuk setiap SKU,
 *   opening + ΣIN + ΣADJ − ΣOUT === INV_PRODUCTS[].stock.
 */
export function buildStockMovementSpecs(): StockMovementSpec[] {
    const specs: StockMovementSpec[] = [];
    for (const product of INV_PRODUCTS) {
        if (product.service) continue;
        const others = OTHER_MOVEMENT_SPECS.filter((m) => m.sku === product.sku);
        const openingQty = computeOpeningQty(product.stock, others);
        specs.push({
            sku: product.sku,
            type: 'IN',
            quantity: openingQty,
            reference: 'OPENING-2026',
            notes: `Saldo awal ${product.name} (stock opname awal tahun)`,
            dayOffset: -120,
        });
        specs.push(...others);
    }
    return specs;
}

/** Stok akhir per SKU sesuai gerakan (konsisten dengan Product.stock). */
export function computeFinalStockBySku(
    specs: readonly StockMovementSpec[] = buildStockMovementSpecs()
): Map<string, number> {
    const net = new Map<string, number>();
    for (const spec of specs) {
        const current = net.get(spec.sku) ?? 0;
        net.set(spec.sku, spec.type === 'OUT' ? current - spec.quantity : current + spec.quantity);
    }
    return net;
}

// ─── StockOpname (2 — C6) ────────────────────────────────────

export interface StockOpnameItemSpec {
    sku: string;
    /** Selisih fisik vs sistem (physical − system); 0 = cocok. */
    difference: number;
    notes?: string;
}

export interface StockOpnameSpec {
    opnameNumber: string;
    status: 'DRAFT' | 'COMPLETED';
    opnameDate: string; // ISO
    notes?: string;
    items: readonly StockOpnameItemSpec[];
}

export const INV_OPNAMES: readonly StockOpnameSpec[] = [
    {
        opnameNumber: 'OPNAME-2026-001',
        status: 'COMPLETED',
        opnameDate: '2026-09-30',
        notes: 'Stock opname triwulan — Gudang Pusat',
        items: [
            { sku: 'WDG-001', difference: 0, notes: 'Sesuai sistem' },
            { sku: 'ELC-002', difference: -2, notes: 'Selisih 2 unit — 1 rusak tidak tercatat' },
            { sku: 'OFF-003', difference: 0, notes: 'Sesuai sistem' },
        ],
    },
    {
        opnameNumber: 'OPNAME-2026-002',
        status: 'DRAFT',
        opnameDate: '2026-10-10',
        notes: 'Stock opname rutin bulanan — Gudang Cabang (belum dihitung fisik)',
        items: [
            { sku: 'FUR-001', difference: 0 },
            { sku: 'AUT-002', difference: 0 },
        ],
    },
];

/** Total selisih per opname = Σ difference item. */
export function opnameTotalDifference(items: readonly StockOpnameItemSpec[]): number {
    return items.reduce((sum, item) => sum + item.difference, 0);
}

// ============================================================
// 3. Seeder (idempotent)
// ============================================================

export interface SeedInventoryOptions {
    tenantId: string;
    /** Hasil seedCrmData — untuk resolve categoryId dari nama kategori. */
    categories: readonly { id: string; name: string }[];
    /** ISO date string; default INV_DEFAULT_ANCHOR_DATE. */
    anchorDate?: string;
}

export interface InventoryProductRef {
    id: string;
    sku: string;
    name: string;
}

export interface SeedInventoryResult {
    counts: {
        warehouses: number;
        products: number;
        movements: number;
        opnames: number;
        opnameItems: number;
    };
    warehouses: { id: string; code: string }[];
    products: InventoryProductRef[];
}

/**
 * Seed dataset Inventory (Warehouse + Product + StockMovement + StockOpname)
 * untuk satu tenant — idempotent. Panggil SETELAH seedCrmData (butuh kategori).
 */
export async function seedInventoryData(
    db: Prisma.TransactionClient,
    options: SeedInventoryOptions
): Promise<SeedInventoryResult> {
    const { tenantId, categories } = options;
    const anchorDate = options.anchorDate ?? INV_DEFAULT_ANCHOR_DATE;
    const anchor = toUtcDate(anchorDate);

    // ─── Warehouses ──────────────────────────────────────────
    const warehouses: { id: string; code: string }[] = [];
    let warehousesCreated = 0;
    for (const spec of INV_WAREHOUSES) {
        const existing = await db.warehouse.findFirst({
            where: { code: spec.code, tenantId },
            select: { id: true, code: true },
        });
        if (existing) {
            warehouses.push(existing);
        } else {
            const created = await db.warehouse.create({
                data: {
                    name: spec.name,
                    code: spec.code,
                    address: spec.address,
                    city: spec.city,
                    phone: spec.phone,
                    email: spec.email,
                    manager: spec.manager,
                    isDefault: spec.isDefault,
                    tenantId,
                },
                select: { id: true, code: true },
            });
            warehouses.push(created);
            warehousesCreated += 1;
        }
    }
    const warehouseByCode = new Map(warehouses.map((w) => [w.code, w.id]));

    // ─── Products (resolve categoryId + warehouseId) ─────────
    const products: InventoryProductRef[] = [];
    let productsCreated = 0;
    let productsWarehouseLinked = 0;
    for (const spec of INV_PRODUCTS) {
        const category = categories[spec.categoryIdx];
        const warehouseId =
            spec.warehouse === 'PUSAT'
                ? warehouseByCode.get('GUDANG-PUSAT')
                : warehouseByCode.get('GUDANG-CABANG');

        const existing = await db.product.findFirst({
            where: { sku: spec.sku, tenantId },
            select: { id: true, sku: true, name: true, warehouseId: true },
        });
        if (existing) {
            // Pastikan produk lama ikut terhubung warehouse (C4) tanpa ubah stok.
            if (warehouseId && existing.warehouseId !== warehouseId) {
                await db.product.update({
                    where: { id: existing.id },
                    data: { warehouseId },
                });
                productsWarehouseLinked += 1;
            }
            products.push({ id: existing.id, sku: existing.sku, name: existing.name });
        } else {
            const created = await db.product.create({
                data: {
                    sku: spec.sku,
                    name: spec.name,
                    description: spec.description,
                    unit: spec.unit,
                    price: spec.price,
                    cost: spec.cost,
                    stock: spec.stock,
                    minStock: spec.minStock,
                    categoryId: category?.id,
                    warehouseId,
                    tenantId,
                },
                select: { id: true, sku: true, name: true },
            });
            products.push(created);
            productsCreated += 1;
        }
    }
    const productBySku = new Map(products.map((p) => [p.sku, p.id]));

    // ─── Stock Movements (60 — konsisten dengan Product.stock) ──
    const movementSpecs = buildStockMovementSpecs();
    let movementsCreated = 0;
    for (const spec of movementSpecs) {
        const productId = productBySku.get(spec.sku);
        if (!productId) continue; // defensif — SKU dijamin ada di INV_PRODUCTS

        const existing = await db.stockMovement.findFirst({
            where: { tenantId, productId, type: spec.type, reference: spec.reference },
            select: { id: true },
        });
        if (existing) continue;

        await db.stockMovement.create({
            data: {
                type: spec.type,
                quantity: spec.quantity,
                reference: spec.reference,
                notes: spec.notes,
                productId,
                tenantId,
                createdAt: addDays(anchor, spec.dayOffset),
            },
        });
        movementsCreated += 1;
    }

    // ─── Stock Opnames (2 + items — C6) ──────────────────────
    const finalStockBySku = computeFinalStockBySku(movementSpecs);
    let opnamesCreated = 0;
    let opnameItemsCreated = 0;
    for (const spec of INV_OPNAMES) {
        const existing = await db.stockOpname.findUnique({
            where: { opnameNumber_tenantId: { opnameNumber: spec.opnameNumber, tenantId } },
            select: { id: true },
        });
        if (existing) continue;

        const warehouseId =
            spec.opnameNumber === 'OPNAME-2026-001'
                ? warehouseByCode.get('GUDANG-PUSAT')
                : warehouseByCode.get('GUDANG-CABANG');
        const totalDifference = opnameTotalDifference(spec.items);

        // Defensif: SKU opname dijamin ada di INV_PRODUCTS; jika tidak, gagal jelas.
        const itemCreates = spec.items.map((item) => {
            const productId = productBySku.get(item.sku);
            if (!productId) {
                throw new Error(`[inventory] SKU opname tidak ditemukan: ${item.sku}`);
            }
            const systemQuantity = finalStockBySku.get(item.sku) ?? 0;
            return {
                systemQuantity,
                physicalQuantity: systemQuantity + item.difference,
                difference: item.difference,
                notes: item.notes,
                productId,
            };
        });

        await db.stockOpname.create({
            data: {
                opnameNumber: spec.opnameNumber,
                status: spec.status,
                opnameDate: toUtcDate(spec.opnameDate),
                notes: spec.notes,
                totalDifference,
                warehouseId,
                tenantId,
                items: { create: itemCreates },
            },
        });
        opnamesCreated += 1;
        opnameItemsCreated += spec.items.length;
    }

    return {
        counts: {
            warehouses: warehouses.length,
            products: products.length,
            movements: movementSpecs.length,
            opnames: INV_OPNAMES.length,
            opnameItems: INV_OPNAMES.reduce((sum, o) => sum + o.items.length, 0),
        },
        warehouses,
        products,
    };
}
