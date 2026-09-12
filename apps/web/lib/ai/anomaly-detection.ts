// ─── Anomaly Detection Engine ────────────────────────────────────────────────
// Deteksi transaksi mencurigakan menggunakan rule-based + AI analysis.
// Supports: Invoice, Payment, PurchaseOrder, JournalEntry entities.
// Persists results to AnomalyDetection table for audit & dashboard.

import { Prisma } from '@prisma/client';
import { getAIProvider, type AIChatMessage } from './provider';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

// ─── Types ───────────────────────────────────────────────────────────────────

export type AnomalySeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type AnomalyStatus = 'OPEN' | 'DISMISSED' | 'INVESTIGATING' | 'BLOCKED';
export type AnomalyEntityType = 'INVOICE' | 'PAYMENT' | 'PURCHASE_ORDER' | 'QUOTATION' | 'JOURNAL_ENTRY';

export interface AnomalyRule {
    id: string;
    name: string;
    description: string;
    severity: AnomalySeverity;
    category: string;
}

export interface AnomalyDetection {
    id: string;
    ruleId: string;
    ruleName: string;
    severity: AnomalySeverity;
    entityType: AnomalyEntityType;
    entityId: string;
    entityDescription: string;
    message: string;
    details: Record<string, unknown>;
    suggestedActions: string[];
    detectedAt: string;
    status: AnomalyStatus;
}

export interface AnomalyScanResult {
    anomalies: AnomalyDetection[];
    scannedEntities: number;
    scanDuration: number;
    scannedAt: string;
    summary: {
        total: number;
        critical: number;
        high: number;
        medium: number;
        low: number;
    };
}

export interface AnomalyFilter {
    severity?: AnomalySeverity;
    status?: AnomalyStatus;
    entityType?: AnomalyEntityType;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
}

// ─── Pre-fetched Data Types ──────────────────────────────────────────────────

type InvoiceRecord = {
    id: string;
    invoiceNumber: string;
    total: number;
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    contactId: string | null;
    createdAt: Date;
    dueDate: Date;
    status: string;
    contact?: { name: string } | null;
};

type PaymentRecord = {
    id: string;
    paymentNumber: string;
    amount: number;
    paymentDate: Date;
    method: string;
    status: string;
    type: string;
    createdAt: Date;
    invoiceId: string | null;
};

type PurchaseOrderRecord = {
    id: string;
    poNumber: string;
    status: string;
    orderDate: Date;
    total: number;
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    supplierId: string | null;
    createdAt: Date;
};

type JournalEntryRecord = {
    id: string;
    entryNumber: string;
    date: Date;
    description: string;
    totalDebit: number;
    totalCredit: number;
    status: string;
    sourceType: string;
    createdAt: Date;
};

// ─── Rule Definitions ────────────────────────────────────────────────────────

export const ANOMALY_RULES: AnomalyRule[] = [
    {
        id: 'UNUSUAL_AMOUNT',
        name: 'Jumlah Tidak Biasa',
        description: 'Transaksi dengan jumlah lebih dari 2x rata-rata',
        severity: 'HIGH',
        category: 'amount',
    },
    {
        id: 'DUPLICATE_TRANSACTION',
        name: 'Transaksi Duplikat',
        description: 'Jumlah sama, vendor sama, dalam 24 jam',
        severity: 'HIGH',
        category: 'duplicate',
    },
    {
        id: 'WEEKEND_TRANSACTION',
        name: 'Transaksi Akhir Pekan',
        description: 'Transaksi dilakukan pada hari Sabtu/Minggu',
        severity: 'MEDIUM',
        category: 'timing',
    },
    {
        id: 'ROUND_NUMBER',
        name: 'Angka Bulat Mencurigakan',
        description: 'Jumlah transaksi bulat (kelipatan 100.000 atau 1.000.000)',
        severity: 'LOW',
        category: 'amount',
    },
    {
        id: 'NEW_VENDOR_LARGE_AMOUNT',
        name: 'Vendor Baru dengan Jumlah Besar',
        description: 'Transaksi pertama dengan vendor bernilai tinggi',
        severity: 'HIGH',
        category: 'vendor',
    },
    {
        id: 'INVOICE_NUMBER_GAP',
        name: 'Nomor Invoice Terputus',
        description: 'Gap pada nomor urut invoice',
        severity: 'MEDIUM',
        category: 'sequence',
    },
    {
        id: 'UNUSUAL_TIME',
        name: 'Waktu Tidak Biasa',
        description: 'Transaksi dilakukan di luar jam kerja (sebelum 06:00 atau setelah 22:00)',
        severity: 'MEDIUM',
        category: 'timing',
    },
    {
        id: 'LARGE_EXPENSE',
        name: 'Pengeluaran Besar',
        description: 'Pengeluaran melebihi 3x rata-rata total invoice',
        severity: 'HIGH',
        category: 'amount',
    },
    {
        id: 'RAPID_SUCCESSIVE_TRANSACTIONS',
        name: 'Transaksi Beruntun Cepat',
        description: '3+ invoice dibuat dalam waktu < 5 menit oleh vendor yang sama',
        severity: 'MEDIUM',
        category: 'pattern',
    },
    {
        id: 'TAX_MISMATCH',
        name: 'Pajak Tidak Cocok',
        description: 'Perhitungan pajak tidak sesuai rate yang berlaku (tax < 0% atau > 50% dari subtotal)',
        severity: 'HIGH',
        category: 'compliance',
    },
    {
        id: 'ROUND_TRIP_TRANSACTION',
        name: 'Transaksi Bolak-balik',
        description: 'Pasangan invoice dengan amount sama dari/to vendor yang sama dalam 7 hari',
        severity: 'CRITICAL',
        category: 'fraud',
    },
    {
        id: 'BACKDATED_TRANSACTION',
        name: 'Transaksi Antidate',
        description: 'Invoice dengan dueDate lebih dari 90 hari dari createdAt (indikasi backdating)',
        severity: 'MEDIUM',
        category: 'timing',
    },
];

// ─── Rule-Based Detection Functions (Existing) ──────────────────────────────

async function detectUnusualAmount(
    tenantId: string,
    invoices?: InvoiceRecord[]
): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = [];

    try {
        const data = invoices ?? await prisma.invoice.findMany({
            where: { tenantId },
            select: {
                id: true, total: true, invoiceNumber: true, createdAt: true,
                subtotal: true, taxRate: true, taxAmount: true,
                contactId: true, dueDate: true, status: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });

        if (data.length < 3) return [];

        const avg = data.reduce((sum, inv) => sum + Number(inv.total), 0) / data.length;
        const threshold = avg * 2;

        for (const inv of data) {
            if (Number(inv.total) > threshold && Number(inv.total) > 1000000) {
                anomalies.push({
                    id: `anomaly-${inv.id}-unusual-amount`,
                    ruleId: 'UNUSUAL_AMOUNT',
                    ruleName: 'Jumlah Tidak Biasa',
                    severity: 'HIGH',
                    entityType: 'INVOICE',
                    entityId: inv.id,
                    entityDescription: `Invoice ${inv.invoiceNumber || inv.id}`,
                    message: `Invoice senilai Rp ${Number(inv.total).toLocaleString('id-ID')} melebihi 2x rata-rata (Rp ${Math.round(avg).toLocaleString('id-ID')})`,
                    details: {
                        amount: Number(inv.total),
                        average: Math.round(avg),
                        threshold: Math.round(threshold),
                        ratio: Math.round((Number(inv.total) / avg) * 100) / 100,
                    },
                    suggestedActions: [
                        'Verifikasi jumlah invoice dengan dokumen asli',
                        'Cek apakah ada item tambahan yang tidak terdokumentasi',
                    ],
                    detectedAt: inv.createdAt.toISOString(),
                    status: 'OPEN',
                });
            }
        }
    } catch (error) {
        logger.error('[AnomalyDetection] Unusual amount check failed', error);
    }

    return anomalies;
}

