// ─── Anomaly Detection Engine ────────────────────────────────────────────────
// Deteksi transaksi mencurigakan menggunakan rule-based + AI analysis.

import { getAIProvider, type AIChatMessage } from './provider';
import { prisma } from '@/lib/db';

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
        description: 'Pengeluaran melebihi threshold tertentu',
        severity: 'HIGH',
        category: 'amount',
    },
    {
        id: 'RAPID_SUCCESSIVE_TRANSACTIONS',
        name: 'Transaksi Beruntun Cepat',
        description: 'Lebih dari 3 transaksi dalam 1 jam',
        severity: 'MEDIUM',
        category: 'pattern',
    },
    {
        id: 'TAX_MISMATCH',
        name: 'Pajak Tidak Cocok',
        description: 'Perhitungan pajak tidak sesuai dengan rate yang berlaku',
        severity: 'HIGH',
        category: 'compliance',
    },
    {
        id: 'ROUND_TRIP_TRANSACTION',
        name: 'Transaksi Bolak-balik',
        description: 'Pembayaran ke vendor yang juga menjadi customer dengan jumlah mirip',
        severity: 'CRITICAL',
        category: 'fraud',
    },
    {
        id: 'BACKDATED_TRANSACTION',
        name: 'Transaksi Antidate',
        description: 'Invoice dengan tanggal lebih lama dari 30 hari yang lalu',
        severity: 'MEDIUM',
        category: 'timing',
    },
];

// ─── Rule-Based Detection Functions ──────────────────────────────────────────

async function detectUnusualAmount(tenantId: string): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = [];

    try {
        // Get average invoice amount
        const invoices = await prisma.invoice.findMany({
            where: { tenantId },
            select: { id: true, total: true, invoiceNumber: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });

        if (invoices.length < 3) return [];

        const avg = invoices.reduce((sum, inv) => sum + Number(inv.total), 0) / invoices.length;
        const threshold = avg * 2;

        for (const inv of invoices) {
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
        console.error('[AnomalyDetection] Unusual amount check failed:', error instanceof Error ? error.message : 'Unknown');
    }

    return anomalies;
}

async function detectDuplicateTransactions(tenantId: string): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = [];

    try {
        const recentInvoices = await prisma.invoice.findMany({
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
            },
            orderBy: { createdAt: 'desc' },
        });

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
                            'Hapus jika ini adalah duplikat录入',
                        ],
                        detectedAt: group[i].createdAt.toISOString(),
                        status: 'OPEN',
                    });
                }
            }
        }
    } catch (error) {
        console.error('[AnomalyDetection] Duplicate check failed:', error instanceof Error ? error.message : 'Unknown');
    }

    return anomalies;
}

async function detectWeekendTransactions(tenantId: string): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = [];

    try {
        const recentInvoices = await prisma.invoice.findMany({
            where: {
                tenantId,
                createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
            },
            select: {
                id: true,
                invoiceNumber: true,
                total: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });

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
        console.error('[AnomalyDetection] Weekend check failed:', error instanceof Error ? error.message : 'Unknown');
    }

    return anomalies;
}

async function detectRoundNumbers(tenantId: string): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = [];

    try {
        const invoices = await prisma.invoice.findMany({
            where: { tenantId },
            select: { id: true, invoiceNumber: true, total: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });

        for (const inv of invoices) {
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
        console.error('[AnomalyDetection] Round number check failed:', error instanceof Error ? error.message : 'Unknown');
    }

    return anomalies;
}

async function detectNewVendorLargeAmount(tenantId: string): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = [];

    try {
        const invoices = await prisma.invoice.findMany({
            where: { tenantId },
            select: {
                id: true,
                invoiceNumber: true,
                total: true,
                contactId: true,
                contact: { select: { name: true } },
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });

        // Find contacts that only appear once
        const contactCounts = new Map<string, number>();
        for (const inv of invoices) {
            const contactKey = inv.contactId || 'unknown';
            contactCounts.set(contactKey, (contactCounts.get(contactKey) || 0) + 1);
        }

        for (const inv of invoices) {
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
        console.error('[AnomalyDetection] New vendor check failed:', error instanceof Error ? error.message : 'Unknown');
    }

    return anomalies;
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
        console.error('[AnomalyDetection] AI analysis failed:', error instanceof Error ? error.message : 'Unknown');
        // Continue without AI enrichment
    }

    return anomalies;
}

// ─── Main Scan Function ──────────────────────────────────────────────────────

/**
 * Run a full anomaly scan for a tenant.
 * Combines rule-based detection with AI-powered analysis.
 */
export async function runAnomalyScan(tenantId: string): Promise<AnomalyScanResult> {
    const startTime = Date.now();

    // Run all rule-based detections in parallel
    const [unusualAmounts, duplicates, weekends, roundNumbers, newVendorLarge] = await Promise.all([
        detectUnusualAmount(tenantId),
        detectDuplicateTransactions(tenantId),
        detectWeekendTransactions(tenantId),
        detectRoundNumbers(tenantId),
        detectNewVendorLargeAmount(tenantId),
    ]);

    let allAnomalies = [
        ...unusualAmounts,
        ...duplicates,
        ...weekends,
        ...roundNumbers,
        ...newVendorLarge,
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

    // Count total entities scanned
    const scannedEntities = await prisma.invoice.count({ where: { tenantId } });

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
