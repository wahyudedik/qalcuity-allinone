// ─── Smart Data Resolver ─────────────────────────────────────────────────────
// Replaces the keyword-based resolveQueryContext() with NLU-aware data fetching.
// Builds appropriate Prisma queries based on intent + entities from NLU parser.
// Supports 8+ data domains: invoice, payment, contact, product, employee,
// purchaseOrder, journalEntry, quotation, lead, deal.

import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import type { NLUParseResult, ExtractedEntity, TimePeriod, ModuleName, IntentType } from './nlu-parser';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ResolvedDataContext {
    /** Module name that was queried */
    moduleName: string;
    /** Human-readable description of the data context */
    description: string;
    /** The actual data (formatted string for AI context) */
    data: string;
    /** Raw data for potential further processing */
    raw?: Record<string, unknown>[];
}

export interface DataResolverOptions {
    tenantId: string;
    nluResult: NLUParseResult;
    /** Optional override module from request */
    requestModule?: string;
}

// ─── Time Range Builder ──────────────────────────────────────────────────────

/**
 * Build a Prisma-compatible date filter from a TimePeriod entity.
 * Returns an object suitable for Prisma's `where` clause: `{ gte: Date, lte: Date }`
 */
function buildDateFilter(timePeriod: TimePeriod | undefined): { gte: Date; lte: Date } | undefined {
    if (!timePeriod) return undefined;
    return {
        gte: timePeriod.startDate,
        lte: timePeriod.endDate,
    };
}

/**
 * Build status filter from extracted statuses.
 */
function buildStatusFilter(statuses: string[] | undefined): string | { in: string[] } | undefined {
    if (!statuses || statuses.length === 0) return undefined;
    if (statuses.length === 1) return statuses[0];
    return { in: statuses };
}

// ─── Data Domain Resolvers ───────────────────────────────────────────────────

/**
 * Resolve invoice-related data based on NLU entities.
 */