async function detectDuplicateTransactions(
    tenantId: string,
    invoices?: InvoiceRecord[]
): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = [];

    try {
        const rawData = invoices ?? await prisma.invoice.findMany({
            where: {
                tenantId,
                createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            },
            select: {
                id: true,
                total: true,
                invoiceNumber: true,
                contactId: true,
                contact: { select: { name: true } },
                createdAt: true,
                subtotal: true, taxRate: true, taxAmount: true,
                dueDate: true, status: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        // Filter to last 24h if using pre-fetched data
        const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentInvoices = invoices
            ? rawData.filter(inv => inv.createdAt >= cutoff24h)
            : rawData;

        // Group by amount + customer
        const groups = new Map<string, typeof recentInvoices>();
        for (const inv of recentInvoices) {
            const key = `${inv.total}-${inv.contactId || 'unknown'}`;
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key)!.push(inv);
        }

        for (const [, group] of groups) {
            if (group.length > 1) {
                for (let i = 1; i < group.length; i++) {
                    anomalies.push({
                        id: `anomaly-${group[i].id}-duplicate`,
                        ruleId: 'DUPLICATE_TRANSACTION',
                        ruleName: 'Transaksi Duplikat',
                        severity: 'HIGH',
                        entityType: 'INVOICE',
                        entityId: group[i].id,
                        entityDescription: `Invoice ${group[i].invoiceNumber || group[i].id}`,
                        message: `Invoice senilai Rp ${Number(group[i].total).toLocaleString('id-ID')} memiliki jumlah dan customer yang sama dengan invoice lain dalam 24 jam`,
                        details: {
                            amount: Number(group[i].total),
                            customer: group[i].contact?.name || group[i].contactId || 'Unknown',
                            duplicateCount: group.length,
                            timeWindow: '24 jam',
                        },
                        suggestedActions: [
                            'Periksa apakah ini transaksi yang benar-benar terpisah',
                            'Hapus jika ini adalah duplikat',
                        ],
                        detectedAt: group[i].createdAt.toISOString(),
                        status: 'OPEN',
                    });
                }
            }
        }
    } catch (error) {
        logger.error('[AnomalyDetection] Duplicate check failed', error);
    }

    return anomalies;
}

async function detectWeekendTransactions(
    tenantId: string,
    invoices?: InvoiceRecord[]
): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = [];

    try {
        const rawData = invoices ?? await prisma.invoice.findMany({
            where: {
                tenantId,
                createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
            },
            select: {
                id: true,
                invoiceNumber: true,
                total: true,
                createdAt: true,
                subtotal: true, taxRate: true, taxAmount: true,
                contactId: true, dueDate: true, status: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        // Filter to last 7 days if using pre-fetched data
        const cutoff7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const recentInvoices = invoices
            ? rawData.filter(inv => inv.createdAt >= cutoff7d)
            : rawData;

        for (const inv of recentInvoices) {
            const day = inv.createdAt.getDay();
            if (day === 0 || day === 6) {
                anomalies.push({
                    id: `anomaly-${inv.id}-weekend`,
                    ruleId: 'WEEKEND_TRANSACTION',
                    ruleName: 'Transaksi Akhir Pekan',
                    severity: 'MEDIUM',
                    entityType: 'INVOICE',
                    entityId: inv.id,
                    entityDescription: `Invoice ${inv.invoiceNumber || inv.id}`,
                    message: `Invoice dibuat pada hari ${day === 0 ? 'Minggu' : 'Sabtu'}`,
                    details: {
                        dayOfWeek: day === 0 ? 'Minggu' : 'Sabtu',
                        createdAt: inv.createdAt.toISOString(),
                    },
                    suggestedActions: [
                        'Pastikan transaksi ini sah dan terdokumentasi',
                    ],
                    detectedAt: inv.createdAt.toISOString(),
                    status: 'OPEN',
                });
            }
        }
    } catch (error) {
        logger.error('[AnomalyDetection] Weekend check failed', error);
    }

    return anomalies;
}

async function detectRoundNumbers(
    tenantId: string,
    invoices?: InvoiceRecord[]
): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = [];

    try {
        const data = invoices ?? await prisma.invoice.findMany({
            where: { tenantId },
            select: {
                id: true, invoiceNumber: true, total: true, createdAt: true,
                subtotal: true, taxRate: true, taxAmount: true,
                contactId: true, dueDate: true, status: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });

        const sample = data.slice(0, 50);

        for (const inv of sample) {
            const amount = Number(inv.total);
            if (amount >= 100000 && amount % 100000 === 0) {
                anomalies.push({
                    id: `anomaly-${inv.id}-round`,
                    ruleId: 'ROUND_NUMBER',
                    ruleName: 'Angka Bulat Mencurigakan',
                    severity: 'LOW',
                    entityType: 'INVOICE',
                    entityId: inv.id,
                    entityDescription: `Invoice ${inv.invoiceNumber || inv.id}`,
                    message: `Invoice senilai Rp ${amount.toLocaleString('id-ID')} adalah angka bulat`,
                    details: { amount, isRound: true },
                    suggestedActions: [
                        'Verifikasi bahwa jumlah benar-benar sesuai',
                    ],
                    detectedAt: inv.createdAt.toISOString(),
                    status: 'OPEN',
                });
            }
        }
    } catch (error) {
        logger.error('[AnomalyDetection] Round number check failed', error);
    }

    return anomalies;
}

async function detectNewVendorLargeAmount(
    tenantId: string,
    invoices?: InvoiceRecord[]
): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = [];

    try {
        const data = invoices ?? await prisma.invoice.findMany({
            where: { tenantId },
            select: {
                id: true,
                invoiceNumber: true,
                total: true,
                contactId: true,
                contact: { select: { name: true } },
                createdAt: true,
                subtotal: true, taxRate: true, taxAmount: true,
                dueDate: true, status: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });

        const sample = data.slice(0, 50);

        // Find contacts that only appear once
        const contactCounts = new Map<string, number>();
        for (const inv of sample) {
            const contactKey = inv.contactId || 'unknown';
            contactCounts.set(contactKey, (contactCounts.get(contactKey) || 0) + 1);
        }

        for (const inv of sample) {
            const contactKey = inv.contactId || 'unknown';
            const count = contactCounts.get(contactKey) || 0;
            if (count === 1 && Number(inv.total) > 5000000) {
                const contactName = inv.contact?.name || 'Unknown';
                anomalies.push({
                    id: `anomaly-${inv.id}-new-vendor`,
                    ruleId: 'NEW_VENDOR_LARGE_AMOUNT',
                    ruleName: 'Vendor Baru dengan Jumlah Besar',
                    severity: 'HIGH',
                    entityType: 'INVOICE',
                    entityId: inv.id,
                    entityDescription: `Invoice ${inv.invoiceNumber || inv.id}`,
                    message: `Transaksi pertama dengan "${contactName}" senilai Rp ${Number(inv.total).toLocaleString('id-ID')}`,
                    details: {
                        amount: Number(inv.total),
                        customer: contactName || inv.contactId,
                        isFirstTransaction: true,
                    },
                    suggestedActions: [
                        'Verifikasi identitas vendor/customer baru',
                        'Cek apakah sudah terdaftar di sistem',
                    ],
                    detectedAt: inv.createdAt.toISOString(),
                    status: 'OPEN',
                });
            }
        }
    } catch (error) {
        logger.error('[AnomalyDetection] New vendor check failed', error);
    }

    return anomalies;
}

// ─── New Detection Rules (7 additional rules) ───────────────────────────────

/**
 * Rule: INVOICE_NUMBER_GAP
 * Deteksi gap dalam sequence nomor invoice (misal: INV-001, INV-002, INV-005 → gap di 003, 004).
 */
async function detectInvoiceNumberGap(
    tenantId: string,
    invoices?: InvoiceRecord[]
): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = [];

    try {
        const data = (invoices ?? await prisma.invoice.findMany({
            where: { tenantId },
            select: {
                id: true, invoiceNumber: true, total: true, createdAt: true,
                subtotal: true, taxRate: true, taxAmount: true,
                contactId: true, dueDate: true, status: true,
            },
            orderBy: { invoiceNumber: 'asc' },
        })) as InvoiceRecord[];

        if (data.length < 3) return [];

        // Extract numeric parts from invoice numbers
        const numericInvoices: { index: number; num: number; record: InvoiceRecord }[] = [];
        for (let i = 0; i < data.length; i++) {
            const match = data[i].invoiceNumber?.match(/(\d+)$/);
            if (match) {
                numericInvoices.push({ index: i, num: parseInt(match[1], 10), record: data[i] });
            }
        }

        if (numericInvoices.length < 3) return [];

        // Sort by numeric value
        numericInvoices.sort((a, b) => a.num - b.num);

        // Detect gaps
        for (let i = 1; i < numericInvoices.length; i++) {
            const prev = numericInvoices[i - 1];
            const curr = numericInvoices[i];
            const gap = curr.num - prev.num;

            if (gap > 1) {
                const missingCount = gap - 1;
                anomalies.push({
                    id: `anomaly-${curr.record.id}-number-gap`,
                    ruleId: 'INVOICE_NUMBER_GAP',
                    ruleName: 'Nomor Invoice Terputus',
                    severity: 'MEDIUM',
                    entityType: 'INVOICE',
                    entityId: curr.record.id,
                    entityDescription: `Invoice ${curr.record.invoiceNumber}`,
                    message: `Terdapat gap ${missingCount} nomor invoice sebelum "${curr.record.invoiceNumber}" (sebelumnya: ${prev.record.invoiceNumber})`,
                    details: {
                        currentNumber: curr.record.invoiceNumber,
                        previousNumber: prev.record.invoiceNumber,
                        missingCount,
                        gap: missingCount,
                    },
                    suggestedActions: [
                        'Periksa apakah ada invoice yang belum terdaftar di sistem',
                        'Verifikasi apakah nomor invoice yang hilang memang tidak ada',
                    ],
                    detectedAt: curr.record.createdAt.toISOString(),
                    status: 'OPEN',
                });
            }
        }
    } catch (error) {
        logger.error('[AnomalyDetection] Invoice number gap check failed', error);
    }

    return anomalies;
}

/**
 * Rule: UNUSUAL_TIME
 * Deteksi transaksi yang terjadi di luar jam kerja normal (00:00-05:00).
 */
async function detectUnusualTime(
    tenantId: string,
    invoices?: InvoiceRecord[]
): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = [];

    try {
        const data = (invoices ?? await prisma.invoice.findMany({
            where: { tenantId },
            select: {
                id: true, invoiceNumber: true, total: true, createdAt: true,
                subtotal: true, taxRate: true, taxAmount: true,
                contactId: true, dueDate: true, status: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 200,
        })) as InvoiceRecord[];

        for (const inv of data) {
            const hour = inv.createdAt.getHours();
            // Flag transactions created between midnight and 5 AM
            if (hour >= 0 && hour < 5) {
                anomalies.push({
                    id: `anomaly-${inv.id}-unusual-time`,
                    ruleId: 'UNUSUAL_TIME',
                    ruleName: 'Waktu Tidak Biasa',
                    severity: 'MEDIUM',
                    entityType: 'INVOICE',
                    entityId: inv.id,
                    entityDescription: `Invoice ${inv.invoiceNumber || inv.id}`,
                    message: `Invoice dibuat pada pukul ${inv.createdAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} (di luar jam kerja normal)`,
                    details: {
                        hour,
                        createdAt: inv.createdAt.toISOString(),
                        timeRange: `${String(hour).padStart(2, '0')}:xx`,
                    },
                    suggestedActions: [
                        'Pastikan transaksi ini sah dan bukan error input',
                        'Periksa apakah user yang membuat adalah orang yang tepat',
                    ],
                    detectedAt: inv.createdAt.toISOString(),
                    status: 'OPEN',
                });
            }
        }
    } catch (error) {
        logger.error('[AnomalyDetection] Unusual time check failed', error);
    }

    return anomalies;
}

/**
 * Rule: LARGE_EXPENSE
 * Deteksi invoice dengan totalAmount > 3x rata-rata total semua invoice tenant.
 */
async function detectLargeExpense(
    tenantId: string,
    invoices?: InvoiceRecord[]
): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = [];

    try {
        const data = (invoices ?? await prisma.invoice.findMany({
            where: { tenantId },
            select: {
                id: true, invoiceNumber: true, total: true, createdAt: true,
                subtotal: true, taxRate: true, taxAmount: true,
                contactId: true, dueDate: true, status: true,
            },
            orderBy: { createdAt: 'desc' },
        })) as InvoiceRecord[];

        if (data.length < 3) return [];

        const avg = data.reduce((sum, inv) => sum + Number(inv.total), 0) / data.length;
        const threshold = avg * 3;

        for (const inv of data) {
            const amount = Number(inv.total);
            if (amount > threshold && amount > 5000000) {
                anomalies.push({
                    id: `anomaly-${inv.id}-large-expense`,
                    ruleId: 'LARGE_EXPENSE',
                    ruleName: 'Pengeluaran Besar',
                    severity: 'HIGH',
                    entityType: 'INVOICE',
                    entityId: inv.id,
                    entityDescription: `Invoice ${inv.invoiceNumber || inv.id}`,
                    message: `Invoice senilai Rp ${amount.toLocaleString('id-ID')} melebihi 3x rata-rata (Rp ${Math.round(avg).toLocaleString('id-ID')})`,
                    details: {
                        amount,
                        average: Math.round(avg),
                        threshold: Math.round(threshold),
                        ratio: Math.round((amount / avg) * 100) / 100,
                    },
                    suggestedActions: [
                        'Verifikasi jumlah invoice dengan purchase order terkait',
                        'Pastikan approval yang sesuai untuk nominal besar ini',
                    ],
                    detectedAt: inv.createdAt.toISOString(),
                    status: 'OPEN',
                });
            }
        }
    } catch (error) {
        logger.error('[AnomalyDetection] Large expense check failed', error);
    }

    return anomalies;
}

/**
 * Rule: RAPID_SUCCESSIVE_TRANSACTIONS
 * Deteksi 3+ invoice dibuat dalam waktu < 5 menit oleh vendor/contact yang sama.
 */
async function detectRapidSuccessiveTransactions(
    tenantId: string,
    invoices?: InvoiceRecord[]
): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = [];

    try {
        const data = (invoices ?? await prisma.invoice.findMany({
            where: { tenantId },
            select: {
                id: true, invoiceNumber: true, total: true, createdAt: true,
                subtotal: true, taxRate: true, taxAmount: true,
                contactId: true, dueDate: true, status: true,
            },
            orderBy: { createdAt: 'asc' },
        })) as InvoiceRecord[];

        if (data.length < 3) return [];

        // Group by contactId, then check for rapid succession within each group
        const byContact = new Map<string, InvoiceRecord[]>();
        for (const inv of data) {
            const key = inv.contactId || '__no_contact__';
            if (!byContact.has(key)) {
                byContact.set(key, []);
            }
            byContact.get(key)!.push(inv);
        }

        for (const [, group] of byContact) {
            if (group.length < 3) continue;

            // Sort by createdAt ascending
            group.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

            // Sliding window: check for 3+ invoices within 5 minutes
            for (let i = 2; i < group.length; i++) {
                const windowStart = group[i - 2];
                const windowEnd = group[i];
                const timeDiffMs = windowEnd.createdAt.getTime() - windowStart.createdAt.getTime();
                const fiveMinutesMs = 5 * 60 * 1000;

                if (timeDiffMs < fiveMinutesMs) {
                    anomalies.push({
                        id: `anomaly-${windowEnd.id}-rapid-tx`,
                        ruleId: 'RAPID_SUCCESSIVE_TRANSACTIONS',
                        ruleName: 'Transaksi Beruntun Cepat',
                        severity: 'MEDIUM',
                        entityType: 'INVOICE',
                        entityId: windowEnd.id,
                        entityDescription: `Invoice ${windowEnd.invoiceNumber || windowEnd.id}`,
                        message: `${i + 1} invoice dibuat dalam ${Math.round(timeDiffMs / 1000)} detik oleh vendor yang sama`,
                        details: {
                            invoiceCount: i + 1,
                            timeSpanSeconds: Math.round(timeDiffMs / 1000),
                            contactId: windowEnd.contactId || 'Unknown',
                            invoiceIds: group.slice(i - 2, i + 1).map(g => g.id),
                        },
                        suggestedActions: [
                            'Periksa apakah ini batch invoice yang sah',
                            'Verifikasi bahwa tidak ada manipulasi data',
                        ],
                        detectedAt: windowEnd.createdAt.toISOString(),
                        status: 'OPEN',
                    });
                    // Only flag once per group to avoid flooding
                    break;
                }
            }
        }
    } catch (error) {
        logger.error('[AnomalyDetection] Rapid successive transactions check failed', error);
    }

    return anomalies;
}

