// ─── Sales Agent ───────────────────────────────────────────────────────────
// Provides sales insights: win probability, lead scoring, sales forecasting,
// pipeline insights, and next best action recommendations.
// Uses statistical analysis for trend prediction.

import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import {
    mean,
    trendDirection,
    descriptiveStats,
    simpleMovingAverage,
    type TrendAnalysis,
} from '@/lib/ai/statistical-analysis';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface WinProbabilityResult {
    dealId: string;
    dealTitle: string;
    probability: number;
    factors: Array<{ factor: string; impact: number; description: string }>;
    suggestions: string[];
}

export interface LeadScoreResult {
    leadId: string;
    leadName: string;
    score: number;
    grade: 'A' | 'B' | 'C' | 'D';
    factors: Array<{ factor: string; score: number; description: string }>;
    recommendedAction: string;
}

export interface SalesForecast {
    period: string;
    forecast: number;
    confidence: number;
    historicalTrend: TrendAnalysis;
    monthlyBreakdown: Array<{ month: string; predicted: number; actual?: number }>;
    summary: string;
}

export interface PipelineInsight {
    totalPipeline: number;
    weightedValue: number;
    dealCount: number;
    conversionRate: number;
    averageDealSize: number;
    stageBreakdown: Array<{
        stage: string;
        count: number;
        value: number;
        weightedValue: number;
    }>;
    bottlenecks: string[];
    summary: string;
}

export interface NextBestAction {
    dealId: string;
    dealTitle: string;
    action: string;
    priority: 'high' | 'medium' | 'low';
    reasoning: string;
    estimatedImpact: string;
}

// ─── Stage Probability Mapping ──────────────────────────────────────────────

const STAGE_BASE_PROBABILITY: Record<string, number> = {
    'DISCOVERY': 10,
    'PROPOSAL': 30,
    'NEGOTIATION': 60,
    'CLOSING': 80,
    'CLOSED_WON': 100,
    'CLOSED_LOST': 0,
};

// ─── Main Functions ────────────────────────────────────────────────────────

/**
 * Calculate win probability for a specific deal based on multiple factors.
 * Factors: stage, deal age, activity count, last contact, deal value, contact engagement.
 */
