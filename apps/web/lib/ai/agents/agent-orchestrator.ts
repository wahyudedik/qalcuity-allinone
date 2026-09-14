// ─── Agent Orchestrator ────────────────────────────────────────────────────
// Routes user intent to the appropriate AI agent (Finance, Sales, Inventory).
// Manages agent execution, combines results, and generates suggestions.

import { logger } from '@/lib/logger';
import type { NLUParseResult } from '@/lib/ai/nlu-parser';
import {
    predictCashFlow,
    categorizeExpense,
    getPaymentReminders,
    getFinancialInsights,
    type CashFlowPrediction,
    type ExpenseCategorization,
    type PaymentReminder,
    type FinancialInsights,
} from './finance-agent';
import {
    calculateWinProbability,
    getLeadScore,
    forecastSales,
    getPipelineInsights,
    getNextBestAction,
    type WinProbabilityResult,
    type LeadScoreResult,
    type SalesForecast,
    type PipelineInsight,
    type NextBestAction,
} from './sales-agent';
import {
    predictStockout,
    suggestReorder,
    detectDeadStock,
    getInventoryInsights,
    forecastDemand,
    type StockoutPrediction,
    type ReorderSuggestion,
    type DeadStockItem,
    type InventoryInsights,
    type DemandForecast,
} from './inventory-agent';

// ─── Types ─────────────────────────────────────────────────────────────────

export type AgentName = 'finance' | 'sales' | 'inventory';

export type AgentAction =
    // Finance actions
    | 'predict_cash_flow'
    | 'categorize_expense'
    | 'payment_reminders'
    | 'financial_insights'
    // Sales actions
    | 'win_probability'
    | 'lead_score'
    | 'sales_forecast'
    | 'pipeline_insights'
    | 'next_best_action'
    // Inventory actions
    | 'stockout_prediction'
    | 'reorder_suggestion'
    | 'dead_stock'
    | 'inventory_insights'
    | 'demand_forecast';

export interface AgentResponse {
    agent: AgentName;
    action: AgentAction;
    result: unknown;
    summary: string;
    timestamp: string;
}

export interface AgentSuggestion {
    agent: AgentName;
    action: AgentAction;
    label: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    data?: unknown;
}

// ─── Intent → Agent Mapping ────────────────────────────────────────────────

const FINANCE_KEYWORDS = [
    'cash flow', 'arus kas', 'keuangan', 'finance', 'invoice', 'faktur',
    'payment', 'pembayaran', 'revenue', 'pendapatan', 'expense', 'pengeluaran',
    'profit', 'laba', 'loss', 'rugi', 'piutang', 'hutang', 'jatuh tempo',
    'overdue', 'tagihan', 'bayar', 'transfer', 'journal', 'jurnal',
];

const SALES_KEYWORDS = [
    'deal', 'pipeline', 'sales', 'penjualan', 'lead', 'prospek',
    'closing', 'proposal', 'negosiasi', 'komisi', 'target', 'forecast',
    'ramalan', 'konversi', 'conversion', 'won', 'lost', 'customer',
    'pelanggan', 'kontak', 'activity', 'aktivitas', 'follow up',
];

const INVENTORY_KEYWORDS = [
    'stock', 'stok', 'inventory', 'produk', 'product', 'barang',
    'warehouse', 'gudang', 'supplier', 'reorder', 'dead stock',
    'demand', 'permintaan', 'qty', 'quantity', 'minimum stock',
    'min stock', 'out of stock', 'habis', 'kehabisan',
];

// ─── Orchestrator Functions ────────────────────────────────────────────────

/**
 * Determine which agent should handle the query based on NLU result.
 */
export function determineAgent(nluResult: NLUParseResult): AgentName | null {
    const query = nluResult.normalizedQuery.toLowerCase();
    const moduleName = nluResult.entities.moduleName?.toLowerCase() || '';

    // Check module name first (more reliable)
    if (moduleName === 'finance' || moduleName === 'invoice' || moduleName === 'payment' || moduleName === 'journalentry') {
        return 'finance';
    }
    if (moduleName === 'lead' || moduleName === 'deal' || moduleName === 'crm') {
        return 'sales';
    }
    if (moduleName === 'product' || moduleName === 'inventory' || moduleName === 'purchaseorder') {
        return 'inventory';
    }

    // Fallback to keyword matching
    let financeScore = 0;
    let salesScore = 0;
    let inventoryScore = 0;

    for (const keyword of FINANCE_KEYWORDS) {
        if (query.includes(keyword)) financeScore++;
    }
    for (const keyword of SALES_KEYWORDS) {
        if (query.includes(keyword)) salesScore++;
    }
    for (const keyword of INVENTORY_KEYWORDS) {
        if (query.includes(keyword)) inventoryScore++;
    }

    const maxScore = Math.max(financeScore, salesScore, inventoryScore);
    if (maxScore === 0) return null;

    if (financeScore === maxScore) return 'finance';
    if (salesScore === maxScore) return 'sales';
    if (inventoryScore === maxScore) return 'inventory';

    return null;
}