/**
 * Rule: TAX_MISMATCH
 * Deteksi pajak yang tidak sesuai rate umum (tax < 0% atau > 50% dari subtotal).
 */
async function detectTaxMismatch(
    tenantId: string,
    invoices?: InvoiceRecord[]
): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = [];

    try {
        const data = invoices ?? await prisma.invoice.findMany({
            where: { tenantId },
            select: {
                id: true, invoiceNumber: true, total: true, createdAt: true,
                subtotal: true, taxRate: true, taxAmount: true,
                contactId: true, dueDate: true, status: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 200,
        });

        for (const inv of data) {
            const subtotal = Number(inv.subtotal);
            const taxAmount = Number(inv.taxAmount);
            const taxRate = Number(inv.taxRate);

            if (subtotal <= 0) continue;

            const effectiveTaxRate = (taxAmount / subtotal) * 100;

            // Flag if tax rate is negative or exceeds 50% of subtotal
            const hasAnomaly = effectiveTaxRate < 0 || effectiveTaxRate > 50;

            // Also flag if expected tax (subtotal * taxRate / 100) differs significantly from actual taxAmount
            const expectedTax = subtotal * (taxRate / 100);
            const taxVariance = Math.abs(taxAmount - expectedTax);
            const significantVariance = taxVariance > 1000 && taxVariance > expectedTax * 0.1;

            if (hasAnomaly || significantVariance) {
                anomalies.push({
                    id: `anomaly-${inv.id}-tax-mismatch`,
                    ruleId: 'TAX_MISMATCH',
                    ruleName: 'Pajak Tidak Cocok',
                    severity: 'HIGH',
                    entityType: 'INVOICE',
                    entityId: inv.id,
                    entityDescription: `Invoice ${inv.invoiceNumber || inv.id}`,
                    message: hasAnomaly
                        ? `Effective tax rate ${effectiveTaxRate.toFixed(1)}% tidak wajar (subtotal: Rp ${subtotal.toLocaleString('id-ID')}, tax: Rp ${taxAmount.toLocaleString('id-ID')})`
                        : `Tax amount Rp ${taxAmount.toLocaleString('id-ID')} berbeda signifikan dari expected Rp ${Math.round(expectedTax).toLocaleString('id-ID')} (variance: Rp ${Math.round(taxVariance).toLocaleString('id-ID')})`,
                    details: {
                        subtotal,
                        taxAmount,
                        taxRate,
                        effectiveTaxRate: Math.round(effectiveTaxRate * 100) / 100,
                        expectedTax: Math.round(expectedTax),
                        variance: Math.round(taxVariance),
                        hasAnomaly,
                        significantVariance,
                    },
                    suggestedActions: [
                        'Verifikasi perhitungan pajak dengan rate yang berlaku',
                        'Pastikan tax code dan tax rate sesuai',
                        'Cek apakah ada penyesuaian pajak yang valid',
                    ],
                    detectedAt: inv.createdAt.toISOString(),
                    status: 'OPEN',
                });
            }
        }
    } catch (error) {
        logger.error('[AnomalyDetection] Tax mismatch check failed', error);
    }

    return anomalies;
}

