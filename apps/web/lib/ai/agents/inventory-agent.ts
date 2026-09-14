// ─── Inventory Agent ───────────────────────────────────────────────────────
// Provides inventory insights: stockout prediction, demand forecasting,
// dead stock detection, reorder suggestions, and inventory health analysis.
// Uses statistical analysis for trend prediction and demand forecasting.

import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import {
    mean,
    trendDirection,
    simpleMovingAverage,
    descriptiveStats,
    detectSeasonality,
    type TrendAnalysis,
} from '@/lib/ai/statistical-analysis';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface StockoutPrediction {
    productId: string;
    productName: string;
    sku: string;
    currentStock: number;
    dailyUsage: number;
    daysUntilStockout: number;
    urgency: 'critical' | 'high' | 'medium' | 'low';
    suggestedAction: string;
}

export interface ReorderSuggestion {
    productId: string;
    productName: string;
    sku: string;
    currentStock: number;
    suggestedQty: number;
    reorderPoint: number;
    supplierName: string | null;
    supplierContact: string | null;
    estimatedCost: number;
    priority: 'urgent' | 'soon' | 'planned';
}

export interface DeadStockItem {
    productId: string;
    productName: string;
    sku: string;
    currentStock: number;
    lastSold: string | null;
    stockValue: number;
    daysSinceLastSale: number;
    recommendation: string;
}

export interface InventoryInsights {
    totalProducts: number;
    totalValue: number;
    lowStockCount: number;
    outOfStockCount: number;
    turnoverRate: number;
    topMovers: Array<{ productName: string; unitsSold: number; revenue: number }>;
    slowMovers: Array<{ productName: string; unitsSold: number; stockValue: number }>;
    summary: string;
}

export interface DemandForecast {
    productId: string;
    productName: string;
    daily: Array<{ date: string; predicted: number }>;
    trend: TrendAnalysis;
    hasSeasonality: boolean;
    seasonalityPattern: string;
    averageDailyDemand: number;
    summary: string;
}

// ─── Main Functions ────────────────────────────────────────────────────────

/**
 * Predict which products will run out of stock and when.
 * Based on daily usage rate calculated from stock movements.
 */
export async function predictStockout(
    tenantId: string
): Promise<StockoutPrediction[]> {
    logger.info(`[InventoryAgent] Predicting stockout for tenant`);

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Fetch products with stock > 0 (or low stock)
    const products = await prisma.product.findMany({
        where: {
            tenantId,
            isActive: true,
            deletedAt: null,
        },
        select: {
            id: true,
            name: true,
            sku: true,
            stock: true,
            minStock: true,
        },
    });

    const predictions: StockoutPrediction[] = [];

    for (const product of products) {
        // Get stock movements for this product (last 90 days)
        const movements = await prisma.stockMovement.findMany({
            where: {
                tenantId,
                productId: product.id,
                createdAt: { gte: ninetyDaysAgo },
            },
            select: {
                type: true,
                quantity: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'asc' },
        });

        // Calculate daily usage (OUT movements only)
        const outMovements = movements.filter(m => m.type === 'OUT');
        if (outMovements.length === 0) continue; // No sales data = skip

        // Group by date
        const dailyUsageMap: Record<string, number> = {};
        for (const m of outMovements) {
            const dateKey = m.createdAt.toISOString().split('T')[0];
            dailyUsageMap[dateKey] = (dailyUsageMap[dateKey] || 0) + m.quantity;
        }

        // Calculate average daily usage
        const usageValues = Object.values(dailyUsageMap);
        const avgDailyUsage = usageValues.length > 0 ? mean(usageValues) : 0;

        if (avgDailyUsage <= 0) continue;

        // Calculate days until stockout
        const daysUntilStockout = product.stock > 0
            ? Math.floor(product.stock / avgDailyUsage)
            : 0;

        // Only include if stockout is within 90 days
        if (daysUntilStockout > 90) continue;

        // Determine urgency
        let urgency: StockoutPrediction['urgency'];
        let suggestedAction: string;

        if (daysUntilStockout === 0) {
            urgency = 'critical';
            suggestedAction = `Stok habis! Segera lakukan reorder ${product.name}.`;
        } else if (daysUntilStockout <= 3) {
            urgency = 'critical';
            suggestedAction = `Stok tersisa ${daysUntilStockout} hari. Segera reorder ${product.name} untuk menghindari stockout.`;
        } else if (daysUntilStockout <= 7) {
            urgency = 'high';
            suggestedAction = `Stok tersisa ${daysUntilStockout} hari. Buat purchase order untuk ${product.name} dalam 1-2 hari.`;
        } else if (daysUntilStockout <= 14) {
            urgency = 'medium';
            suggestedAction = `Stok tersisa ${daysUntilStockout} hari. Rencanakan reorder ${product.name} minggu ini.`;
        } else {
            urgency = 'low';
            suggestedAction = `Stok tersisa ${daysUntilStockout} hari. Monitor dan rencanakan reorder.`;
        }

        predictions.push({
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            currentStock: product.stock,
            dailyUsage: Math.round(avgDailyUsage * 100) / 100,
            daysUntilStockout,
            urgency,
            suggestedAction,
        });
    }

    // Sort by urgency and days until stockout
    const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    predictions.sort((a, b) => {
        const urgencyDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
        if (urgencyDiff !== 0) return urgencyDiff;
        return a.daysUntilStockout - b.daysUntilStockout;
    });

    return predictions;
}

