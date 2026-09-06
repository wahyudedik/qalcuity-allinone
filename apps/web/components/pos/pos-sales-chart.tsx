'use client';

/**
 * POS Sales Chart — Line/bar chart untuk revenue over time
 *
 * Supports daily/weekly/monthly toggle.
 * Uses existing LineChart and BarChart from ui/charts.tsx.
 */

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, BarChart3 } from 'lucide-react';
import { LineChart, BarChart } from '@/components/ui/charts';
import { EmptyState } from '@/components/ui/empty-state';
import { formatCurrency, formatNumber } from '@/lib/utils';

type Period = 'daily' | 'weekly' | 'monthly';

interface SalesSummary {
    totalRevenue: number;
    totalTransactions: number;
    avgOrderValue: number;
    revenueGrowth: number;
    transactionGrowth: number;
}

interface SalesTimeline {
    date: string;
    revenue: number;
    transactions: number;
    avgOrderValue: number;
}

interface SalesData {
    summary: SalesSummary;
    timeline: SalesTimeline[];
    paymentBreakdown: Array<{ method: string; count: number; total: number }>;
}

interface PosSalesChartProps {
    dateFrom?: string;
    dateTo?: string;
}

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
    { value: 'daily', label: 'Harian' },
    { value: 'weekly', label: 'Mingguan' },
    { value: 'monthly', label: 'Bulanan' },
];

function formatPeriodLabel(dateStr: string, period: Period): string {
    if (period === 'monthly') {
        // "2026-09" → "Sep 2026"
        const [year, month] = dateStr.split('-');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        return `${months[parseInt(month) - 1]} ${year}`;
    }
    if (period === 'weekly') {
        // "2026-W36" → "W36"
        return dateStr.replace('2026-', '');
    }
    // daily: "2026-09-05" → "5 Sep"
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return `${parseInt(parts[2])}`;
    }
    return dateStr;
}

export function PosSalesChart({ dateFrom, dateTo }: PosSalesChartProps) {
    const [period, setPeriod] = useState<Period>('daily');
    const [data, setData] = useState<SalesData | null>(null);
    const [loading, setLoading] = useState(true);
    const [chartType, setChartType] = useState<'line' | 'bar'>('line');

    useEffect(() => {
        async function fetchSalesData() {
            setLoading(true);
            try {
                const params = new URLSearchParams({ period });
                if (dateFrom) params.set('dateFrom', dateFrom);
                if (dateTo) params.set('dateTo', dateTo);

                const res = await fetch(`/api/pos/analytics/sales?${params.toString()}`);
                if (res.ok) {
                    const json = await res.json();
                    if (json.success) {
                        setData(json.data);
                    }
                }
            } catch {
                // Silently handle errors
            } finally {
                setLoading(false);
            }
        }
        fetchSalesData();
    }, [period, dateFrom, dateTo]);

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
                    <div className="flex gap-2">
                        <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
                        <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
                    </div>
                </div>
                <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />
            </div>
        );
    }

    if (!data || data.timeline.length === 0) {
        return (
            <EmptyState
                icon={BarChart3}
                title="Belum ada data penjualan"
                description="Data penjualan akan muncul setelah ada transaksi POS"
            />
        );
    }

    const { summary, timeline } = data;
    const labels = timeline.map((d) => formatPeriodLabel(d.date, period));
    const revenueData = timeline.map((d) => d.revenue);
    const transactionData = timeline.map((d) => d.transactions);

    return (
        <div className="space-y-4">
            {/* Header with period toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Trend Penjualan
                </h3>
                <div className="flex items-center gap-2">
                    {/* Chart type toggle */}
                    <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <button
                            onClick={() => setChartType('line')}
                            className={`px-2 py-1 text-xs font-medium transition-colors ${chartType === 'line'
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                    : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`}
                        >
                            Line
                        </button>
                        <button
                            onClick={() => setChartType('bar')}
                            className={`px-2 py-1 text-xs font-medium transition-colors ${chartType === 'bar'
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                    : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`}
                        >
                            Bar
                        </button>
                    </div>
                    {/* Period toggle */}
                    <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                        {PERIOD_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => setPeriod(opt.value)}
                                className={`px-3 py-1 text-xs font-medium transition-colors ${period === opt.value
                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                        : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                                    }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                        <DollarSign className="h-4 w-4" />
                        <span className="text-xs">Total Revenue</span>
                    </div>
                    <p className="mt-1 text-lg font-bold text-gray-900 dark:text-gray-100">
                        {formatCurrency(summary.totalRevenue)}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                        {summary.revenueGrowth >= 0 ? (
                            <TrendingUp className="h-3 w-3 text-green-500" />
                        ) : (
                            <TrendingDown className="h-3 w-3 text-red-500" />
                        )}
                        <span className={`text-xs font-medium ${summary.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                            {summary.revenueGrowth >= 0 ? '+' : ''}{summary.revenueGrowth.toFixed(1)}%
                        </span>
                    </div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                        <ShoppingCart className="h-4 w-4" />
                        <span className="text-xs">Total Transaksi</span>
                    </div>
                    <p className="mt-1 text-lg font-bold text-gray-900 dark:text-gray-100">
                        {formatNumber(summary.totalTransactions)}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                        {summary.transactionGrowth >= 0 ? (
                            <TrendingUp className="h-3 w-3 text-green-500" />
                        ) : (
                            <TrendingDown className="h-3 w-3 text-red-500" />
                        )}
                        <span className={`text-xs font-medium ${summary.transactionGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                            {summary.transactionGrowth >= 0 ? '+' : ''}{summary.transactionGrowth.toFixed(1)}%
                        </span>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                {chartType === 'line' ? (
                    <LineChart
                        data={revenueData}
                        labels={labels}
                        color="#3B82F6"
                        height={220}
                        showDots={revenueData.length <= 31}
                    />
                ) : (
                    <BarChart
                        data={revenueData}
                        labels={labels}
                        height={220}
                        showValues={revenueData.length <= 31}
                        valuePrefix="Rp"
                    />
                )}
            </div>

            {/* Payment breakdown */}
            {data.paymentBreakdown.length > 0 && (
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                    <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">
                        Metode Pembayaran
                    </h4>
                    <div className="space-y-2">
                        {data.paymentBreakdown.map((p) => {
                            const pct = summary.totalRevenue > 0
                                ? (p.total / summary.totalRevenue) * 100
                                : 0;
                            return (
                                <div key={p.method} className="flex items-center gap-3">
                                    <span className="text-xs text-gray-600 dark:text-gray-400 w-24 shrink-0">
                                        {p.method}
                                    </span>
                                    <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-500 rounded-full transition-all"
                                            style={{ width: `${Math.max(pct, 1)}%` }}
                                        />
                                    </div>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 w-16 text-right">
                                        {pct.toFixed(1)}%
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