/**
 * Rule: ROUND_TRIP_TRANSACTION
 * Deteksi pasangan invoice dengan amount yang sama dari/to vendor yang sama dalam waktu 7 hari.
 * Indikasi transaksi bolak-balik (potential fraud/kickback).
 */
async function detectRoundTripTransactions(
    tenantId: string,
    invoices?: InvoiceRecord[]
): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = [];

    try {
        const data = (invoices ?? await prisma.invoice.findMany({
            where: { tenantId },
            select: {
                id: true, invoiceNumber: true, total: true, createdAt: true,
                subtotal: true, taxRate: true, taxAmount: true,
                contactId: true, dueDate: true, status: true,
            },
            orderBy: { createdAt: 'desc' },
        })) as InvoiceRecord[];

        if (data.length < 2) return [];

        // Group by contactId
        const byContact = new Map<string, InvoiceRecord[]>();
        for (const inv of data) {
            if (!inv.contactId) continue;
            if (!byContact.has(inv.contactId)) {
                byContact.set(inv.contactId, []);
            }
            byContact.get(inv.contactId)!.push(inv);
        }

        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

        for (const [, group] of byContact) {
            if (group.length < 2) continue;

            // Check all pairs within 7 days
            for (let i = 0; i < group.length; i++) {
                for (let j = i + 1; j < group.length; j++) {
                    const a = group[i];
                    const b = group[j];
                    const amountA = Number(a.total);
                    const amountB = Number(b.total);
                    const timeDiff = Math.abs(a.createdAt.getTime() - b.createdAt.getTime());

                    if (timeDiff <= sevenDaysMs && amountA === amountB && amountA > 0) {
                        anomalies.push({
                            id: `anomaly-${b.id}-round-trip`,
                            ruleId: 'ROUND_TRIP_TRANSACTION',
                            ruleName: 'Transaksi Bolak-balik',
                            severity: 'CRITICAL',
                            entityType: 'INVOICE',
                            entityId: b.id,
                            entityDescription: `Invoice ${b.invoiceNumber || b.id}`,
                            message: `Invoice "${b.invoiceNumber}" dan "${a.invoiceNumber}" memiliki jumlah sama (Rp ${amountA.toLocaleString('id-ID')}) dari vendor yang sama dalam ${Math.round(timeDiff / (24 * 60 * 60 * 1000))} hari`,
                            details: {
                                amount: amountA,
                                pairedInvoiceId: a.id,
                                pairedInvoiceNumber: a.invoiceNumber,
                                contactId: b.contactId,
                                timeSpanDays: Math.round(timeDiff / (24 * 60 * 60 * 1000)),
                                invoiceADate: a.createdAt.toISOString(),
                                invoiceBDate: b.createdAt.toISOString(),
                            },
                            suggestedActions: [
                                'Investigasi segera — indikasi transaksi bolak-balik',
                                'Periksa hubungan antara vendor dan perusahaan',
                                'Verifikasi bukti pendukung untuk kedua invoice',
                            ],
                            detectedAt: b.createdAt.toISOString(),
                            status: 'OPEN',
                        });
                        // Only flag once per pair
                        break;
                    }
                }
            }
        }
    } catch (error) {
        logger.error('[AnomalyDetection] Round-trip check failed', error);
    }

    return anomalies;
}