/**
 * Suggest reorder quantities based on usage patterns and safety stock.
 */
export async function suggestReorder(
    tenantId: string
): Promise<ReorderSuggestion[]> {
    logger.info(`[InventoryAgent] Suggesting reorder quantities`);

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Fetch products with stock below or near minStock
    const products = await prisma.product.findMany({
        where: {
            tenantId,
            isActive: true,
            deletedAt: null,
            stock: { lte: 50 } // Focus on products with stock ≤ 50
        },
        select: {
            id: true,
            name: true,
            sku: true,
            stock: true,
            minStock: true,
            cost: true,
        },
    });

    const suggestions: ReorderSuggestion[] = [];

    for (const product of products) {
        // Get stock OUT movements
        const outMovements = await prisma.stockMovement.findMany({
            where: {
                tenantId,
                productId: product.id,
                type: 'OUT',
                createdAt: { gte: ninetyDaysAgo },
            },
            select: {
                quantity: true,
                createdAt: true,
            },
        });

        if (outMovements.length === 0) continue;

        // Calculate daily usage
        const dailyUsageMap: Record<string, number> = {};
        for (const m of outMovements) {
            const dateKey = m.createdAt.toISOString().split('T')[0];
            dailyUsageMap[dateKey] = (dailyUsageMap[dateKey] || 0) + m.quantity;
        }

        const usageValues = Object.values(dailyUsageMap);
        const avgDailyUsage = usageValues.length > 0 ? mean(usageValues) : 0;

        if (avgDailyUsage <= 0) continue;

        // Calculate reorder point (safety stock = 7 days of usage)
        const safetyStock = Math.ceil(avgDailyUsage * 7);
        const reorderPoint = safetyStock + Math.ceil(avgDailyUsage * 14); // 14 days lead time

        // Only suggest if stock is at or below reorder point
        if (product.stock > reorderPoint) continue;

        // Suggested qty = enough for 30 days + safety stock
        const suggestedQty = Math.ceil(avgDailyUsage * 30 + safetyStock - product.stock);

        // Find supplier info from purchase orders
        const lastPO = await prisma.purchaseOrder.findFirst({
            where: {
                tenantId,
                items: {
                    some: { productId: product.id },
                },
            },
            include: {
                supplier: {
                    select: { name: true, phone: true, email: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        const estimatedCost = suggestedQty * Number(product.cost);

        // Determine priority
        let priority: ReorderSuggestion['priority'];
        if (product.stock === 0 || product.stock <= product.minStock) {
            priority = 'urgent';
        } else if (product.stock <= reorderPoint) {
            priority = 'soon';
        } else {
            priority = 'planned';
        }

        suggestions.push({
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            currentStock: product.stock,
            suggestedQty,
            reorderPoint,
            supplierName: lastPO?.supplier?.name || null,
            supplierContact: lastPO?.supplier?.phone || lastPO?.supplier?.email || null,
            estimatedCost: Math.round(estimatedCost),
            priority,
        });
    }

    // Sort by priority
    const priorityOrder = { urgent: 0, soon: 1, planned: 2 };
    suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return suggestions;
}

/**
 * Detect dead stock — products with no sales in the specified number of days.
 */
export async function detectDeadStock(
    tenantId: string,
    days: number = 60
): Promise<DeadStockItem[]> {
    logger.info(`[InventoryAgent] Detecting dead stock (${days} days threshold)`);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Fetch active products with stock > 0
    const products = await prisma.product.findMany({
        where: {
            tenantId,
            isActive: true,
            deletedAt: null,
            stock: { gt: 0 },
        },
        select: {
            id: true,
            name: true,
            sku: true,
            stock: true,
            price: true,
            cost: true,
        },
    });

    const deadStock: DeadStockItem[] = [];

    for (const product of products) {
        // Check last OUT movement
        const lastOutMovement = await prisma.stockMovement.findFirst({
            where: {
                tenantId,
                productId: product.id,
                type: 'OUT',
            },
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true },
        });

        const daysSinceLastSale = lastOutMovement
            ? Math.floor((Date.now() - lastOutMovement.createdAt.getTime()) / (1000 * 60 * 60 * 24))
            : 999; // Never sold

        // Only flag if no sale in threshold period
        if (daysSinceLastSale < days) continue;

        const stockValue = product.stock * Number(product.cost || product.price);

        let recommendation: string;
        if (!lastOutMovement) {
            recommendation = 'Produk belum pernah terjual. Pertimbangkan untuk menghapus dari katalog atau lakukan promosi.';
        } else if (daysSinceLastSale > 180) {
            recommendation = `Tidak terjual selama ${daysSinceLastSale} hari. Pertimbangkan clearance sale atau liquidation.`;
        } else if (daysSinceLastSale > 90) {
            recommendation = `Tidak terjual selama ${daysSinceLastSale} hari. Coba promosi atau bundle dengan produk lain.`;
        } else {
            recommendation = `Tidak terjual selama ${daysSinceLastSale} hari. Monitor dan pertimbangkan diskon jika masih stagnan.`;
        }

        deadStock.push({
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            currentStock: product.stock,
            lastSold: lastOutMovement?.createdAt.toISOString().split('T')[0] || null,
            stockValue: Math.round(stockValue),
            daysSinceLastSale,
            recommendation,
        });
    }

    // Sort by stock value (highest first) and days since last sale
    deadStock.sort((a, b) => b.stockValue - a.stockValue);

    return deadStock;
}

/**
 * Get comprehensive inventory insights: value, turnover, top/slow movers.
 */
export async function getInventoryInsights(
    tenantId: string
): Promise<InventoryInsights> {
    logger.info(`[InventoryAgent] Getting inventory insights`);

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Fetch all products
    const products = await prisma.product.findMany({
        where: {
            tenantId,
            isActive: true,
            deletedAt: null,
        },
        select: {
            id: true,
            name: true,
            stock: true,
            price: true,
            cost: true,
        },
    });

    const totalProducts = products.length;
    const totalValue = products.reduce((sum, p) => sum + p.stock * Number(p.cost || p.price), 0);
    const lowStockCount = products.filter(p => p.stock > 0 && p.stock <= 10).length;
    const outOfStockCount = products.filter(p => p.stock === 0).length;

    // Calculate turnover rate
    // Turnover = Cost of Goods Sold / Average Inventory Value
    const outMovements = await prisma.stockMovement.findMany({
        where: {
            tenantId,
            type: 'OUT',
            createdAt: { gte: ninetyDaysAgo },
        },
        select: {
            productId: true,
            quantity: true,
            createdAt: true,
        },
    });

    // Map product cost
    const productCostMap: Record<string, number> = {};
    for (const p of products) {
        productCostMap[p.id] = Number(p.cost || p.price);
    }

    // COGS from OUT movements
    const cogs = outMovements.reduce((sum, m) => {
        return sum + m.quantity * (productCostMap[m.productId] || 0);
    }, 0);

    // Average inventory value (simplified: use current value)
    const avgInventoryValue = totalValue || 1;
    const turnoverRate = cogs / avgInventoryValue;

    // Top movers (most units sold)
    const salesByProduct: Record<string, { units: number; revenue: number }> = {};
    for (const m of outMovements) {
        if (!salesByProduct[m.productId]) {
            salesByProduct[m.productId] = { units: 0, revenue: 0 };
        }
        salesByProduct[m.productId].units += m.quantity;
        salesByProduct[m.productId].revenue += m.quantity * (productCostMap[m.productId] || 0);
    }

    const topMovers = Object.entries(salesByProduct)
        .map(([productId, data]) => ({
            productName: products.find(p => p.id === productId)?.name || 'Unknown',
            unitsSold: data.units,
            revenue: Math.round(data.revenue),
        }))
        .sort((a, b) => b.unitsSold - a.unitsSold)
        .slice(0, 5);

    // Slow movers (low sales but high stock)
    const slowMovers = products
        .filter(p => {
            const sales = salesByProduct[p.id];
            return p.stock > 5 && (!sales || sales.units < 3);
        })
        .map(p => ({
            productName: p.name,
            unitsSold: salesByProduct[p.id]?.units || 0,
            stockValue: Math.round(p.stock * Number(p.cost || p.price)),
        }))
        .sort((a, b) => b.stockValue - a.stockValue)
        .slice(0, 5);

    const summary = [
        `📦 Inventory Overview:`,
        `• ${totalProducts} produk aktif`,
        `• Total nilai stok: Rp ${formatNumber(totalValue)}`,
        `• Low stock: ${lowStockCount} produk, Out of stock: ${outOfStockCount} produk`,
        `• Turnover rate: ${turnoverRate.toFixed(2)}x (90 hari)`,
        topMovers.length > 0 ? `• Top mover: ${topMovers[0].productName} (${topMovers[0].unitsSold} unit)` : '',
        slowMovers.length > 0 ? `• ⚠️ ${slowMovers.length} produk lambat terjual` : '',
    ].filter(Boolean).join('\n');

    return {
        totalProducts,
        totalValue: Math.round(totalValue),
        lowStockCount,
        outOfStockCount,
        turnoverRate: Math.round(turnoverRate * 100) / 100,
        topMovers,
        slowMovers,
        summary,
    };
}

/**
 * Forecast demand for a specific product over N days.
 * Uses historical stock movements + seasonality detection.
 */
export async function forecastDemand(
    tenantId: string,
    productId: string,
    days: number = 30
): Promise<DemandForecast> {
    logger.info(`[InventoryAgent] Forecasting demand for product ${productId}`);

    const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { id: true, name: true },
    });

    if (!product) {
        throw new Error('Product not found');
    }

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Fetch stock movements
    const movements = await prisma.stockMovement.findMany({
        where: {
            tenantId,
            productId,
            type: 'OUT',
            createdAt: { gte: ninetyDaysAgo },
        },
        select: {
            quantity: true,
            createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
    });

    // Build daily demand array
    const today = new Date();
    const dailyDemand: number[] = [];
    const timestamps: Date[] = [];

    for (let i = 89; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        timestamps.push(d);

        const dateKey = d.toISOString().split('T')[0];
        const dayDemand = movements
            .filter(m => m.createdAt.toISOString().split('T')[0] === dateKey)
            .reduce((sum, m) => sum + m.quantity, 0);
        dailyDemand.push(dayDemand);
    }

    // Statistical analysis
    const demandWithSales = dailyDemand.filter(d => d > 0);
    const avgDailyDemand = demandWithSales.length > 0 ? mean(demandWithSales) : 0;
    const trend = trendDirection(dailyDemand);
    const sma7 = simpleMovingAverage(dailyDemand, 7);
    const lastSma7 = sma7.filter(v => !isNaN(v)).slice(-1)[0] || avgDailyDemand;

    // Seasonality detection
    const seasonality = detectSeasonality(timestamps, dailyDemand);

    // Predict future demand
    const daily: DemandForecast['daily'] = [];
    for (let i = 0; i < days; i++) {
        const futureDate = new Date(today);
        futureDate.setDate(futureDate.getDate() + i + 1);

        let predicted = lastSma7 + trend.slope * (i + 1);

        // Apply seasonality if detected
        if (seasonality.hasSeasonality && seasonality.confidence > 0.3) {
            const dayOfWeek = futureDate.getDay();
            const dowAvg = seasonality.dayOfWeekDistribution[dayOfWeek];
            const overallMean = mean(seasonality.dayOfWeekDistribution.filter(v => v > 0));
            if (overallMean > 0) {
                predicted *= dowAvg / overallMean;
            }
        }

        predicted = Math.max(0, Math.round(predicted * 100) / 100);

        daily.push({
            date: futureDate.toISOString().split('T')[0],
            predicted,
        });
    }

    const trendLabel = trend.direction === 'increasing' ? 'meningkat 📈' :
        trend.direction === 'decreasing' ? 'menurun 📉' : 'stabil ➡️';

    const summary = [
        `📦 Demand Forecast untuk ${product.name}:`,
        `• Rata-rata harian: ${avgDailyDemand.toFixed(1)} unit`,
        `• Tren: ${trendLabel} (perubahan ${Math.abs(trend.changeRate).toFixed(1)}%)`,
        seasonality.hasSeasonality
            ? `• Seasonality terdeteksi: ${seasonality.pattern} (confidence: ${(seasonality.confidence * 100).toFixed(0)}%)`
            : '• Tidak ada pola seasonality yang signifikan',
        `• Total prediksi ${days} hari: ${daily.reduce((sum, d) => sum + d.predicted, 0).toFixed(0)} unit`,
    ].join('\n');

    return {
        productId: product.id,
        productName: product.name,
        daily,
        trend,
        hasSeasonality: seasonality.hasSeasonality,
        seasonalityPattern: seasonality.pattern,
        averageDailyDemand: Math.round(avgDailyDemand * 100) / 100,
        summary,
    };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatNumber(num: number): string {
    return new Intl.NumberFormat('id-ID').format(Math.round(num));
}
