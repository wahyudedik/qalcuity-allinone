// ─── Finance Agent ──────────────────────────────────────────────────────────
// Provides financial insights: cash flow prediction, expense categorization,
// payment reminders, and financial health analysis.
// Uses statistical analysis for trend prediction and anomaly detection.

import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import {
    mean,
    trendDirection,
    simpleMovingAverage,
    descriptiveStats,
    type TrendAnalysis,
} from '@/lib/ai/statistical-analysis';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface CashFlowDay {
    date: string;
    predicted: number;
    confidence: number;
}

export interface CashFlowPrediction {
    daily: CashFlowDay[];
    summary: string;
    trend: TrendAnalysis;
    totalPredicted: number;
    averageDaily: number;
}

export interface ExpenseCategorization {
    category: string;
    subcategory: string;
    confidence: number;
    possibleCategories: Array<{ category: string; confidence: number }>;
}

export interface PaymentReminder {
    invoiceId: string;
    invoiceNumber: string;
    contactName: string;
    total: number;
    dueDate: string;
    daysUntilDue: number;
    urgency: 'critical' | 'high' | 'medium' | 'low';
    suggestedAction: string;
}

export interface FinancialInsights {
    revenue: {
        total: number;
        thisMonth: number;
        lastMonth: number;
        changePercent: number;
    };
    expenses: {
        total: number;
        thisMonth: number;
        lastMonth: number;
        changePercent: number;
    };
    profit: {
        gross: number;
        net: number;
        margin: number;
    };
    trends: TrendAnalysis;
    anomalies: Array<{ type: string; description: string; severity: string }>;
    summary: string;
}

// ─── Expense Category Mapping ───────────────────────────────────────────────

const EXPENSE_KEYWORDS: Record<string, Record<string, string[]>> = {
    'Operasional': {
        'Listrik & Air': ['listrik', 'air', 'pln', 'pdam', 'token listrik', 'token air'],
        'Sewa': ['sewa', 'rent', 'kontrak gedung', 'sewa tempat'],
        'Internet & Telekom': ['internet', 'telekom', 'telkom', 'indosat', 'xl', 'tri', 'smartfren'],
        'Perlengkapan Kantor': ['kertas', 'printer', 'toner', 'pensil', 'kertas', 'ATK', 'perlengkapan kantor'],
        'Transport & Logistik': ['bensin', 'bbm', 'transport', 'logistik', 'pengiriman', 'ekspedisi', 'grab', 'gojek'],
    },
    'Gaji & Benefit': {
        'Gaji Pokok': ['gaji', 'salary', 'upah', 'honor'],
        'Bonus & Insentif': ['bonus', 'insentif', 'insentive', 'komisi'],
        'BPJS & Asuransi': ['bpjs', 'asuransi', 'insurance', 'kesehatan'],
    },
    'Pajak': {
        'PPh 21': ['pph 21', 'pajak penghasilan'],
        'PPh 23': ['pph 23'],
        'PPN': ['ppn', 'pajak pertambahan nilai'],
    },
    'Marketing': {
        'Iklan': ['iklan', 'ads', 'facebook ads', 'google ads', 'promosi'],
        'Event & Sponsorship': ['event', 'sponsorship', 'sponsor', 'acara'],
    },
    'Maintenance': {
        'Perbaikan': ['perbaikan', 'maintenance', 'servis', 'repair'],
        'Software & Tools': ['software', 'license', 'subscription', 'tool'],
    },
};

// ─── Main Functions ────────────────────────────────────────────────────────

/**
 * Predict cash flow for the next N days based on historical payment data.
 * Uses linear regression + moving average for prediction.
 */