/**
 * Rule: BACKDATED_TRANSACTION
 * Deteksi invoice dengan dueDate lebih dari 90 hari dari createdAt
 * (indikasi transaksi antidate lama / backdating).
 */
async function detectBackdatedTransactions(
    tenantId: string,
    invoices?: InvoiceRecord[]
): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = [];

    try {
        const data = invoices ?? await prisma.invoice.findMany({
            where: { tenantId },
            select: {
                id: true, invoiceNumber: true, total: true, createdAt: true,
                subtotal: true, taxRate: true, taxAmount: true,
                contactId: true, dueDate: true, status: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;

        for (const inv of data) {
            const daysDiff = inv.dueDate.getTime() - inv.createdAt.getTime();

            // Flag if dueDate is more than 90 days from createdAt (unusual terms)
            if (daysDiff > ninetyDaysMs) {
                const daysCount = Math.round(daysDiff / (24 * 60 * 60 * 1000));
                anomalies.push({
                    id: `anomaly-${inv.id}-backdated`,
                    ruleId: 'BACKDATED_TRANSACTION',
                    ruleName: 'Transaksi Antidate',
                    severity: 'MEDIUM',
                    entityType: 'INVOICE',
                    entityId: inv.id,
                    entityDescription: `Invoice ${inv.invoiceNumber || inv.id}`,
                    message: `Invoice "${inv.invoiceNumber}" memiliki jatuh tempo ${daysCount} hari dari tanggal pembuatan (indikasi backdating)`,
                    details: {
                        createdAt: inv.createdAt.toISOString(),
                        dueDate: inv.dueDate.toISOString(),
                        daysDifference: daysCount,
                        threshold: 90,
                    },
                    suggestedActions: [
                        'Verifikasi tanggal pembuatan invoice yang sebenarnya',
                        'Pastikan tidak ada manipulasi tanggal',
                    ],
                    detectedAt: inv.createdAt.toISOString(),
                    status: 'OPEN',
                });
            }
        }
    } catch (error) {
        logger.error('[AnomalyDetection] Backdated check failed', error);
    }

    return anomalies;
}

// ─── Entity-Extension Detectors (Payment, PO, JournalEntry) ─────────────────

/**
 * Scan Payment entities for unusual patterns:
 * - Large single payments (> 3x average)
 * - Rapid successive payments to same method
 */
async function detectPaymentAnomalies(
    tenantId: string,
    payments: PaymentRecord[]
): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = [];

    try {
        if (payments.length < 2) return [];

        // 1. Large payment detection
        const avgPayment = payments.reduce((sum, p) => sum + Number(p.amount), 0) / payments.length;
        const largeThreshold = avgPayment * 3;

        for (const p of payments) {
            const amount = Number(p.amount);
            if (amount > largeThreshold && amount > 5000000) {
                anomalies.push({
                    id: `anomaly-${p.id}-large-payment`,
                    ruleId: 'LARGE_EXPENSE',
                    ruleName: 'Pembayaran Besar',
                    severity: 'HIGH',
                    entityType: 'PAYMENT',
                    entityId: p.id,
                    entityDescription: `Payment ${p.paymentNumber}`,
                    message: `Pembayaran Rp ${amount.toLocaleString('id-ID')} melebihi 3x rata-rata (Rp ${Math.round(avgPayment).toLocaleString('id-ID')})`,
                    details: {
                        amount,
                        average: Math.round(avgPayment),
                        threshold: Math.round(largeThreshold),
                        method: p.method,
                        type: p.type,
                    },
                    suggestedActions: [
                        'Verifikasi bukti pembayaran',
                        'Pastikan approval yang sesuai untuk nominal besar',
                    ],
                    detectedAt: p.createdAt.toISOString(),
                    status: 'OPEN',
                });
            }
        }

        // 2. Rapid successive payments (3+ within 5 minutes, same method)
        const byMethod = new Map<string, PaymentRecord[]>();
        for (const p of payments) {
            if (!byMethod.has(p.method)) {
                byMethod.set(p.method, []);
            }
            byMethod.get(p.method)!.push(p);
        }

        const fiveMinutesMs = 5 * 60 * 1000;
        for (const [, group] of byMethod) {
            if (group.length < 3) continue;
            group.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

            for (let i = 2; i < group.length; i++) {
                const windowStart = group[i - 2];
                const windowEnd = group[i];
                const timeDiff = windowEnd.createdAt.getTime() - windowStart.createdAt.getTime();

                if (timeDiff < fiveMinutesMs) {
                    anomalies.push({
                        id: `anomaly-${windowEnd.id}-rapid-payment`,
                        ruleId: 'RAPID_SUCCESSIVE_TRANSACTIONS',
                        ruleName: 'Pembayaran Beruntun Cepat',
                        severity: 'MEDIUM',
                        entityType: 'PAYMENT',
                        entityId: windowEnd.id,
                        entityDescription: `Payment ${windowEnd.paymentNumber}`,
                        message: `${i + 1} pembayaran via ${windowEnd.method} dalam ${Math.round(timeDiff / 1000)} detik`,
                        details: {
                            paymentCount: i + 1,
                            timeSpanSeconds: Math.round(timeDiff / 1000),
                            method: windowEnd.method,
                        },
                        suggestedActions: [
                            'Periksa apakah ini batch pembayaran yang sah',
                        ],
                        detectedAt: windowEnd.createdAt.toISOString(),
                        status: 'OPEN',
                    });
                    break;
                }
            }
        }
    } catch (error) {
        logger.error('[AnomalyDetection] Payment anomaly check failed', error);
    }

    return anomalies;
}

/**
 * Scan PurchaseOrder entities for:
 * - Large PO amounts (> 3x average)
 * - Tax mismatches on POs
 */
async function detectPurchaseOrderAnomalies(
    tenantId: string,
    purchaseOrders: PurchaseOrderRecord[]
): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = [];

    try {
        if (purchaseOrders.length < 2) return [];

        // 1. Large PO detection
        const avgTotal = purchaseOrders.reduce((sum, po) => sum + Number(po.total), 0) / purchaseOrders.length;
        const largeThreshold = avgTotal * 3;

        for (const po of purchaseOrders) {
            const total = Number(po.total);
            if (total > largeThreshold && total > 10000000) {
                anomalies.push({
                    id: `anomaly-${po.id}-large-po`,
                    ruleId: 'LARGE_EXPENSE',
                    ruleName: 'Purchase Order Besar',
                    severity: 'HIGH',
                    entityType: 'PURCHASE_ORDER',
                    entityId: po.id,
                    entityDescription: `PO ${po.poNumber}`,
                    message: `Purchase Order senilai Rp ${total.toLocaleString('id-ID')} melebihi 3x rata-rata (Rp ${Math.round(avgTotal).toLocaleString('id-ID')})`,
                    details: {
                        total,
                        average: Math.round(avgTotal),
                        threshold: Math.round(largeThreshold),
                        status: po.status,
                    },
                    suggestedActions: [
                        'Verifikasi detail PO dengan vendor',
                        'Pastikan approval berjenang untuk nominal besar',
                    ],
                    detectedAt: po.createdAt.toISOString(),
                    status: 'OPEN',
                });
            }
        }

        // 2. Tax mismatch on POs
        for (const po of purchaseOrders) {
            const subtotal = Number(po.subtotal);
            const taxAmount = Number(po.taxAmount);
            const taxRate = Number(po.taxRate);

            if (subtotal <= 0) continue;

            const effectiveTaxRate = (taxAmount / subtotal) * 100;
            if (effectiveTaxRate < 0 || effectiveTaxRate > 50) {
                anomalies.push({
                    id: `anomaly-${po.id}-po-tax`,
                    ruleId: 'TAX_MISMATCH',
                    ruleName: 'Pajak PO Tidak Cocok',
                    severity: 'HIGH',
                    entityType: 'PURCHASE_ORDER',
                    entityId: po.id,
                    entityDescription: `PO ${po.poNumber}`,
                    message: `Effective tax rate ${effectiveTaxRate.toFixed(1)}% pada PO "${po.poNumber}" tidak wajar`,
                    details: {
                        subtotal,
                        taxAmount,
                        taxRate,
                        effectiveTaxRate: Math.round(effectiveTaxRate * 100) / 100,
                    },
                    suggestedActions: [
                        'Verifikasi perhitungan pajak pada PO',
                    ],
                    detectedAt: po.createdAt.toISOString(),
                    status: 'OPEN',
                });
            }
        }
    } catch (error) {
        logger.error('[AnomalyDetection] Purchase order anomaly check failed', error);
    }

    return anomalies;
}