export async function calculateWinProbability(
    dealId: string
): Promise<WinProbabilityResult> {
    logger.info(`[SalesAgent] Calculating win probability for deal: ${dealId}`);

    const deal = await prisma.deal.findUnique({
        where: { id: dealId },
        include: {
            contact: true,
            lead: true,
        },
    });

    if (!deal) {
        throw new Error('Deal not found');
    }

    const factors: WinProbabilityResult['factors'] = [];
    let totalScore = 0;
    let totalWeight = 0;

    // Factor 1: Stage (weight: 35%)
    const stageBase = STAGE_BASE_PROBABILITY[deal.stage] || 10;
    const stageWeight = 0.35;
    factors.push({
        factor: 'Stage',
        impact: stageBase,
        description: `Deal berada di stage "${deal.stage}" (base probability: ${stageBase}%)`,
    });
    totalScore += stageBase * stageWeight;
    totalWeight += stageWeight;

    // Factor 2: Deal Age (weight: 15%)
    const dealAge = Math.floor(
        (Date.now() - deal.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    // Sweet spot: 7-30 days is optimal. Too old = stale, too new = unvalidated
    let ageScore: number;
    if (dealAge <= 3) ageScore = 40;
    else if (dealAge <= 7) ageScore = 60;
    else if (dealAge <= 30) ageScore = 80;
    else if (dealAge <= 60) ageScore = 50;
    else ageScore = 30;

    const ageWeight = 0.15;
    factors.push({
        factor: 'Usia Deal',
        impact: ageScore,
        description: `Deal berusia ${dealAge} hari (optimal: 7-30 hari)`,
    });
    totalScore += ageScore * ageWeight;
    totalWeight += ageWeight;

    // Factor 3: Activity Count (weight: 20%)
    const activityCount = await prisma.activity.count({
        where: {
            tenantId: deal.tenantId,
            entityType: 'DEAL',
            entityId: dealId,
        },
    });

    // More activities = more engaged = higher probability
    let activityScore: number;
    if (activityCount === 0) activityScore = 10;
    else if (activityCount <= 2) activityScore = 40;
    else if (activityCount <= 5) activityScore = 70;
    else if (activityCount <= 10) activityScore = 85;
    else activityScore = 90;

    const activityWeight = 0.20;
    factors.push({
        factor: 'Aktivitas',
        impact: activityScore,
        description: `${activityCount} aktivitas tercatat untuk deal ini`,
    });
    totalScore += activityScore * activityWeight;
    totalWeight += activityWeight;

    // Factor 4: Last Contact (weight: 15%)
    const lastActivity = await prisma.activity.findFirst({
        where: {
            tenantId: deal.tenantId,
            entityType: 'DEAL',
            entityId: dealId,
        },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
    });

    let lastContactScore: number;
    if (!lastActivity) {
        lastContactScore = 10;
    } else {
        const daysSinceContact = Math.floor(
            (Date.now() - lastActivity.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceContact <= 1) lastContactScore = 95;
        else if (daysSinceContact <= 3) lastContactScore = 80;
        else if (daysSinceContact <= 7) lastContactScore = 60;
        else if (daysSinceContact <= 14) lastContactScore = 40;
        else lastContactScore = 20;
    }

    const lastContactWeight = 0.15;
    factors.push({
        factor: 'Kontak Terakhir',
        impact: lastContactScore,
        description: lastActivity
            ? `Kontak terakhir: ${Math.floor((Date.now() - lastActivity.createdAt.getTime()) / (1000 * 60 * 60 * 24))} hari lalu`
            : 'Belum ada kontak tercatat',
    });
    totalScore += lastContactScore * lastContactWeight;
    totalWeight += lastContactWeight;

    // Factor 5: Deal Value (weight: 15%)
    const dealValue = Number(deal.value);
    const avgDealValue = await getAverageDealValue(deal.tenantId);
    let valueScore: number;
    if (avgDealValue > 0) {
        const valueRatio = dealValue / avgDealValue;
        if (valueRatio <= 0.5) valueScore = 85; // Small deals close easier
        else if (valueRatio <= 1.5) valueScore = 70;
        else if (valueRatio <= 3) valueScore = 50;
        else valueScore = 35; // Very large deals are harder
    } else {
        valueScore = 60;
    }

    const valueWeight = 0.15;
    factors.push({
        factor: 'Nilai Deal',
        impact: valueScore,
        description: `Rp ${formatNumber(dealValue)} (rata-rata pipeline: Rp ${formatNumber(avgDealValue)})`,
    });
    totalScore += valueScore * valueWeight;
    totalWeight += valueWeight;

    // Calculate final probability
    const probability = Math.round(Math.min(95, Math.max(5, totalScore / totalWeight)));

    // Generate suggestions
    const suggestions: string[] = [];
    if (activityCount <= 2) {
        suggestions.push('Tambah aktivitas (call, email, meeting) untuk meningkatkan engagement');
    }
    if (lastActivity && Math.floor((Date.now() - lastActivity.createdAt.getTime()) / (1000 * 60 * 60 * 24)) > 7) {
        suggestions.push('Segera lakukan follow-up — sudah lebih dari 7 hari tanpa kontak');
    }
    if (dealAge > 60 && deal.stage !== 'CLOSED_WON' && deal.stage !== 'CLOSED_LOST') {
        suggestions.push('Deal sudah >60 hari — pertimbangkan untuk update stage atau mark sebagai lost');
    }
    if (!deal.contactId) {
        suggestions.push('Hubungkan deal dengan contact untuk tracking yang lebih baik');
    }

    return {
        dealId: deal.id,
        dealTitle: deal.title,
        probability,
        factors,
        suggestions,
    };
}

/**
 * Score a lead based on engagement, company info, and fit.
 * Returns a score (0-100) and grade (A/B/C/D).
 */
export async function getLeadScore(leadId: string): Promise<LeadScoreResult> {
    logger.info(`[SalesAgent] Scoring lead: ${leadId}`);

    const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        include: {
            contact: true,
            deals: true,
        },
    });

    if (!lead) {
        throw new Error('Lead not found');
    }

    const factors: LeadScoreResult['factors'] = [];
    let totalScore = 0;

    // Factor 1: Source quality (weight: 20%)
    const sourceScores: Record<string, number> = {
        'REFERRAL': 90,
        'WEBSITE': 70,
        'SOCIAL_MEDIA': 60,
        'COLD_CALL': 40,
        'OTHER': 30,
    };
    const sourceScore = sourceScores[lead.source || 'OTHER'] || 30;
    factors.push({
        factor: 'Sumber',
        score: sourceScore,
        description: `Lead dari "${lead.source || 'Unknown'}" (skor: ${sourceScore})`,
    });
    totalScore += sourceScore * 0.20;

    // Factor 2: Engagement level (weight: 30%)
    const activityCount = await prisma.activity.count({
        where: {
            tenantId: lead.tenantId,
            entityType: 'LEAD',
            entityId: leadId,
        },
    });

    const lastActivity = await prisma.activity.findFirst({
        where: {
            tenantId: lead.tenantId,
            entityType: 'LEAD',
            entityId: leadId,
        },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
    });

    let engagementScore: number;
    if (activityCount === 0) {
        engagementScore = 10;
    } else {
        const daysSinceActivity = lastActivity
            ? Math.floor((Date.now() - lastActivity.createdAt.getTime()) / (1000 * 60 * 60 * 24))
            : 999;
        const recencyBonus = daysSinceActivity <= 3 ? 20 : daysSinceActivity <= 7 ? 10 : 0;
        engagementScore = Math.min(100, activityCount * 15 + recencyBonus);
    }

    factors.push({
        factor: 'Engagement',
        score: engagementScore,
        description: `${activityCount} aktivitas (skor: ${engagementScore})`,
    });
    totalScore += engagementScore * 0.30;

    // Factor 3: Lead value (weight: 20%)
    const leadValue = Number(lead.value);
    let valueScore: number;
    if (leadValue === 0) valueScore = 20;
    else if (leadValue < 10000000) valueScore = 40; // < 10 juta
    else if (leadValue < 50000000) valueScore = 60; // < 50 juta
    else if (leadValue < 200000000) valueScore = 80; // < 200 juta
    else valueScore = 95; // > 200 juta

    factors.push({
        factor: 'Nilai Potensial',
        score: valueScore,
        description: `Rp ${formatNumber(leadValue)} (skor: ${valueScore})`,
    });
    totalScore += valueScore * 0.20;

    // Factor 4: Stage progression (weight: 20%)
    const stageScores: Record<string, number> = {
        'NEW': 10,
        'CONTACTED': 30,
        'QUALIFIED': 60,
        'PROPOSAL': 80,
        'NEGOTIATION': 90,
        'WON': 100,
        'LOST': 5,
    };
    const stageScore = stageScores[lead.status] || 10;
    factors.push({
        factor: 'Stage',
        score: stageScore,
        description: `Lead di stage "${lead.status}" (skor: ${stageScore})`,
    });
    totalScore += stageScore * 0.20;

    // Factor 5: Has deals (weight: 10%)
    const dealBonus = lead.deals.length > 0 ? 80 : 20;
    factors.push({
        factor: 'Deal Terkait',
        score: dealBonus,
        description: `${lead.deals.length} deal terkait`,
    });
    totalScore += dealBonus * 0.10;

    // Calculate final score and grade
    const score = Math.round(Math.min(100, Math.max(0, totalScore)));

    let grade: LeadScoreResult['grade'];
    if (score >= 75) grade = 'A';
    else if (score >= 55) grade = 'B';
    else if (score >= 35) grade = 'C';
    else grade = 'D';

    // Recommended action based on grade
    let recommendedAction: string;
    switch (grade) {
        case 'A':
            recommendedAction = 'Lead berkualitas tinggi! Segeraassign ke sales terbaik dan follow up dalam 24 jam.';
            break;
        case 'B':
            recommendedAction = 'Lead potensial. Lakukan follow up dalam 3 hari untuk mempertahankan momentum.';
            break;
        case 'C':
            recommendedAction = 'Lead perlu nurturing. Kirim konten edukatif dan re-check dalam 1-2 minggu.';
            break;
        case 'D':
            recommendedAction = 'Lead berkualitas rendah. Pertimbangkan untuk deprioritaskan atau mark sebagai inactive.';
            break;
    }

    return {
        leadId: lead.id,
        leadName: lead.name,
        score,
        grade,
        factors,
        recommendedAction,
    };
}

/**
 * Forecast sales for a given period (30, 60, or 90 days).
 * Based on historical closed deals and pipeline data.
 */
export async function forecastSales(
    tenantId: string,
    periodDays: number = 30
): Promise<SalesForecast> {
    logger.info(`[SalesAgent] Forecasting sales for ${periodDays} days`);

    const now = new Date();

    // Fetch historical closed deals (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const closedDeals = await prisma.deal.findMany({
        where: {
            tenantId,
            stage: 'CLOSED_WON',
            updatedAt: { gte: sixMonthsAgo },
        },
        select: {
            value: true,
            updatedAt: true,
        },
        orderBy: { updatedAt: 'asc' },
    });

    // Build monthly revenue from closed deals
    const monthlyRevenue: number[] = [];
    const monthlyLabels: string[] = [];
    for (let i = 5; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        const monthDeals = closedDeals.filter(d => {
            const d2 = new Date(d.updatedAt);
            return d2 >= monthStart && d2 <= monthEnd;
        });
        const total = monthDeals.reduce((sum, d) => sum + Number(d.value), 0);
        monthlyRevenue.push(total);
        monthlyLabels.push(`${monthStart.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' })}`);
    }

    // Trend analysis
    const historicalTrend = trendDirection(monthlyRevenue);

    // Average monthly revenue
    const avgMonthlyRevenue = mean(monthlyRevenue.filter(v => v > 0));

    // Forecast based on trend
    const monthlyGrowthRate = historicalTrend.slope / (avgMonthlyRevenue || 1);
    const predictedMonthly = avgMonthlyRevenue * (1 + monthlyGrowthRate);

    // Scale to requested period
    const monthsInPeriod = periodDays / 30;
    const forecast = Math.round(predictedMonthly * monthsInPeriod);

    // Confidence based on data quality
    const dataPoints = monthlyRevenue.filter(v => v > 0).length;
    const variance = descriptiveStats(monthlyRevenue.filter(v => v > 0)).variance;
    const cv = avgMonthlyRevenue > 0 ? Math.sqrt(variance) / avgMonthlyRevenue : 1;
    const confidence = Math.max(0.2, Math.min(0.9, dataPoints / 6 * (1 - cv)));

    // Monthly breakdown
    const monthlyBreakdown: SalesForecast['monthlyBreakdown'] = [];
    for (let i = 0; i < Math.ceil(monthsInPeriod); i++) {
        const futureMonth = new Date(now);
        futureMonth.setMonth(futureMonth.getMonth() + i + 1);
        const monthPredicted = predictedMonthly * (1 + monthlyGrowthRate * i);
        monthlyBreakdown.push({
            month: futureMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
            predicted: Math.round(monthPredicted),
        });
    }

    // Fill in historical actuals
    for (let i = 0; i < Math.min(6, monthlyBreakdown.length); i++) {
        if (i < monthlyRevenue.length) {
            monthlyBreakdown[i].actual = monthlyRevenue[monthlyRevenue.length - 6 + i] || undefined;
        }
    }

    const trendLabel = historicalTrend.direction === 'increasing' ? 'meningkat 📈' :
        historicalTrend.direction === 'decreasing' ? 'menurun 📉' : 'stabil ➡️';

    const summary = `Forecast penjualan ${periodDays} hari ke depan: Rp ${formatNumber(forecast)} (confidence: ${(confidence * 100).toFixed(0)}%). Tren historis ${trendLabel} dengan perubahan ${Math.abs(historicalTrend.changeRate).toFixed(1)}%. Rata-rata revenue bulanan: Rp ${formatNumber(avgMonthlyRevenue)}.`;

    return {
        period: `${periodDays} hari`,
        forecast,
        confidence: Math.round(confidence * 100) / 100,
        historicalTrend,
        monthlyBreakdown,
        summary,
    };
}