/**
 * Determine the specific action based on NLU intent and entities.
 */
export function determineAction(
    agent: AgentName,
    nluResult: NLUParseResult
): AgentAction {
    const query = nluResult.normalizedQuery.toLowerCase();
    const intent = nluResult.intent;

    switch (agent) {
        case 'finance':
            if (intent === 'PREDICT' || query.includes('prediksi') || query.includes('cash flow') || query.includes('arus kas')) {
                return 'predict_cash_flow';
            }
            if (query.includes('kategori') || query.includes('categorize') || query.includes('pengeluaran')) {
                return 'categorize_expense';
            }
            if (query.includes('reminder') || query.includes('jatuh tempo') || query.includes('overdue') || query.includes('tagihan')) {
                return 'payment_reminders';
            }
            return 'financial_insights';

        case 'sales':
            if (query.includes('probability') || query.includes('kemungkinan') || query.includes('peluang')) {
                return 'win_probability';
            }
            if (query.includes('skor') || query.includes('score') || query.includes('lead')) {
                return 'lead_score';
            }
            if (query.includes('forecast') || query.includes('ramalan') || query.includes('prediksi penjualan')) {
                return 'sales_forecast';
            }
            if (query.includes('next') || query.includes('selanjutnya') || query.includes('langkah')) {
                return 'next_best_action';
            }
            if (intent === 'ANALYZE' || query.includes('pipeline') || query.includes('ringkasan')) {
                return 'pipeline_insights';
            }
            return 'pipeline_insights';

        case 'inventory':
            if (query.includes('stockout') || query.includes('habis') || query.includes('kehabisan')) {
                return 'stockout_prediction';
            }
            if (query.includes('reorder') || query.includes('pesan') || query.includes('beli')) {
                return 'reorder_suggestion';
            }
            if (query.includes('dead stock') || query.includes('mati') || query.includes('tidak laku')) {
                return 'dead_stock';
            }
            if (intent === 'PREDICT' || query.includes('demand') || query.includes('permintaan')) {
                return 'demand_forecast';
            }
            return 'inventory_insights';

        default:
            return 'financial_insights';
    }
}

/**
 * Execute the appropriate agent action with the given parameters.
 */