/**
 * Scan JournalEntry entities for:
 * - Imbalanced debit/credit (totalDebit != totalCredit)
 * - Large journal entries
 */
async function detectJournalEntryAnomalies(
    tenantId: string,
    journalEntries: JournalEntryRecord[]
): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = [];

    try {
        if (journalEntries.length === 0) return [];

        // 1. Imbalanced entries (debit != credit)
        for (const je of journalEntries) {
            const debit = Number(je.totalDebit);
            const credit = Number(je.totalCredit);
            const diff = Math.abs(debit - credit);

            if (diff > 1 && je.status !== 'VOID') {
                anomalies.push({
                    id: `anomaly-${je.id}-imbalance`,
                    ruleId: 'TAX_MISMATCH',
                    ruleName: 'Jurnal Tidak Seimbang',
                    severity: 'HIGH',
                    entityType: 'JOURNAL_ENTRY',
                    entityId: je.id,
                    entityDescription: `Journal ${je.entryNumber}`,
                    message: `Jurnal "${je.entryNumber}" tidak seimbang — debit Rp ${debit.toLocaleString('id-ID')} vs credit Rp ${credit.toLocaleString('id-ID')} (selisih: Rp ${diff.toLocaleString('id-ID')})`,
                    details: {
                        totalDebit: debit,
                        totalCredit: credit,
                        difference: diff,
                        status: je.status,
                        sourceType: je.sourceType,
                    },
                    suggestedActions: [
                        'Periksa posting jurnal — debit dan credit harus sama',
                        'Verifikasi apakah ada jurnal yang belum lengkap',
                    ],
                    detectedAt: je.createdAt.toISOString(),
                    status: 'OPEN',
                });
            }
        }

        // 2. Large journal entries (> 100M)
        const largeThreshold = 100000000;
        for (const je of journalEntries) {
            const debit = Number(je.totalDebit);
            if (debit > largeThreshold) {
                anomalies.push({
                    id: `anomaly-${je.id}-large-journal`,
                    ruleId: 'LARGE_EXPENSE',
                    ruleName: 'Jurnal Besar',
                    severity: 'HIGH',
                    entityType: 'JOURNAL_ENTRY',
                    entityId: je.id,
                    entityDescription: `Journal ${je.entryNumber}`,
                    message: `Jurnal "${je.entryNumber}" bernilai Rp ${debit.toLocaleString('id-ID')} melebihi threshold Rp ${largeThreshold.toLocaleString('id-ID')}`,
                    details: {
                        totalDebit: debit,
                        totalCredit: Number(je.totalCredit),
                        threshold: largeThreshold,
                        sourceType: je.sourceType,
                    },
                    suggestedActions: [
                        'Verifikasi detail jurnal dengan dokumen pendukung',
                        'Pastikan approval untuk jurnal bernilai besar',
                    ],
                    detectedAt: je.createdAt.toISOString(),
                    status: 'OPEN',
                });
            }
        }
    } catch (error) {
        logger.error('[AnomalyDetection] Journal entry anomaly check failed', error);
    }

    return anomalies;
}

// ─── Email Notification Layer ──────────────────────────────────────────────

/**
 * Send email notifications for CRITICAL and HIGH severity anomalies.
 * Notifies all ADMIN/SUPERADMIN users of the tenant.
 * Fire-and-forget: notification failure should NOT break the scan.
 */