export async function predictCashFlow(
    tenantId: string,
    days: number = 30
): Promise<CashFlowPrediction> {
    logger.info(`[FinanceAgent] Predicting cash flow for ${days} days`);

    // Fetch historical payments (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const payments = await prisma.payment.findMany({
        where: {
            tenantId,
            status: 'COMPLETED',
            paymentDate: { gte: ninetyDaysAgo },
        },
        select: {
            amount: true,
            paymentDate: true,
            type: true,
        },
        orderBy: { paymentDate: 'asc' },
    });

    // Group payments by date
    const dailyNetCashFlow: Record<string, number> = {};
    for (const payment of payments) {
        const dateKey = payment.paymentDate.toISOString().split('T')[0];
        const amount = Number(payment.amount);
        dailyNetCashFlow[dateKey] = (dailyNetCashFlow[dateKey] || 0) +
            (payment.type === 'INCOME' ? amount : -amount);
    }

    // Build daily values array for last 90 days
    const dailyValues: number[] = [];
    const today = new Date();
    for (let i = 89; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        dailyValues.push(dailyNetCashFlow[key] || 0);
    }

    // Calculate trend using statistical analysis
    const trend = trendDirection(dailyValues);
    const stats = descriptiveStats(dailyValues.filter(v => v !== 0));
    const avgDaily = stats.mean || 0;
    const sma7 = simpleMovingAverage(dailyValues, 7);
    const lastSma7 = sma7.filter(v => !isNaN(v)).slice(-1)[0] || avgDaily;

    // Predict future days using weighted moving average + trend slope
    const daily: CashFlowDay[] = [];
    let totalPredicted = 0;

    for (let i = 0; i < days; i++) {
        const futureDate = new Date(today);
        futureDate.setDate(futureDate.getDate() + i + 1);

        // Linear extrapolation from trend
        const predicted = lastSma7 + trend.slope * (i + 1);
        // Confidence decreases further into the future
        const confidence = Math.max(0.3, 1 - (i / days) * 0.7);

        const dayPredicted = Math.round(predicted * 100) / 100;
        totalPredicted += dayPredicted;

        daily.push({
            date: futureDate.toISOString().split('T')[0],
            predicted: dayPredicted,
            confidence: Math.round(confidence * 100) / 100,
        });
    }

    const averageDaily = days > 0 ? Math.round((totalPredicted / days) * 100) / 100 : 0;

    // Build summary
    const trendLabel = trend.direction === 'increasing' ? 'meningkat 📈' :
        trend.direction === 'decreasing' ? 'menurun 📉' : 'stabil ➡️';
    const summary = `Prediksi cash flow ${days} hari ke depan: total Rp ${formatNumber(totalPredicted)} (rata-rata Rp ${formatNumber(averageDaily)}/hari). Tren arus kas ${trendLabel} dengan perubahan ${Math.abs(trend.changeRate).toFixed(1)}%.`;

    return {
        daily,
        summary,
        trend,
        totalPredicted: Math.round(totalPredicted),
        averageDaily: Math.round(averageDaily),
    };
}

/**
 * Categorize an expense description into predefined categories.
 * Uses keyword matching with confidence scoring.
 */
export function categorizeExpense(
    _tenantId: string,
    description: string
): ExpenseCategorization {
    const lower = description.toLowerCase();
    const scores: Array<{ category: string; subcategory: string; score: number }> = [];

    for (const [category, subcategories] of Object.entries(EXPENSE_KEYWORDS)) {
        for (const [subcategory, keywords] of Object.entries(subcategories)) {
            let score = 0;
            for (const keyword of keywords) {
                if (lower.includes(keyword.toLowerCase())) {
                    // Exact match = high score, partial = lower
                    score += keyword.length > 4 ? 2 : 1;
                }
            }
            if (score > 0) {
                scores.push({ category, subcategory, score });
            }
        }
    }

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);

    if (scores.length === 0) {
        return {
            category: 'Lainnya',
            subcategory: 'Tidak Terkategori',
            confidence: 0.3,
            possibleCategories: [],
        };
    }

    const topScore = scores[0];
    const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
    const confidence = Math.min(0.95, topScore.score / Math.max(totalScore, 1) + 0.3);

    return {
        category: topScore.category,
        subcategory: topScore.subcategory,
        confidence: Math.round(confidence * 100) / 100,
        possibleCategories: scores.slice(0, 3).map(s => ({
            category: `${s.category} → ${s.subcategory}`,
            confidence: Math.round((s.score / Math.max(totalScore, 1)) * 100) / 100,
        })),
    };
}

/**
 * Get payment reminders for overdue and upcoming invoices.
 * Returns invoices sorted by urgency.
 */