export async function executeAgent(
    agent: AgentName,
    tenantId: string,
    action: AgentAction,
    params: Record<string, string | number | undefined> = {}
): Promise<AgentResponse> {
    logger.info(`[AgentOrchestrator] Executing ${agent}.${action}`);

    let result: unknown;
    let summary: string;

    switch (action) {
        // Finance actions
        case 'predict_cash_flow': {
            const days = typeof params.days === 'number' ? params.days : 30;
            const prediction = await predictCashFlow(tenantId, days);
            result = prediction;
            summary = prediction.summary;
            break;
        }
        case 'categorize_expense': {
            const description = typeof params.description === 'string' ? params.description : '';
            const categorization = categorizeExpense(tenantId, description);
            result = categorization;
            summary = `Pengeluaran "${description}" dikategorikan sebagai "${categorization.category} → ${categorization.subcategory}" (confidence: ${(categorization.confidence * 100).toFixed(0)}%)`;
            break;
        }
        case 'payment_reminders': {
            const reminders = await getPaymentReminders(tenantId);
            result = reminders;
            const critical = reminders.filter(r => r.urgency === 'critical').length;
            const high = reminders.filter(r => r.urgency === 'high').length;
            summary = `Ditemukan ${reminders.length} invoice yang perlu ditindak: ${critical} critical, ${high} high urgency. Total nilai: Rp ${new Intl.NumberFormat('id-ID').format(reminders.reduce((sum, r) => sum + r.total, 0))}`;
            break;
        }
        case 'financial_insights': {
            const insights = await getFinancialInsights(tenantId);
            result = insights;
            summary = insights.summary;
            break;
        }

        // Sales actions
        case 'win_probability': {
            const dealId = typeof params.dealId === 'string' ? params.dealId : '';
            if (!dealId) throw new Error('dealId is required for win_probability');
            const probability = await calculateWinProbability(dealId);
            result = probability;
            summary = `Win probability untuk "${probability.dealTitle}": ${probability.probability}% (${probability.factors.length} faktor dianalisis)`;
            break;
        }
        case 'lead_score': {
            const leadId = typeof params.leadId === 'string' ? params.leadId : '';
            if (!leadId) throw new Error('leadId is required for lead_score');
            const score = await getLeadScore(leadId);
            result = score;
            summary = `Lead "${score.leadName}" mendapat skor ${score.score}/100 (Grade: ${score.grade}). ${score.recommendedAction}`;
            break;
        }
        case 'sales_forecast': {
            const periodDays = typeof params.periodDays === 'number' ? params.periodDays : 30;
            const forecast = await forecastSales(tenantId, periodDays);
            result = forecast;
            summary = forecast.summary;
            break;
        }
        case 'pipeline_insights': {
            const insights = await getPipelineInsights(tenantId);
            result = insights;
            summary = insights.summary;
            break;
        }
        case 'next_best_action': {
            const dealId = typeof params.dealId === 'string' ? params.dealId : '';
            if (!dealId) throw new Error('dealId is required for next_best_action');
            const action = await getNextBestAction(dealId);
            result = action;
            summary = `Next action untuk "${action.dealTitle}": ${action.action} (${action.priority} priority). ${action.reasoning}`;
            break;
        }

        // Inventory actions
        case 'stockout_prediction': {
            const predictions = await predictStockout(tenantId);
            result = predictions;
            const critical = predictions.filter(p => p.urgency === 'critical').length;
            summary = `Ditemukan ${predictions.length} produk berisiko stockout: ${critical} critical. ${predictions.length > 0 ? 'Produk paling mendesak: ' + predictions[0].productName + ' (' + predictions[0].daysUntilStockout + ' hari lagi habis).' : 'Semua stok aman.'}`;
            break;
        }
        case 'reorder_suggestion': {
            const suggestions = await suggestReorder(tenantId);
            result = suggestions;
            const urgent = suggestions.filter(s => s.priority === 'urgent').length;
            summary = `Ditemukan ${suggestions.length} produk perlu reorder: ${urgent} urgent. Total estimasi biaya: Rp ${new Intl.NumberFormat('id-ID').format(suggestions.reduce((sum, s) => sum + s.estimatedCost, 0))}`;
            break;
        }
        case 'dead_stock': {
            const days = typeof params.days === 'number' ? params.days : 60;
            const deadStock = await detectDeadStock(tenantId, days);
            result = deadStock;
            const totalValue = deadStock.reduce((sum, d) => sum + d.stockValue, 0);
            summary = `Ditemukan ${deadStock.length} produk dead stock (tidak terjual >${days} hari). Total nilai: Rp ${new Intl.NumberFormat('id-ID').format(totalValue)}`;
            break;
        }
        case 'inventory_insights': {
            const insights = await getInventoryInsights(tenantId);
            result = insights;
            summary = insights.summary;
            break;
        }
        case 'demand_forecast': {
            const productId = typeof params.productId === 'string' ? params.productId : '';
            const forecastDays = typeof params.days === 'number' ? params.days : 30;
            if (!productId) throw new Error('productId is required for demand_forecast');
            const forecast = await forecastDemand(tenantId, productId, forecastDays);
            result = forecast;
            summary = forecast.summary;
            break;
        }

        default:
            throw new Error(`Unknown action: ${action}`);
    }

    return {
        agent,
        action,
        result,
        summary,
        timestamp: new Date().toISOString(),
    };
}

/**
 * Get proactive suggestions for the tenant based on current data state.
 * Runs quick checks across all agents and returns prioritized suggestions.
 */
export async function getAgentSuggestions(
    tenantId: string
): Promise<AgentSuggestion[]> {
    logger.info(`[AgentOrchestrator] Getting agent suggestions`);

    const suggestions: AgentSuggestion[] = [];

    // Run checks in parallel (with error handling per agent)
    const [financeResult, salesResult, inventoryResult] = await Promise.allSettled([
        getPaymentReminders(tenantId),
        getPipelineInsights(tenantId),
        predictStockout(tenantId),
    ]);

    // Finance: payment reminders
    if (financeResult.status === 'fulfilled') {
        const criticalInvoices = financeResult.value.filter(r => r.urgency === 'critical');
        if (criticalInvoices.length > 0) {
            suggestions.push({
                agent: 'finance',
                action: 'payment_reminders',
                label: `${criticalInvoices.length} invoice overdue critical`,
                description: `${criticalInvoices.length} invoice sudah jatuh tempo dan perlu ditindak segera.`,
                priority: 'high',
                data: criticalInvoices.slice(0, 3),
            });
        }
    }

    // Sales: pipeline health
    if (salesResult.status === 'fulfilled') {
        const insights = salesResult.value;
        if (insights.bottlenecks.length > 0) {
            suggestions.push({
                agent: 'sales',
                action: 'pipeline_insights',
                label: `${insights.bottlenecks.length} bottleneck di pipeline`,
                description: insights.bottlenecks[0],
                priority: 'medium',
                data: insights.bottlenecks,
            });
        }
    }

    // Inventory: stockout risk
    if (inventoryResult.status === 'fulfilled') {
        const criticalProducts = inventoryResult.value.filter(p => p.urgency === 'critical');
        if (criticalProducts.length > 0) {
            suggestions.push({
                agent: 'inventory',
                action: 'stockout_prediction',
                label: `${criticalProducts.length} produk berisiko stockout`,
                description: criticalProducts[0].suggestedAction,
                priority: 'high',
                data: criticalProducts.slice(0, 3),
            });
        }
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return suggestions;
}