async function resolveInvoiceData(
    tenantId: string,
    entities: ExtractedEntity,
    intent: IntentType
): Promise<ResolvedDataContext> {
    const dateFilter = buildDateFilter(entities.timePeriod);
    const statusFilter = buildStatusFilter(entities.status);
    const limit = entities.limit ?? (intent === 'AGGREGATE' ? 200 : 20);

    const where: Record<string, unknown> = { tenantId };
    if (dateFilter) where.createdAt = dateFilter;
    if (statusFilter) where.status = statusFilter;

    if (intent === 'AGGREGATE') {
        // Fetch all matching invoices for aggregation
        const invoices = await prisma.invoice.findMany({
            where,
            select: {
                total: true,
                status: true,
                createdAt: true,
                dueDate: true,
                contactId: true,
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });

        const totalRevenue = invoices.reduce((sum, inv) => sum + Number(inv.total), 0);
        const statusCounts = invoices.reduce(
            (acc, inv) => {
                acc[inv.status] = (acc[inv.status] || 0) + 1;
                return acc;
            },
            {} as Record<string, number>
        );

        const avgInvoice = invoices.length > 0 ? totalRevenue / invoices.length : 0;

        let aggregationText = '';
        if (entities.aggregationType === 'count') {
            aggregationText = `Jumlah Invoice: ${invoices.length}`;
        } else if (entities.aggregationType === 'average') {
            aggregationText = `Rata-rata Invoice: Rp ${avgInvoice.toLocaleString('id-ID')}`;
        } else if (entities.aggregationType === 'max') {
            const maxInv = invoices.reduce((max, inv) => (Number(inv.total) > Number(max.total) ? inv : max), invoices[0]);
            aggregationText = maxInv ? `Invoice Terbesar: Rp ${Number(maxInv.total).toLocaleString('id-ID')}` : 'Tidak ada data';
        } else if (entities.aggregationType === 'min') {
            const minInv = invoices.reduce((min, inv) => (Number(inv.total) < Number(min.total) ? inv : min), invoices[0]);
            aggregationText = minInv ? `Invoice Terkecil: Rp ${Number(minInv.total).toLocaleString('id-ID')}` : 'Tidak ada data';
        } else {
            aggregationText = `Total Revenue: Rp ${totalRevenue.toLocaleString('id-ID')}`;
        }

        const timeLabel = entities.timePeriod ? ` (${entities.timePeriod.label})` : '';

        return {
            moduleName: 'invoice',
            description: `Aggregasi data invoice${timeLabel}`,
            data: `KONTEKS DATA AKTUAL (Invoice Aggregasi):
- ${aggregationText}
- Total Invoice: ${invoices.length}
- Status: ${Object.entries(statusCounts).map(([s, c]) => `${s}: ${c}`).join(', ')}
${entities.timePeriod ? `- Periode: ${entities.timePeriod.label}` : ''}`,
        };
    }

    if (intent === 'COMPARE') {
        // For comparison, fetch recent invoices and group by period
        const invoices = await prisma.invoice.findMany({
            where: { tenantId },
            select: {
                total: true,
                status: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });

        // Group by month
        const monthlyData: Record<string, { count: number; total: number }> = {};
        for (const inv of invoices) {
            const key = `${inv.createdAt.getFullYear()}-${String(inv.createdAt.getMonth() + 1).padStart(2, '0')}`;
            if (!monthlyData[key]) monthlyData[key] = { count: 0, total: 0 };
            monthlyData[key].count += 1;
            monthlyData[key].total += Number(inv.total);
        }

        const months = Object.entries(monthlyData)
            .sort(([a], [b]) => b.localeCompare(a))
            .slice(0, 6)
            .map(([month, data]) => `${month}: ${data.count} invoice, Rp ${data.total.toLocaleString('id-ID')}`)
            .join('\n');

        return {
            moduleName: 'invoice',
            description: 'Perbandingan data invoice per bulan',
            data: `KONTEKS DATA AKTUAL (Invoice Perbandingan):
- Data per bulan:
${months}
${entities.comparisonTarget ? `- Target perbandingan: ${entities.comparisonTarget}` : ''}`,
        };
    }

    // Default: list invoices
    const invoices = await prisma.invoice.findMany({
        where,
        select: {
            invoiceNumber: true,
            total: true,
            status: true,
            dueDate: true,
            createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
    });

    const statusCounts = invoices.reduce(
        (acc, inv) => {
            acc[inv.status] = (acc[inv.status] || 0) + 1;
            return acc;
        },
        {} as Record<string, number>
    );

    const timeLabel = entities.timePeriod ? ` (${entities.timePeriod.label})` : '';

    return {
        moduleName: 'invoice',
        description: `Data invoice${timeLabel}`,
        data: `KONTEKS DATA AKTUAL (Invoice):
- Total Invoice: ${invoices.length}
- Status: ${Object.entries(statusCounts).map(([s, c]) => `${s}: ${c}`).join(', ')}
- Daftar terbaru: ${invoices
                .slice(0, 10)
                .map((inv) => `${inv.invoiceNumber} - Rp ${Number(inv.total).toLocaleString('id-ID')} (${inv.status}, ${inv.dueDate.toLocaleDateString('id-ID')})`)
                .join('\n  ')}
${entities.timePeriod ? `- Periode: ${entities.timePeriod.label}` : ''}`,
        raw: invoices.map((i) => ({
            invoiceNumber: i.invoiceNumber,
            total: Number(i.total),
            status: i.status,
        })),
    };
}

/**
 * Resolve payment-related data.
 */
async function resolvePaymentData(
    tenantId: string,
    entities: ExtractedEntity,
    intent: IntentType
): Promise<ResolvedDataContext> {
    const dateFilter = buildDateFilter(entities.timePeriod);
    const statusFilter = buildStatusFilter(entities.status);
    const limit = entities.limit ?? 20;

    const where: Record<string, unknown> = { tenantId };
    if (dateFilter) where.paymentDate = dateFilter;
    if (statusFilter) where.status = statusFilter;

    const payments = await prisma.payment.findMany({
        where,
        select: {
            paymentNumber: true,
            amount: true,
            paymentDate: true,
            method: true,
            status: true,
            type: true,
        },
        orderBy: { paymentDate: 'desc' },
        take: limit,
    });

    if (intent === 'AGGREGATE') {
        const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);
        const incomePayments = payments.filter((p) => p.type === 'INCOME');
        const expensePayments = payments.filter((p) => p.type === 'EXPENSE');
        const totalIncome = incomePayments.reduce((sum, p) => sum + Number(p.amount), 0);
        const totalExpense = expensePayments.reduce((sum, p) => sum + Number(p.amount), 0);

        return {
            moduleName: 'payment',
            description: 'Agregasi data pembayaran',
            data: `KONTEKS DATA AKTUAL (Pembayaran Aggregasi):
- Total Pembayaran: ${payments.length}
- Total Amount: Rp ${totalAmount.toLocaleString('id-ID')}
- Income: ${incomePayments.length} transaksi (Rp ${totalIncome.toLocaleString('id-ID')})
- Expense: ${expensePayments.length} transaksi (Rp ${totalExpense.toLocaleString('id-ID')})
- Methods: ${[...new Set(payments.map((p) => p.method))].join(', ')}`,
        };
    }

    const timeLabel = entities.timePeriod ? ` (${entities.timePeriod.label})` : '';

    return {
        moduleName: 'payment',
        description: `Data pembayaran${timeLabel}`,
        data: `KONTEKS DATA AKTUAL (Pembayaran):
- Total: ${payments.length} transaksi
- Daftar terbaru: ${payments
                .slice(0, 10)
                .map((p) => `${p.paymentNumber} - Rp ${Number(p.amount).toLocaleString('id-ID')} (${p.method}, ${p.status}, ${p.type})`)
                .join('\n  ')}
${entities.timePeriod ? `- Periode: ${entities.timePeriod.label}` : ''}`,
        raw: payments.map((p) => ({
            paymentNumber: p.paymentNumber,
            amount: Number(p.amount),
            status: p.status,
        })),
    };
}

/**
 * Resolve contact/customer data.
 */
async function resolveContactData(
    tenantId: string,
    entities: ExtractedEntity,
    intent: IntentType
): Promise<ResolvedDataContext> {
    const limit = entities.limit ?? (intent === 'AGGREGATE' ? 200 : 10);

    const where: Record<string, unknown> = { tenantId, isActive: true };

    const contacts = await prisma.contact.findMany({
        where,
        select: {
            name: true,
            type: true,
            company: true,
            email: true,
            phone: true,
            createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
    });

    if (intent === 'AGGREGATE') {
        const typeCounts = contacts.reduce(
            (acc, c) => {
                acc[c.type] = (acc[c.type] || 0) + 1;
                return acc;
            },
            {} as Record<string, number>
        );

        return {
            moduleName: 'contact',
            description: 'Agregasi data kontak',
            data: `KONTEKS DATA AKTUAL (Kontak Aggregasi):
- Total Kontak: ${contacts.length}
- Tipe: ${Object.entries(typeCounts).map(([t, c]) => `${t}: ${c}`).join(', ')}
- Top 5: ${contacts.slice(0, 5).map((c) => `${c.name}${c.company ? ` (${c.company})` : ''}`).join(', ')}`,
        };
    }

    return {
        moduleName: 'contact',
        description: 'Data kontak/customer',
        data: `KONTEKS DATA AKTUAL (Customer):
- Total Kontak: ${contacts.length}
- Daftar: ${contacts
                .slice(0, 15)
                .map((c) => `${c.name}${c.company ? ` (${c.company})` : ''} [${c.type}] ${c.email ? `- ${c.email}` : ''}`)
                .join('\n  ')}`,
        raw: contacts.map((c) => ({ name: c.name, type: c.type })),
    };
}

/**
 * Resolve product/inventory data.
 */
async function resolveProductData(
    tenantId: string,
    entities: ExtractedEntity,
    intent: IntentType
): Promise<ResolvedDataContext> {
    const limit = entities.limit ?? 20;

    const where: Record<string, unknown> = { tenantId, deletedAt: null };

    // For low stock filter — fetch all products and filter in JS
    if (entities.status?.includes('OVERDUE' as never)) {
        const allProducts = await prisma.product.findMany({
            where,
            select: { name: true, sku: true, price: true, stock: true, minStock: true },
            orderBy: { stock: 'asc' },
            take: 200,
        });

        const lowStockProducts = allProducts.filter((p) => p.stock <= p.minStock).slice(0, limit);

        return {
            moduleName: 'product',
            description: 'Produk dengan stok rendah',
            data: `KONTEKS DATA AKTUAL (Stok Rendah):
- Total Produk Stok Rendah: ${lowStockProducts.length}
- Daftar: ${lowStockProducts.map((p) => `${p.name} (${p.sku}) - Stok: ${p.stock}/${p.minStock}`).join('\n  ')}`,
        };
    }

    if (intent === 'AGGREGATE') {
        const products = await prisma.product.findMany({
            where,
            select: { name: true, price: true, cost: true, stock: true, minStock: true },
            take: 500,
        });

        const totalProducts = products.length;
        const totalValue = products.reduce((sum, p) => sum + Number(p.price) * p.stock, 0);
        const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
        const lowStockCount = products.filter((p) => p.stock <= p.minStock).length;

        return {
            moduleName: 'product',
            description: 'Agregasi data produk',
            data: `KONTEKS DATA AKTUAL (Produk Aggregasi):
- Total Produk: ${totalProducts}
- Total Stok: ${totalStock} unit
- Total Nilai Inventori: Rp ${totalValue.toLocaleString('id-ID')}
- Stok Rendah: ${lowStockCount} produk`,
        };
    }

    const products = await prisma.product.findMany({
        where,
        select: {
            name: true,
            sku: true,
            price: true,
            stock: true,
            isActive: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
    });

    return {
        moduleName: 'product',
        description: 'Data produk/inventory',
        data: `KONTEKS DATA AKTUAL (Produk):
- Total Produk: ${products.length}
- Daftar: ${products
                .slice(0, 15)
                .map((p) => `${p.name} (${p.sku}) - Rp ${Number(p.price).toLocaleString('id-ID')} [Stok: ${p.stock}] ${p.isActive ? '✓' : '✗'}`)
                .join('\n  ')}`,
        raw: products.map((p) => ({ name: p.name, stock: p.stock, price: Number(p.price) })),
    };
}

/**
 * Resolve employee/HR data.
 */
async function resolveEmployeeData(
    tenantId: string,
    entities: ExtractedEntity,
    intent: IntentType
): Promise<ResolvedDataContext> {
    const limit = entities.limit ?? 20;

    const where: Record<string, unknown> = { tenantId };
    if (entities.status && entities.status.length > 0) {
        where.status = entities.status.length === 1 ? entities.status[0] : { in: entities.status };
    }

    const employees = await prisma.employee.findMany({
        where,
        select: {
            name: true,
            employeeId: true,
            position: true,
            department: true,
            status: true,
            salary: true,
            joinDate: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
    });

    if (intent === 'AGGREGATE') {
        const statusCounts = employees.reduce(
            (acc, e) => {
                acc[e.status] = (acc[e.status] || 0) + 1;
                return acc;
            },
            {} as Record<string, number>
        );

        const avgSalary = employees.length > 0
            ? employees.reduce((sum, e) => sum + Number(e.salary), 0) / employees.length
            : 0;

        return {
            moduleName: 'employee',
            description: 'Agregasi data karyawan',
            data: `KONTEKS DATA AKTUAL (Karyawan Aggregasi):
- Total Karyawan: ${employees.length}
- Status: ${Object.entries(statusCounts).map(([s, c]) => `${s}: ${c}`).join(', ')}
- Rata-rata Gaji: Rp ${avgSalary.toLocaleString('id-ID')}`,
        };
    }

    const timeLabel = entities.timePeriod ? ` (${entities.timePeriod.label})` : '';

    return {
        moduleName: 'employee',
        description: `Data karyawan${timeLabel}`,
        data: `KONTEKS DATA AKTUAL (Karyawan):
- Total Karyawan: ${employees.length}
- Daftar: ${employees
                .slice(0, 15)
                .map((e) => `${e.name} (${e.employeeId}) - ${e.position} (${e.department || 'N/A'}) [${e.status}]`)
                .join('\n  ')}`,
        raw: employees.map((e) => ({ name: e.name, status: e.status })),
    };
}

/**
 * Resolve purchase order data.
 */
async function resolvePurchaseOrderData(
    tenantId: string,
    entities: ExtractedEntity,
    intent: IntentType
): Promise<ResolvedDataContext> {
    const dateFilter = buildDateFilter(entities.timePeriod);
    const statusFilter = buildStatusFilter(entities.status);
    const limit = entities.limit ?? 20;

    const where: Record<string, unknown> = { tenantId };
    if (dateFilter) where.createdAt = dateFilter;
    if (statusFilter) where.status = statusFilter;

    const pos = await prisma.purchaseOrder.findMany({
        where,
        select: {
            poNumber: true,
            total: true,
            status: true,
            orderDate: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
    });

    if (intent === 'AGGREGATE') {
        const totalAmount = pos.reduce((sum, po) => sum + Number(po.total), 0);
        const statusCounts = pos.reduce(
            (acc, po) => {
                acc[po.status] = (acc[po.status] || 0) + 1;
                return acc;
            },
            {} as Record<string, number>
        );

        return {
            moduleName: 'purchaseOrder',
            description: 'Agregasi data purchase order',
            data: `KONTEKS DATA AKTUAL (Purchase Order Aggregasi):
- Total PO: ${pos.length}
- Total Amount: Rp ${totalAmount.toLocaleString('id-ID')}
- Status: ${Object.entries(statusCounts).map(([s, c]) => `${s}: ${c}`).join(', ')}`,
        };
    }

    return {
        moduleName: 'purchaseOrder',
        description: 'Data purchase order',
        data: `KONTEKS DATA AKTUAL (Purchase Order):
- Total PO: ${pos.length}
- Daftar terbaru: ${pos
                .slice(0, 10)
                .map((po) => `${po.poNumber} - Rp ${Number(po.total).toLocaleString('id-ID')} (${po.status})`)
                .join('\n  ')}`,
        raw: pos.map((po) => ({ poNumber: po.poNumber, total: Number(po.total), status: po.status })),
    };
}

/**
 * Resolve journal entry (general ledger) data.
 */
async function resolveJournalEntryData(
    tenantId: string,
    entities: ExtractedEntity,
    intent: IntentType
): Promise<ResolvedDataContext> {
    const dateFilter = buildDateFilter(entities.timePeriod);
    const statusFilter = buildStatusFilter(entities.status);
    const limit = entities.limit ?? 20;

    const where: Record<string, unknown> = { tenantId };
    if (dateFilter) where.date = dateFilter;
    if (statusFilter) where.status = statusFilter;

    const entries = await prisma.journalEntry.findMany({
        where,
        select: {
            entryNumber: true,
            description: true,
            date: true,
            totalDebit: true,
            totalCredit: true,
            status: true,
            sourceType: true,
        },
        orderBy: { date: 'desc' },
        take: limit,
    });

    if (intent === 'AGGREGATE') {
        const totalDebit = entries.reduce((sum, e) => sum + Number(e.totalDebit), 0);
        const totalCredit = entries.reduce((sum, e) => sum + Number(e.totalCredit), 0);

        return {
            moduleName: 'journalEntry',
            description: 'Agregasi data jurnal',
            data: `KONTEKS DATA AKTUAL (Jurnal Aggregasi):
- Total Jurnal: ${entries.length}
- Total Debit: Rp ${totalDebit.toLocaleString('id-ID')}
- Total Kredit: Rp ${totalCredit.toLocaleString('id-ID')}
- Balance: ${totalDebit === totalCredit ? 'Seimbang ✓' : 'Tidak seimbang ✗'}`,
        };
    }

    return {
        moduleName: 'journalEntry',
        description: 'Data jurnal umum',
        data: `KONTEKS DATA AKTUAL (Jurnal):
- Total Jurnal: ${entries.length}
- Daftar terbaru: ${entries
                .slice(0, 10)
                .map((e) => `${e.entryNumber} - ${e.description} (D: Rp ${Number(e.totalDebit).toLocaleString('id-ID')}, K: Rp ${Number(e.totalCredit).toLocaleString('id-ID')}) [${e.status}]`)
                .join('\n  ')}`,
        raw: entries.map((e) => ({ entryNumber: e.entryNumber, debit: Number(e.totalDebit), credit: Number(e.totalCredit) })),
    };
}

/**
 * Resolve quotation data.
 */
async function resolveQuotationData(
    tenantId: string,
    entities: ExtractedEntity,
    intent: IntentType
): Promise<ResolvedDataContext> {
    const dateFilter = buildDateFilter(entities.timePeriod);
    const statusFilter = buildStatusFilter(entities.status);
    const limit = entities.limit ?? 20;

    const where: Record<string, unknown> = { tenantId };
    if (dateFilter) where.createdAt = dateFilter;
    if (statusFilter) where.status = statusFilter;

    const quotations = await prisma.quotation.findMany({
        where,
        select: {
            quotationNumber: true,
            total: true,
            status: true,
            validUntil: true,
            createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
    });

    if (intent === 'AGGREGATE') {
        const totalAmount = quotations.reduce((sum, q) => sum + Number(q.total), 0);
        const statusCounts = quotations.reduce(
            (acc, q) => {
                acc[q.status] = (acc[q.status] || 0) + 1;
                return acc;
            },
            {} as Record<string, number>
        );

        return {
            moduleName: 'quotation',
            description: 'Agregasi data penawaran',
            data: `KONTEKS DATA AKTUAL (Penawaran Aggregasi):
- Total Penawaran: ${quotations.length}
- Total Amount: Rp ${totalAmount.toLocaleString('id-ID')}
- Status: ${Object.entries(statusCounts).map(([s, c]) => `${s}: ${c}`).join(', ')}`,
        };
    }

    return {
        moduleName: 'quotation',
        description: 'Data penawaran/quotation',
        data: `KONTEKS DATA AKTUAL (Penawaran):
- Total Penawaran: ${quotations.length}
- Daftar terbaru: ${quotations
                .slice(0, 10)
                .map((q) => `${q.quotationNumber} - Rp ${Number(q.total).toLocaleString('id-ID')} (${q.status})`)
                .join('\n  ')}`,
        raw: quotations.map((q) => ({ quotationNumber: q.quotationNumber, total: Number(q.total), status: q.status })),
    };
}

/**
 * Resolve lead/CRM data.
 */
async function resolveLeadData(
    tenantId: string,
    entities: ExtractedEntity,
    _intent: IntentType
): Promise<ResolvedDataContext> {
    const limit = entities.limit ?? 20;

    const leads = await prisma.lead.findMany({
        where: { tenantId },
        select: {
            name: true,
            email: true,
            status: true,
            source: true,
            createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
    });

    const statusCounts = leads.reduce(
        (acc, l) => {
            acc[l.status] = (acc[l.status] || 0) + 1;
            return acc;
        },
        {} as Record<string, number>
    );

    return {
        moduleName: 'lead',
        description: 'Data lead CRM',
        data: `KONTEKS DATA AKTUAL (Lead):
- Total Lead: ${leads.length}
- Status: ${Object.entries(statusCounts).map(([s, c]) => `${s}: ${c}`).join(', ')}
- Daftar terbaru: ${leads.slice(0, 10).map((l) => `${l.name} (${l.status}) [${l.source || 'N/A'}]`).join('\n  ')}`,
        raw: leads.map((l) => ({ name: l.name, status: l.status })),
    };
}

/**
 * Resolve deal/pipeline data.
 */
async function resolveDealData(
    tenantId: string,
    entities: ExtractedEntity,
    _intent: IntentType
): Promise<ResolvedDataContext> {
    const limit = entities.limit ?? 20;

    const deals = await prisma.deal.findMany({
        where: { tenantId },
        select: {
            title: true,
            value: true,
            stage: true,
            probability: true,
            createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
    });

    const totalValue = deals.reduce((sum, d) => sum + Number(d.value), 0);
    const stageCounts = deals.reduce(
        (acc, d) => {
            acc[d.stage] = (acc[d.stage] || 0) + 1;
            return acc;
        },
        {} as Record<string, number>
    );

    return {
        moduleName: 'deal',
        description: 'Data deal/pipeline',
        data: `KONTEKS DATA AKTUAL (Deal):
- Total Deal: ${deals.length}
- Total Pipeline Value: Rp ${totalValue.toLocaleString('id-ID')}
- Stage: ${Object.entries(stageCounts).map(([s, c]) => `${s}: ${c}`).join(', ')}
- Daftar: ${deals.slice(0, 10).map((d) => `${d.title} - Rp ${Number(d.value).toLocaleString('id-ID')} (${d.stage}, ${d.probability}%)`).join('\n  ')}`,
        raw: deals.map((d) => ({ title: d.title, value: Number(d.value), stage: d.stage })),
    };
}

// ─── Module-to-Resolver Mapping ──────────────────────────────────────────────

const MODULE_RESOLVERS: Record<ModuleName, (tenantId: string, entities: ExtractedEntity, intent: IntentType) => Promise<ResolvedDataContext>> = {
    invoice: resolveInvoiceData,
    payment: resolvePaymentData,
    contact: resolveContactData,
    product: resolveProductData,
    employee: resolveEmployeeData,
    purchaseOrder: resolvePurchaseOrderData,
    journalEntry: resolveJournalEntryData,
    quotation: resolveQuotationData,
    lead: resolveLeadData,
    deal: resolveDealData,
    payroll: resolveEmployeeData, // Fallback to employee data
    attendance: resolveEmployeeData, // Fallback to employee data
    leave: resolveEmployeeData, // Fallback to employee data
    finance: resolveInvoiceData, // Default to invoice for finance
    inventory: resolveProductData, // Default to product for inventory
    hr: resolveEmployeeData, // Default to employee for HR
    crm: resolveLeadData, // Default to lead for CRM
};

// ─── Main Resolver ──────────────────────────────────────────────────────────

/**
 * Resolve data context based on NLU parse result.
 * Fetches real data from the database and formats it for AI context.
 *
 * @param options - Contains tenantId, NLU result, and optional module override
 * @returns ResolvedDataContext or null if no data could be resolved
 *
 * @example
 * ```ts
 * const context = await resolveSmartData({
 *     tenantId: 'abc123',
 *     nluResult: parseQuery('tampilkan penjualan bulan ini'),
 * });
 * // context.data contains formatted string with actual invoice data
 * ```
 */
export async function resolveSmartData(
    options: DataResolverOptions
): Promise<ResolvedDataContext | null> {
    const { tenantId, nluResult, requestModule } = options;
    const { intent, entities } = nluResult;

    // Determine which module to query
    const moduleName = (requestModule || entities.moduleName) as ModuleName | undefined;

    if (!moduleName) {
        logger.debug('[DataResolver] No module detected, returning null');
        return null;
    }

    const resolver = MODULE_RESOLVERS[moduleName];
    if (!resolver) {
        logger.warn(`[DataResolver] No resolver for module: ${moduleName}`);
        return null;
    }

    try {
        logger.info(`[DataResolver] Resolving data for module=${moduleName}, intent=${intent}`, {
            tenantId,
            timePeriod: entities.timePeriod?.label,
            status: entities.status,
        });

        const result = await resolver(tenantId, entities, intent);
        return result;
    } catch (error) {
        logger.error(`[DataResolver] Error resolving ${moduleName}:`, error instanceof Error ? error.message : 'Unknown');
        return null;
    }
}
