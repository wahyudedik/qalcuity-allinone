/**
 * Demo Data Seed Function (runtime loader)
 *
 * Generates realistic Indonesian business data for a tenant.
 * Safe to run multiple times — checks for existing data before inserting.
 *
 * Usage: loadDemoData(tenantId)
 *
 * Dataset CRM + Inventory + HR di-seed via shared modules sehingga HASIL IDENTIK
 * dengan `npx prisma db seed` (packages/db/prisma/seed.ts):
 * - crm.ts      → Categories (9), Contacts (23), Suppliers (9),
 *                 Leads (14), Deals (14), Activities (25)
 * - inventory.ts → Warehouses (2), Products (23), StockMovements (60),
 *                 StockOpnames (2 + items)
 * - hr.ts       → Departments (7), Employees (15), Payroll (90),
 *                 Attendance (~1.335 hari kerja), Leave Requests (16)
 * Dokumen (tetap di sini): Invoices (10), Payments (8), Quotations (6),
 * Purchase Orders (5) — memakai refs dari modul shared.
 * - Finance P0 via shared module (finance.ts):
 *   TaxRate (5), CoA (47 akun), JournalEntry ±129 (semua seimbang),
 *   Bill (7), Expense (12), AccountingPeriod (6), riwayat 6 bulan
 */

import { PrismaClient } from "@prisma/client";
import { calculateTax } from "../ppn";
import { ensureTaxRates, seedFinanceData, mulberry32 } from "./finance";
import { seedCrmData } from "./crm";
import { seedInventoryData } from "./inventory";
import { seedHrData } from "./hr";

const prisma = new PrismaClient();

// ─── Deterministik PRNG (jangan pakai Math.random untuk data seed) ──────────
// Seed tetap 42 → hasil identik di setiap run & setiap environment.
let demoRng: () => number = mulberry32(42);

function resetDemoRng(): void {
    demoRng = mulberry32(42);
}

// ─── Helper Functions ────────────────────────────────────────────────────────

function randomDecimal(min: number, max: number, decimals = 2): number {
    return parseFloat((demoRng() * (max - min) + min).toFixed(decimals));
}

function generateInvoiceNumber(index: number): string {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    return `INV-${year}${month}-${String(index).padStart(4, "0")}`;
}

function generatePONumber(index: number): string {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    return `PO-${year}${month}-${String(index).padStart(4, "0")}`;
}

function generateQuotationNumber(index: number): string {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    return `QUO-${year}${month}-${String(index).padStart(4, "0")}`;
}

function generatePaymentNumber(index: number): string {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    return `PAY-${year}${month}-${String(index).padStart(4, "0")}`;
}

// ─── Main Seed Function ──────────────────────────────────────────────────────

export interface DemoDataResult {
    success: boolean;
    message: string;
    counts: Record<string, number>;
}