/**
 * Get pipeline insights: total value, weighted value, conversion rate, bottlenecks.
 */
export async function getPipelineInsights(
    tenantId: string
): Promise<PipelineInsight> {
    logger.info(`[SalesAgent] Getting pipeline insights`);

    // Fetch all active deals (not closed)
    const deals = await prisma.deal.findMany({
        where: {
            tenantId,
            stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] },
        },
        select: {
            id: true,
            title: true,
            value: true,
            stage: true,
            probability: true,
            createdAt: true,
        },
    });

    // Fetch closed deals for conversion rate
    const allDeals = await prisma.deal.findMany({
        where: { tenantId },
        select: { stage: true },
    });

    const totalDeals = allDeals.length;
    const wonDeals = allDeals.filter(d => d.stage === 'CLOSED_WON').length;
    const conversionRate = totalDeals > 0 ? (wonDeals / totalDeals) * 100 : 0;

    // Calculate totals
    const totalPipeline = deals.reduce((sum, d) => sum + Number(d.value), 0);
    const weightedValue = deals.reduce((sum, d) => {
        const baseProb = STAGE_BASE_PROBABILITY[d.stage] || 10;
        const dealProb = d.probability || baseProb;
        return sum + (Number(d.value) * dealProb) / 100;
    }, 0);

    const averageDealSize = deals.length > 0 ? totalPipeline / deals.length : 0;

    // Stage breakdown
    const stageMap: Record<string, { count: number; value: number; weightedValue: number }> = {};
    for (const deal of deals) {
        if (!stageMap[deal.stage]) {
            stageMap[deal.stage] = { count: 0, value: 0, weightedValue: 0 };
        }
        stageMap[deal.stage].count++;
        stageMap[deal.stage].value += Number(deal.value);
        const baseProb = STAGE_BASE_PROBABILITY[deal.stage] || 10;
        const dealProb = deal.probability || baseProb;
        stageMap[deal.stage].weightedValue += (Number(deal.value) * dealProb) / 100;
    }

    const stageBreakdown = Object.entries(stageMap).map(([stage, data]) => ({
        stage,
        count: data.count,
        value: Math.round(data.value),
        weightedValue: Math.round(data.weightedValue),
    }));

    // Detect bottlenecks (stages with many deals but low conversion)
    const bottlenecks: string[] = [];
    for (const item of stageBreakdown) {
        if (item.count > 5) {
            const avgAge = await getAverageDealAgeInStage(tenantId, item.stage);
            if (avgAge > 14) {
                bottlenecks.push(`Stage "${item.stage}" memiliki ${item.count} deal dengan rata-rata usia ${avgAge} hari — pertimbangkan untuk review atau push ke stage berikutnya.`);
            }
        }
    }

    const summary = [
        `📊 Pipeline Overview:`,
        `• Total pipeline: ${deals.length} deal senilai Rp ${formatNumber(totalPipeline)}`,
        `• Weighted value: Rp ${formatNumber(weightedValue)}`,
        `• Average deal size: Rp ${formatNumber(averageDealSize)}`,
        `• Conversion rate: ${conversionRate.toFixed(1)}% (${wonDeals}/${totalDeals})`,
        bottlenecks.length > 0 ? `• ⚠️ ${bottlenecks.length} bottleneck terdeteksi` : '',
    ].filter(Boolean).join('\n');

    return {
        totalPipeline: Math.round(totalPipeline),
        weightedValue: Math.round(weightedValue),
        dealCount: deals.length,
        conversionRate: Math.round(conversionRate * 10) / 10,
        averageDealSize: Math.round(averageDealSize),
        stageBreakdown,
        bottlenecks,
        summary,
    };
}