async function notifyCriticalAnomalies(
    tenantId: string,
    anomalies: AnomalyDetection[]
): Promise<void> {
    const criticalAnomalies = anomalies.filter(
        a => a.severity === 'CRITICAL' || a.severity === 'HIGH'
    );

    if (criticalAnomalies.length === 0) return;

    try {
        const { sendEmail } = await import('@/lib/email');
        const { prisma: db } = await import('@/lib/db');

        // Get tenant admin emails
        const admins = await db.user.findMany({
            where: { tenantId, role: { in: ['ADMIN', 'SUPERADMIN'] } },
            select: { email: true, name: true },
        });

        if (admins.length === 0) return;

        const subject = `⚠️ ${criticalAnomalies.length} Anomali Terdeteksi — Qalcuity`;

        // Build HTML content
        const anomalyRows = criticalAnomalies.map(a => {
            const severityColor = a.severity === 'CRITICAL' ? '#DC2626' : '#EA580C';
            return `
              <tr>
                <td style="padding:8px;border:1px solid #ddd;color:${severityColor};font-weight:bold;">${a.severity}</td>
                <td style="padding:8px;border:1px solid #ddd;">${a.ruleName}</td>
                <td style="padding:8px;border:1px solid #ddd;">${a.entityType}</td>
                <td style="padding:8px;border:1px solid #ddd;">${a.message}</td>
              </tr>`;
        }).join('');

        const baseUrl = process.env.NEXTAUTH_URL || 'https://qalcuity.com';
        const html = `
          <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;">
            <h2 style="color:#1F2937;">⚠️ Anomali Terdeteksi</h2>
            <p style="color:#4B5563;">Sistem Qalcuity telah mendeteksi <strong>${criticalAnomalies.length} anomali</strong> yang membutuhkan perhatian:</p>
            <table style="border-collapse:collapse;width:100%;margin:16px 0;">
              <thead>
                <tr>
                  <th style="padding:8px;border:1px solid #ddd;background:#F5F5F5;text-align:left;">Severity</th>
                  <th style="padding:8px;border:1px solid #ddd;background:#F5F5F5;text-align:left;">Rule</th>
                  <th style="padding:8px;border:1px solid #ddd;background:#F5F5F5;text-align:left;">Entity</th>
                  <th style="padding:8px;border:1px solid #ddd;background:#F5F5F5;text-align:left;">Message</th>
                </tr>
              </thead>
              <tbody>${anomalyRows}</tbody>
            </table>
            <p style="margin-top:16px;">
              <a href="${baseUrl}/dashboard/ai/anomalies"
                 style="display:inline-block;padding:10px 20px;background:#2563EB;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">
                Lihat Detail di Dashboard →
              </a>
            </p>
            <p style="color:#9CA3AF;font-size:12px;margin-top:24px;">
              Email ini dikirim otomatis oleh sistem Qalcuity Anomaly Detection.
            </p>
          </div>`;

        // Send to all admins
        for (const admin of admins) {
            await sendEmail({
                to: admin.email,
                subject,
                html,
            }).catch(err => {
                logger.error(`[AnomalyDetection] Failed to send email to ${admin.email}`, err);
            });
        }

        logger.info(`[AnomalyDetection] Sent anomaly notification to ${admins.length} admin(s)`);
    } catch (error) {
        logger.error('[AnomalyDetection] Failed to send anomaly notifications', error);
        // Don't throw — notification failure shouldn't break the scan
    }
}

// ─── Persistence Layer ──────────────────────────────────────────────────────

/**
 * Persist anomaly results to the AnomalyDetection table.
 * Uses findFirst + create/update pattern (no @@unique constraint required).
 * Fire-and-forget: persistence failure should NOT break the scan.
 */
async function persistAnomalies(
    tenantId: string,
    anomalies: AnomalyDetection[]
): Promise<void> {
    if (anomalies.length === 0) return;

    try {
        for (const anomaly of anomalies) {
            const existing = await prisma.anomalyDetection.findFirst({
                where: {
                    tenantId,
                    ruleId: anomaly.ruleId,
                    entityId: anomaly.entityId,
                },
            });

            const suggestedActionsJson = anomaly.suggestedActions?.length > 0
                ? JSON.stringify(anomaly.suggestedActions)
                : undefined;

            if (existing) {
                await prisma.anomalyDetection.update({
                    where: { id: existing.id },
                    data: {
                        message: anomaly.message,
                        details: (anomaly.details as Prisma.InputJsonValue) || undefined,
                        suggestedActions: suggestedActionsJson,
                        aiAnalysis: anomaly.details?.aiSuggestion as string || null,
                        detectedAt: new Date(anomaly.detectedAt),
                    },
                });
            } else {
                await prisma.anomalyDetection.create({
                    data: {
                        tenantId,
                        ruleId: anomaly.ruleId,
                        ruleName: anomaly.ruleName,
                        severity: anomaly.severity,
                        category: ANOMALY_RULES.find(r => r.id === anomaly.ruleId)?.category || 'unknown',
                        entityType: anomaly.entityType,
                        entityId: anomaly.entityId,
                        message: anomaly.message,
                        details: (anomaly.details as Prisma.InputJsonValue) || undefined,
                        suggestedActions: suggestedActionsJson,
                        aiRiskScore: anomaly.details?.aiRiskScore as number || null,
                        aiAnalysis: anomaly.details?.aiSuggestion as string || null,
                        detectedAt: new Date(anomaly.detectedAt),
                    },
                });
            }
        }
    } catch (error) {
        logger.error('[AnomalyDetection] Failed to persist anomalies', error);
        // Don't throw — persistence failure shouldn't break the scan
    }
}

// ─── AI-Powered Analysis ─────────────────────────────────────────────────────

async function analyzeWithAI(
    anomalies: AnomalyDetection[],
    tenantId: string
): Promise<AnomalyDetection[]> {
    if (anomalies.length === 0) return [];

    const provider = getAIProvider();

    const anomalySummary = anomalies.slice(0, 10).map((a) => ({
        rule: a.ruleName,
        severity: a.severity,
        entity: a.entityDescription,
        message: a.message,
    }));

    const messages: AIChatMessage[] = [
        {
            role: 'system',
            content: `Anda adalah AI Security Analyst untuk sistem akuntansi bisnis.
Analisis anomali transaksi berikut dan berikan:
1. Skor risiko (1-10) untuk setiap anomali
2. Saran tindakan yang lebih spesifik
3. Identifikasi pola yang mungkin terlewatkan

Return dalam format JSON:
{
  "enhancedAnomalies": [
    {
      "originalIndex": 0,
      "aiRiskScore": 7,
      "aiSuggestion": "saran spesifik",
      "additionalFindings": "temuan tambahan jika ada"
    }
  ],
  "patternAnalysis": "analisis pola umum"
}`,
        },
        {
            role: 'user',
            content: `Analisis anomali transaksi berikut:\n\n${JSON.stringify(anomalySummary, null, 2)}`,
        },
    ];

    try {
        const response = await provider.chat(messages, {
            temperature: 0.3,
            maxTokens: 1500,
        });

        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const aiResult = JSON.parse(jsonMatch[0]) as {
                enhancedAnomalies?: Array<{
                    originalIndex: number;
                    aiRiskScore: number;
                    aiSuggestion: string;
                }>;
            };

            // Enrich anomalies with AI insights
            if (aiResult.enhancedAnomalies) {
                for (const enhancement of aiResult.enhancedAnomalies) {
                    if (anomalies[enhancement.originalIndex]) {
                        anomalies[enhancement.originalIndex].details = {
                            ...anomalies[enhancement.originalIndex].details,
                            aiRiskScore: enhancement.aiRiskScore,
                            aiSuggestion: enhancement.aiSuggestion,
                        };
                        // Escalate severity if AI risk score is high
                        if (enhancement.aiRiskScore >= 8 && anomalies[enhancement.originalIndex].severity !== 'CRITICAL') {
                            anomalies[enhancement.originalIndex].severity = 'HIGH';
                        }
                    }
                }
            }
        }
    } catch (error) {
        logger.error('[AnomalyDetection] AI analysis failed', error);
        // Continue without AI enrichment
    }

    return anomalies;
}