export async function getPaymentReminders(
    tenantId: string
): Promise<PaymentReminder[]> {
    logger.info(`[FinanceAgent] Getting payment reminders`);

    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    // Fetch unpaid invoices (SENT, not yet PAID)
    const invoices = await prisma.invoice.findMany({
        where: {
            tenantId,
            status: { in: ['SENT', 'OVERDUE'] },
            dueDate: { lte: thirtyDaysFromNow },
        },
        select: {
            id: true,
            invoiceNumber: true,
            total: true,
            dueDate: true,
            status: true,
            contact: {
                select: { name: true },
            },
        },
        orderBy: { dueDate: 'asc' },
    });

    const reminders: PaymentReminder[] = [];

    for (const invoice of invoices) {
        const dueDate = new Date(invoice.dueDate);
        const diffTime = dueDate.getTime() - now.getTime();
        const daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Determine urgency
        let urgency: PaymentReminder['urgency'];
        let suggestedAction: string;

        if (daysUntilDue < 0) {
            // Overdue
            const overdueDays = Math.abs(daysUntilDue);
            if (overdueDays > 30) {
                urgency = 'critical';
                suggestedAction = `Sudah overdue ${overdueDays} hari. Segera hubungi ${invoice.contact?.name || 'customer'} dan pertimbangkan tindakan penagihan lebih lanjut.`;
            } else if (overdueDays > 14) {
                urgency = 'critical';
                suggestedAction = `Overdue ${overdueDays} hari. Kirim surat peringatan formal ke ${invoice.contact?.name || 'customer'}.`;
            } else {
                urgency = 'high';
                suggestedAction = `Overdue ${overdueDays} hari. Kirim reminder via email/WhatsApp ke ${invoice.contact?.name || 'customer'}.`;
            }
        } else if (daysUntilDue === 0) {
            urgency = 'high';
            suggestedAction = 'Jatuh tempo hari ini. Konfirmasi pembayaran dengan customer.';
        } else if (daysUntilDue <= 3) {
            urgency = 'medium';
            suggestedAction = `Jatuh tempo dalam ${daysUntilDue} hari. Kirim reminder awal ke ${invoice.contact?.name || 'customer'}.`;
        } else if (daysUntilDue <= 7) {
            urgency = 'medium';
            suggestedAction = `Jatuh tempo dalam ${daysUntilDue} hari. Persiapkan reminder.`;
        } else {
            urgency = 'low';
            suggestedAction = `Jatuh tempo dalam ${daysUntilDue} hari. Monitor saja.`;
        }

        reminders.push({
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            contactName: invoice.contact?.name || '-',
            total: Number(invoice.total),
            dueDate: invoice.dueDate.toISOString().split('T')[0],
            daysUntilDue,
            urgency,
            suggestedAction,
        });
    }

    // Sort: critical first, then by daysUntilDue
    reminders.sort((a, b) => {
        const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        const urgencyDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
        if (urgencyDiff !== 0) return urgencyDiff;
        return a.daysUntilDue - b.daysUntilDue;
    });

    return reminders;
}

/**
 * Get comprehensive financial insights: revenue, expenses, profit, trends, anomalies.
 */