export async function loadDemoData(tenantId: string): Promise<DemoDataResult> {
    const counts: Record<string, number> = {};

    try {
        // ─── DETERMINISTIC PRNG + TAX RATES ─────────────────────────────────
        resetDemoRng();
        const taxRates = await ensureTaxRates(prisma, tenantId);
        const ppnRate = taxRates.find((r) => r.code === "PPN-KELUARAN")?.rate ?? 11;
        counts.taxRates = taxRates.length;

        // ─── OPS DATASETS — shared modules (CRM → Inventory → HR) ────────────
        // Kanonik: apps/web/lib/seed-data/{crm,inventory,hr}.ts
        // Idempotent, deterministik (tanpa Math.random), tenant-scoped.
        // Dataset IDENTIK dengan packages/db/prisma/seed.ts (§6.0 #1).
        const opsUser =
            (await prisma.user.findUnique({ where: { email: "admin@qalcuity.com" } })) ??
            (await prisma.user.findFirst({ where: { tenantId }, orderBy: { createdAt: "asc" } }));
        const createdBy = opsUser?.id ?? "system";

        const crm = await seedCrmData(prisma, {
            tenantId,
            createdBy,
            anchorDate: "2026-10-10",
        });
        counts.categories = crm.counts.categories;
        counts.contacts = crm.counts.contacts;
        counts.suppliers = crm.counts.suppliers;
        counts.leads = crm.counts.leads;
        counts.deals = crm.counts.deals;
        counts.activities = crm.counts.activities;

        const inv = await seedInventoryData(prisma, {
            tenantId,
            categories: crm.categories,
            anchorDate: "2026-10-10",
        });
        counts.warehouses = inv.counts.warehouses;
        counts.products = inv.counts.products;
        counts.stockMovements = inv.counts.movements;
        counts.stockOpnames = inv.counts.opnames;
        counts.stockOpnameItems = inv.counts.opnameItems;

        const hr = await seedHrData(prisma, {
            tenantId,
            anchorDate: "2026-10-10",
        });
        counts.departments = hr.counts.departments;
        counts.employees = hr.counts.employees;
        counts.payrollRecords = hr.counts.payroll;
        counts.attendanceRecords = hr.counts.attendance;
        counts.leaveRequests = hr.counts.leaves;

        // Refs untuk dokumen di bawah (invoices / quotations / PO)
        const contacts = crm.contacts;
        const suppliers = crm.suppliers;

        // Products (23 SKU) + StockMovements (60, konsisten: opening + IN − OUT + ADJ = Product.stock)
        // + Warehouses (2) + StockOpnames (2 + items) kini di-seed via seedInventoryData().
        // Leads (14) + Deals (14) + Activities (25) kini di-seed via seedCrmData().

        // ─── INVOICES ────────────────────────────────────────────────────────
        const invoiceData = [
            { status: "PAID", daysAgo: 45, subtotal: 85000000, items: [{ desc: "Laptop ASUS VivoBook 14", qty: 10, price: 8500000 }] },
            { status: "PAID", daysAgo: 30, subtotal: 28000000, items: [{ desc: "Monitor LG 24 inch LED", qty: 10, price: 2800000 }] },
            { status: "SENT", daysAgo: 15, subtotal: 42500000, items: [{ desc: "Laptop ASUS VivoBook 14", qty: 5, price: 8500000 }] },
            { status: "DRAFT", daysAgo: 5, subtotal: 12500000, items: [{ desc: "Bearing SKF 6205", qty: 100, price: 125000 }] },
            { status: "OVERDUE", daysAgo: 60, subtotal: 25000000, items: [{ desc: "Gear Box Reducer 1:10", qty: 7, price: 3500000 }] },
            { status: "PAID", daysAgo: 20, subtotal: 6500000, items: [{ desc: "Kertas A4 70g (5 rim)", qty: 100, price: 65000 }] },
            { status: "SENT", daysAgo: 10, subtotal: 18500000, items: [{ desc: "Tinta Printer Canon GI-790", qty: 100, price: 185000 }] },
            { status: "PAID", daysAgo: 35, subtotal: 36000000, items: [{ desc: "Kursi Ergonomis Mesh", qty: 20, price: 1800000 }] },
            { status: "DRAFT", daysAgo: 2, subtotal: 7200000, items: [{ desc: "Semen Portland 50kg", qty: 100, price: 72000 }] },
            { status: "SENT", daysAgo: 7, subtotal: 18000000, items: [{ desc: "Microsoft Office 365 Biz (1 tahun)", qty: 10, price: 1800000 }] },
        ];

        const invoices = [];
        for (let i = 0; i < invoiceData.length; i++) {
            const inv = invoiceData[i];
            const invoiceNumber = generateInvoiceNumber(i + 1);
            const existing = await prisma.invoice.findFirst({
                where: { invoiceNumber, tenantId },
            });
            if (existing) {
                invoices.push(existing);
                continue;
            }

            const taxRate = ppnRate;
            const taxCalc = calculateTax(inv.subtotal, taxRate);
            const taxAmount = taxCalc.taxAmount;
            const total = taxCalc.total;
            const createdAt = new Date(Date.now() - inv.daysAgo * 24 * 60 * 60 * 1000);
            const dueDate = new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000);
            const contactId = contacts[i % contacts.length]?.id;

            const created = await prisma.invoice.create({
                data: {
                    invoiceNumber,
                    status: inv.status,
                    dueDate,
                    notes: `Invoice untuk ${contacts[i % contacts.length]?.name || "Customer"}`,
                    subtotal: inv.subtotal,
                    taxRate,
                    taxAmount,
                    total,
                    tenantId,
                    contactId,
                    createdAt,
                    items: {
                        create: inv.items.map((item) => ({
                            description: item.desc,
                            quantity: item.qty,
                            unitPrice: item.price,
                            total: item.qty * item.price,
                        })),
                    },
                },
            });
            invoices.push(created);
        }
        counts.invoices = invoices.length;

        // ─── PAYMENTS ────────────────────────────────────────────────────────
        const paidInvoices = invoices.filter((inv) => inv.status === "PAID");
        const payments = [];
        for (let i = 0; i < paidInvoices.length && i < 6; i++) {
            const paymentNumber = generatePaymentNumber(i + 1);
            const existing = await prisma.payment.findFirst({
                where: { paymentNumber, tenantId },
            });
            if (existing) {
                payments.push(existing);
                continue;
            }

            const created = await prisma.payment.create({
                data: {
                    paymentNumber,
                    amount: paidInvoices[i].total,
                    paymentDate: new Date(Date.now() - (30 + i * 5) * 24 * 60 * 60 * 1000),
                    method: ["BANK_TRANSFER", "CASH", "E_WALLET"][i % 3],
                    status: "COMPLETED",
                    type: "INCOME",
                    notes: `Pembayaran invoice ${paidInvoices[i].invoiceNumber}`,
                    tenantId,
                    invoiceId: paidInvoices[i].id,
                },
            });
            payments.push(created);
        }

        // Add a couple of expense payments
        for (let i = 0; i < 2; i++) {
            const paymentNumber = generatePaymentNumber(paidInvoices.length + i + 1);
            const existing = await prisma.payment.findFirst({
                where: { paymentNumber, tenantId },
            });
            if (!existing) {
                const created = await prisma.payment.create({
                    data: {
                        paymentNumber,
                        amount: randomDecimal(500000, 5000000),
                        paymentDate: new Date(Date.now() - (20 + i * 10) * 24 * 60 * 60 * 1000),
                        method: "BANK_TRANSFER",
                        status: "COMPLETED",
                        type: "EXPENSE",
                        notes: i === 0 ? "Pembayaran listrik bulanan" : "Pembayaran internet kantor",
                        tenantId,
                    },
                });
                payments.push(created);
            }
        }
        counts.payments = payments.length;

        // ─── QUOTATIONS ──────────────────────────────────────────────────────
        const quotationData = [
            { status: "DRAFT", subtotal: 85000000, discount: 5000000, items: [{ desc: "Laptop ASUS VivoBook 14", qty: 10, price: 8500000 }] },
            { status: "SENT", subtotal: 28000000, discount: 0, items: [{ desc: "Monitor LG 24 inch LED", qty: 10, price: 2800000 }] },
            { status: "ACCEPTED", subtotal: 42500000, discount: 2500000, items: [{ desc: "Laptop ASUS VivoBook 14", qty: 5, price: 8500000 }, { desc: "Keyboard Mechanical Logitech", qty: 5, price: 850000 }] },
            { status: "REJECTED", subtotal: 350000000, discount: 10000000, items: [{ desc: "Renovasi Kantor Lantai 3", qty: 1, price: 350000000 }] },
            { status: "SENT", subtotal: 55000000, discount: 0, items: [{ desc: "Gear Box Reducer 1:10", qty: 10, price: 3500000 }, { desc: "Bearing SKF 6205", qty: 100, price: 125000 }] },
            { status: "DRAFT", subtotal: 18000000, discount: 1000000, items: [{ desc: "Adobe Creative Cloud (1 tahun)", qty: 4, price: 4500000 }] },
        ];

        const quotations = [];
        for (let i = 0; i < quotationData.length; i++) {
            const quo = quotationData[i];
            const quotationNumber = generateQuotationNumber(i + 1);
            const existing = await prisma.quotation.findFirst({
                where: { quotationNumber, tenantId },
            });
            if (existing) {
                quotations.push(existing);
                continue;
            }

            const taxRate = ppnRate;
            const taxCalc = calculateTax(quo.subtotal, taxRate, quo.discount);
            const taxAmount = taxCalc.taxAmount;
            const total = taxCalc.total;
            const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            const contactId = contacts[i % contacts.length]?.id;

            const created = await prisma.quotation.create({
                data: {
                    quotationNumber,
                    status: quo.status,
                    validUntil,
                    notes: `Penawaran untuk ${contacts[i % contacts.length]?.name || "Customer"}`,
                    subtotal: quo.subtotal,
                    taxRate,
                    taxAmount,
                    discount: quo.discount,
                    total,
                    tenantId,
                    contactId,
                    items: {
                        create: quo.items.map((item) => ({
                            description: item.desc,
                            quantity: item.qty,
                            unitPrice: item.price,
                            total: item.qty * item.price,
                        })),
                    },
                },
            });
            quotations.push(created);
        }
        counts.quotations = quotations.length;

        // ─── PURCHASE ORDERS ─────────────────────────────────────────────────
        const poData = [
            { status: "RECEIVED", daysAgo: 40, subtotal: 85000000, items: [{ desc: "Laptop ASUS VivoBook 14", qty: 10, price: 7200000 }] },
            { status: "SENT", daysAgo: 15, subtotal: 12500000, items: [{ desc: "Bearing SKF 6205", qty: 100, price: 85000 }] },
            { status: "DRAFT", daysAgo: 3, subtotal: 50000000, items: [{ desc: "Kursi Ergonomis Mesh", qty: 30, price: 1200000 }] },
            { status: "RECEIVED", daysAgo: 25, subtotal: 25000000, items: [{ desc: "Gear Box Reducer 1:10", qty: 10, price: 2800000 }] },
            { status: "RECEIVED", daysAgo: 7, subtotal: 7200000, items: [{ desc: "Semen Portland 50kg", qty: 100, price: 58000 }] },
        ];

        const purchaseOrders = [];
        for (let i = 0; i < poData.length; i++) {
            const po = poData[i];
            const poNumber = generatePONumber(i + 1);
            const existing = await prisma.purchaseOrder.findFirst({
                where: { poNumber, tenantId },
            });
            if (existing) {
                purchaseOrders.push(existing);
                continue;
            }

            const taxRate = ppnRate;
            const taxCalc = calculateTax(po.subtotal, taxRate);
            const taxAmount = taxCalc.taxAmount;
            const total = taxCalc.total;
            const createdAt = new Date(Date.now() - po.daysAgo * 24 * 60 * 60 * 1000);
            const deliveryDate = new Date(createdAt.getTime() + 14 * 24 * 60 * 60 * 1000);
            const supplierId = suppliers[i % suppliers.length]?.id;

            const created = await prisma.purchaseOrder.create({
                data: {
                    poNumber,
                    status: po.status,
                    orderDate: createdAt,
                    deliveryDate,
                    notes: `PO ke ${suppliers[i % suppliers.length]?.name || "Supplier"}`,
                    subtotal: po.subtotal,
                    taxRate,
                    taxAmount,
                    total,
                    tenantId,
                    supplierId,
                    items: {
                        create: po.items.map((item) => ({
                            description: item.desc,
                            quantity: item.qty,
                            unitPrice: item.price,
                            total: item.qty * item.price,
                        })),
                    },
                },
            });
            purchaseOrders.push(created);
        }
        counts.purchaseOrders = purchaseOrders.length;

        // Employees (15) + Departments (7) + Payroll (6 periode × 15 = 90)
        // + Attendance (90 hari kerja, deterministik) + Leave Requests (16, mix status)
        // kini di-seed via seedHrData() — jurnal payroll dibaca seedFinanceData dari DB.

        // ─── FINANCE P0: CoA + Journal + Bill + Expense + Periods ────────────
        // `createdBy` sudah didefinisikan di blok OPS DATASETS di atas.
        const fin = await seedFinanceData(prisma, { tenantId, createdBy });
        counts.taxRates = fin.taxRatesCreated;
        counts.coaAccounts = fin.coaAccountsCreated;
        counts.historicalInvoices = fin.historicalInvoicesCreated;
        counts.historicalPayments = fin.historicalPaymentsCreated;
        counts.bills = fin.billsCreated;
        counts.expenses = fin.expensesCreated;
        counts.journalEntries = fin.journalEntriesCreated;
        counts.journalItems = fin.journalItemsCreated;
        counts.journalEntriesSkipped = fin.journalEntriesSkipped;
        counts.accountingPeriods = fin.periodsCreated;
        if (fin.warnings.length > 0) {
            console.warn("[Demo Seed] Finance warnings:", fin.warnings);
        }

        return {
            success: true,
            message: "Demo data berhasil dimuat!",
            counts,
        };
    } catch (error) {
        console.error("[Demo Seed] Error:", error);
        return {
            success: false,
            message: error instanceof Error ? error.message : "Gagal memuat demo data",
            counts,
        };
    }
}

/**
 * Check if a tenant already has data (contacts, products, invoices, etc.)
 */
export async function tenantHasData(tenantId: string): Promise<boolean> {
    const [contactCount, productCount, invoiceCount] = await Promise.all([
        prisma.contact.count({ where: { tenantId } }),
        prisma.product.count({ where: { tenantId } }),
        prisma.invoice.count({ where: { tenantId } }),
    ]);
    return contactCount > 0 || productCount > 0 || invoiceCount > 0;
}