// ─── Main Scan Function ──────────────────────────────────────────────────────

/**
 * Run a full anomaly scan for a tenant.
 * Combines rule-based detection (12 rules) with AI-powered analysis.
 * Covers: Invoice, Payment, PurchaseOrder, JournalEntry entities.
 * Results are persisted to AnomalyDetection table (fire-and-forget).
 */
export async function runAnomalyScan(tenantId: string): Promise<AnomalyScanResult> {
    const startTime = Date.now();

    // ── Fetch all entity data upfront for efficiency ──
    const [allInvoices, allPayments, allPurchaseOrders, allJournalEntries] = await Promise.all([
        prisma.invoice.findMany({
            where: { tenantId },
            select: {
                id: true, invoiceNumber: true, total: true, subtotal: true,
                taxRate: true, taxAmount: true, contactId: true, createdAt: true,
                dueDate: true, status: true,
                contact: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
        }),
        prisma.payment.findMany({
            where: { tenantId },
            select: {
                id: true, paymentNumber: true, amount: true, paymentDate: true,
                method: true, status: true, type: true, createdAt: true,
                invoiceId: true,
            },
            orderBy: { createdAt: 'desc' },
        }),
        prisma.purchaseOrder.findMany({
            where: { tenantId },
            select: {
                id: true, poNumber: true, status: true, orderDate: true,
                total: true, subtotal: true, taxRate: true, taxAmount: true,
                supplierId: true, createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        }),
        prisma.journalEntry.findMany({
            where: { tenantId },
            select: {
                id: true, entryNumber: true, date: true, description: true,
                totalDebit: true, totalCredit: true, status: true,
                sourceType: true, createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        }),
    ]);

    // Cast to our local types for type-safe detector functions
    const invoices = allInvoices as unknown as InvoiceRecord[];
    const payments = allPayments as unknown as PaymentRecord[];
    const purchaseOrders = allPurchaseOrders as unknown as PurchaseOrderRecord[];
    const journalEntries = allJournalEntries as unknown as JournalEntryRecord[];

    // ── Run all 12 rule-based detections + 3 entity-extension detectors in parallel ──
    const [
        unusualAmounts, duplicates, weekends, roundNumbers, newVendorLarge,
        invoiceGaps, unusualTimes, largeExpenses, rapidTransactions,
        taxMismatches, roundTrips, backdated,
        paymentAnomalies, poAnomalies, journalAnomalies,
    ] = await Promise.all([
        detectUnusualAmount(tenantId, invoices),
        detectDuplicateTransactions(tenantId, invoices),
        detectWeekendTransactions(tenantId, invoices),
        detectRoundNumbers(tenantId, invoices),
        detectNewVendorLargeAmount(tenantId, invoices),
        detectInvoiceNumberGap(tenantId, invoices),
        detectUnusualTime(tenantId, invoices),
        detectLargeExpense(tenantId, invoices),
        detectRapidSuccessiveTransactions(tenantId, invoices),
        detectTaxMismatch(tenantId, invoices),
        detectRoundTripTransactions(tenantId, invoices),
        detectBackdatedTransactions(tenantId, invoices),
        detectPaymentAnomalies(tenantId, payments),
        detectPurchaseOrderAnomalies(tenantId, purchaseOrders),
        detectJournalEntryAnomalies(tenantId, journalEntries),
    ]);

    let allAnomalies = [
        ...unusualAmounts,
        ...duplicates,
        ...weekends,
        ...roundNumbers,
        ...newVendorLarge,
        ...invoiceGaps,
        ...unusualTimes,
        ...largeExpenses,
        ...rapidTransactions,
        ...taxMismatches,
        ...roundTrips,
        ...backdated,
        ...paymentAnomalies,
        ...poAnomalies,
        ...journalAnomalies,
    ];

    // Deduplicate anomalies by entityId + ruleId
    const seen = new Set<string>();
    allAnomalies = allAnomalies.filter((a) => {
        const key = `${a.entityId}-${a.ruleId}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    // Sort by severity
    const severityOrder: Record<AnomalySeverity, number> = {
        CRITICAL: 0,
        HIGH: 1,
        MEDIUM: 2,
        LOW: 3,
    };
    allAnomalies.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    // AI-powered analysis (optional enrichment)
    allAnomalies = await analyzeWithAI(allAnomalies, tenantId);

    const scanDuration = Date.now() - startTime;

    // Count total entities scanned across all types
    const scannedEntities = invoices.length + payments.length + purchaseOrders.length + journalEntries.length;

    // Persist anomalies to DB (fire-and-forget — don't await)
    persistAnomalies(tenantId, allAnomalies).catch((err) => logger.error('[AnomalyDetection] Failed to persist anomalies (async)', err));

    // Send email notifications for CRITICAL/HIGH anomalies (fire-and-forget)
    notifyCriticalAnomalies(tenantId, allAnomalies).catch((err) => logger.error('[AnomalyDetection] Failed to notify anomalies (async)', err));

    return {
        anomalies: allAnomalies,
        scannedEntities,
        scanDuration,
        scannedAt: new Date().toISOString(),
        summary: {
            total: allAnomalies.length,
            critical: allAnomalies.filter((a) => a.severity === 'CRITICAL').length,
            high: allAnomalies.filter((a) => a.severity === 'HIGH').length,
            medium: allAnomalies.filter((a) => a.severity === 'MEDIUM').length,
            low: allAnomalies.filter((a) => a.severity === 'LOW').length,
        },
    };
}

/**
 * Get anomaly rules configuration.
 */
export function getAnomalyRules(): AnomalyRule[] {
    return ANOMALY_RULES;
}

/**
 * Get severity color for UI display.
 */
export function getSeverityColor(severity: AnomalySeverity): string {
    switch (severity) {
        case 'CRITICAL': return 'text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
        case 'HIGH': return 'text-orange-700 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400';
        case 'MEDIUM': return 'text-yellow-700 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400';
        case 'LOW': return 'text-blue-700 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400';
        default: return 'text-gray-700 bg-gray-100';
    }
}

/**
 * Get status color for UI display.
 */
export function getStatusColor(status: AnomalyStatus): string {
    switch (status) {
        case 'OPEN': return 'text-red-700 bg-red-50 dark:bg-red-900/20 dark:text-red-400';
        case 'INVESTIGATING': return 'text-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400';
        case 'BLOCKED': return 'text-purple-700 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400';
        case 'DISMISSED': return 'text-gray-700 bg-gray-50 dark:bg-gray-800 dark:text-gray-400';
        default: return 'text-gray-700 bg-gray-100';
    }
}