/**
 * Get next best action for a specific deal.
 */
export async function getNextBestAction(dealId: string): Promise<NextBestAction> {
    logger.info(`[SalesAgent] Getting next best action for deal: ${dealId}`);

    const deal = await prisma.deal.findUnique({
        where: { id: dealId },
        include: { contact: true },
    });

    if (!deal) {
        throw new Error('Deal not found');
    }

    // Get last activity
    const lastActivity = await prisma.activity.findFirst({
        where: {
            tenantId: deal.tenantId,
            entityType: 'DEAL',
            entityId: dealId,
        },
        orderBy: { createdAt: 'desc' },
        select: { type: true, createdAt: true, subject: true },
    });

    const dealAge = Math.floor(
        (Date.now() - deal.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    const daysSinceActivity = lastActivity
        ? Math.floor((Date.now() - lastActivity.createdAt.getTime()) / (1000 * 60 * 60 * 24))
        : dealAge;

    let action: string;
    let priority: NextBestAction['priority'];
    let reasoning: string;
    let estimatedImpact: string;

    if (!lastActivity || daysSinceActivity > 14) {
        action = '📞 Follow-up segera';
        priority = 'high';
        reasoning = lastActivity
            ? `Sudah ${daysSinceActivity} hari tanpa aktivitas. Deal bisa stale.`
            : 'Belum ada aktivitas tercatat. Mulai engagement dengan contact.';
        estimatedImpact = 'Meningkatkan win probability sebesar 15-25%';
    } else if (deal.stage === 'DISCOVERY') {
        action = '📋 Kirim proposal/penawaran';
        priority = 'high';
        reasoning = 'Deal masih di tahap discovery. Langkah selanjutnya adalah mengirim proposal.';
        estimatedImpact = 'Moving ke stage Proposal meningkatkan probability ke 30%+';
    } else if (deal.stage === 'PROPOSAL') {
        action = '🤝 Atur presentasi/meeting';
        priority = 'medium';
        reasoning = 'Proposal sudah dikirim. Presentasikan solusi secara langsung untuk mempercepat closing.';
        estimatedImpact = 'Meningkatkan engagement dan trust dengan prospect';
    } else if (deal.stage === 'NEGOTIATION') {
        action = '💰 Finalisasi terms & negosiasi';
        priority = 'high';
        reasoning = 'Deal di tahap negosiasi. Pastikan semua syarat sudah clear untuk closing.';
        estimatedImpact = 'Deal bisa closed dalam 1-2 minggu jika di-handle dengan baik';
    } else if (deal.stage === 'CLOSING') {
        action = '✅ Konfirmasi closing & kirim invoice';
        priority = 'high';
        reasoning = 'Deal hampir selesai. Konfirmasi final dan kirim dokumen.';
        estimatedImpact = 'Closing deal = revenue masuk';
    } else {
        action = '📊 Review deal status';
        priority = 'low';
        reasoning = `Stage "${deal.stage}" perlu review untuk memastikan deal masih aktif.`;
        estimatedImpact = 'Mempertahankan pipeline health';
    }

    return {
        dealId: deal.id,
        dealTitle: deal.title,
        action,
        priority,
        reasoning,
        estimatedImpact,
    };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function getAverageDealValue(tenantId: string): Promise<number> {
    const result = await prisma.deal.aggregate({
        where: {
            tenantId,
            stage: { notIn: ['CLOSED_LOST'] },
        },
        _avg: { value: true },
    });
    return Number(result._avg.value) || 0;
}

async function getAverageDealAgeInStage(tenantId: string, stage: string): Promise<number> {
    const deals = await prisma.deal.findMany({
        where: { tenantId, stage },
        select: { createdAt: true },
    });

    if (deals.length === 0) return 0;

    const now = Date.now();
    const totalAge = deals.reduce((sum, d) => {
        return sum + (now - d.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    }, 0);

    return Math.round(totalAge / deals.length);
}

function formatNumber(num: number): string {
    return new Intl.NumberFormat('id-ID').format(Math.round(num));
}