export async function getFinancialInsights(
    tenantId: string
): Promise<FinancialInsights> {
    logger.info(`[FinanceAgent] Getting financial insights`);

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Fetch payments for this month and last month
    const [thisMonthPayments, lastMonthPayments, allPayments] = await Promise.all([
        prisma.payment.findMany({
            where: {
                tenantId,
                status: 'COMPLETED',
                paymentDate: { gte: thisMonthStart },
            },
            select: { amount: true, type: true, paymentDate: true },
        }),
        prisma.payment.findMany({
            where: {
                tenantId,
                status: 'COMPLETED',
                paymentDate: { gte: lastMonthStart, lte: lastMonthEnd },
            },
            select: { amount: true, type: true, paymentDate: true },
        }),
        prisma.payment.findMany({
            where: {
                tenantId,
                status: 'COMPLETED',
                paymentDate: { gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) },
            },
            select: { amount: true, type: true, paymentDate: true },
            orderBy: { paymentDate: 'asc' },
        }),
    ]);

    // Calculate revenue and expenses
    const calcRevenue = (payments: typeof thisMonthPayments) =>
        payments.filter(p => p.type === 'INCOME').reduce((sum, p) => sum + Number(p.amount), 0);
    const calcExpenses = (payments: typeof thisMonthPayments) =>
        payments.filter(p => p.type === 'EXPENSE').reduce((sum, p) => sum + Number(p.amount), 0);

    const thisMonthRevenue = calcRevenue(thisMonthPayments);
    const lastMonthRevenue = calcRevenue(lastMonthPayments);
    const thisMonthExpenses = calcExpenses(thisMonthPayments);
    const lastMonthExpenses = calcExpenses(lastMonthPayments);

    const totalRevenue = calcRevenue(allPayments);
    const totalExpenses = calcExpenses(allPayments);

    // Calculate changes
    const revenueChange = lastMonthRevenue > 0
        ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
        : thisMonthRevenue > 0 ? 100 : 0;
    const expenseChange = lastMonthExpenses > 0
        ? ((thisMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100
        : thisMonthExpenses > 0 ? 100 : 0;

    // Profit calculation
    const grossProfit = thisMonthRevenue - thisMonthExpenses;
    const netProfit = grossProfit; // Simplified — no tax calculation here
    const margin = thisMonthRevenue > 0 ? (netProfit / thisMonthRevenue) * 100 : 0;

    // Trend analysis on monthly revenue
    const monthlyRevenue: number[] = [];
    for (let i = 5; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        const monthPayments = allPayments.filter(p => {
            const d = p.paymentDate;
            return d >= monthStart && d <= monthEnd && p.type === 'INCOME';
        });
        monthlyRevenue.push(monthPayments.reduce((sum, p) => sum + Number(p.amount), 0));
    }
    const trends = trendDirection(monthlyRevenue);

    // Detect anomalies (simple: months with > 2x standard deviation from mean)
    const anomalies: FinancialInsights['anomalies'] = [];
    const revenueStats = descriptiveStats(monthlyRevenue);
    for (let i = 0; i < monthlyRevenue.length; i++) {
        if (revenueStats.standardDeviation > 0) {
            const zScore = (monthlyRevenue[i] - revenueStats.mean) / revenueStats.standardDeviation;
            if (Math.abs(zScore) > 2) {
                anomalies.push({
                    type: 'revenue_anomaly',
                    description: `Revenue bulan ke-${i + 1} tidak biasa: Rp ${formatNumber(monthlyRevenue[i])} (z-score: ${zScore.toFixed(2)})`,
                    severity: Math.abs(zScore) > 3 ? 'high' : 'medium',
                });
            }
        }
    }

    // Build summary
    const revenueDir = revenueChange >= 0 ? 'naik' : 'turun';
    const expenseDir = expenseChange >= 0 ? 'naik' : 'turun';
    const profitStatus = netProfit >= 0 ? 'untung ✅' : 'rugi ⚠️';
    const trendLabel = trends.direction === 'increasing' ? 'meningkat 📈' :
        trends.direction === 'decreasing' ? 'menurun 📉' : 'stabil ➡️';

    const summary = [
        `💰 Ringkasan Keuangan:`,
        `• Revenue bulan ini: Rp ${formatNumber(thisMonthRevenue)} (${revenueDir} ${Math.abs(revenueChange).toFixed(1)}% dari bulan lalu)`,
        `• Expense bulan ini: Rp ${formatNumber(thisMonthExpenses)} (${expenseDir} ${Math.abs(expenseChange).toFixed(1)}% dari bulan lalu)`,
        `• Profit: Rp ${formatNumber(netProfit)} (margin ${margin.toFixed(1)}%) — ${profitStatus}`,
        `• Tren 6 bulan: ${trendLabel} (perubahan ${Math.abs(trends.changeRate).toFixed(1)}%)`,
        anomalies.length > 0 ? `• ⚠️ ${anomalies.length} anomali terdeteksi` : '',
    ].filter(Boolean).join('\n');

    return {
        revenue: {
            total: Math.round(totalRevenue),
            thisMonth: Math.round(thisMonthRevenue),
            lastMonth: Math.round(lastMonthRevenue),
            changePercent: Math.round(revenueChange * 10) / 10,
        },
        expenses: {
            total: Math.round(totalExpenses),
            thisMonth: Math.round(thisMonthExpenses),
            lastMonth: Math.round(lastMonthExpenses),
            changePercent: Math.round(expenseChange * 10) / 10,
        },
        profit: {
            gross: Math.round(grossProfit),
            net: Math.round(netProfit),
            margin: Math.round(margin * 10) / 10,
        },
        trends,
        anomalies,
        summary,
    };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatNumber(num: number): string {
    return new Intl.NumberFormat('id-ID').format(Math.round(num));
}
