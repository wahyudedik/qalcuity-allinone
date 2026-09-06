'use client';

/**
 * POS Analytics Dashboard — Advanced Analytics for POS
 *
 * Combines all 4 analytics charts:
 * - Sales Chart (revenue over time)
 * - Top Products (best sellers)
 * - Hourly Heatmap (busiest hours)
 * - Customer Insights (repeat rate, top customers, loyalty)
 *
 * Date range filter with default: last 30 days.
 * Responsive: charts stack on mobile.
 */

import { useState } from 'react';
import { BarChart3, Calendar, Download, RefreshCw } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { PosSalesChart } from '@/components/pos/pos-sales-chart';
import { PosTopProducts } from '@/components/pos/pos-top-products';
import { PosHourlyHeatmap } from '@/components/pos/pos-hourly-heatmap';
import { PosCustomerInsights } from '@/components/pos/pos-customer-insights';

export default function POSAnalyticsPage() {
    const { t } = useTranslation();
    const [dateFrom, setDateFrom] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().split('T')[0];
    });
    const [dateTo, setDateTo] = useState(() => {
        return new Date().toISOString().split('T')[0];
    });
    const [refreshKey, setRefreshKey] = useState(0);

    const handleRefresh = () => {
        setRefreshKey((k) => k + 1);
    };

    // Quick date range presets
    const presets = [
        { label: '7 Hari', days: 7 },
        { label: '30 Hari', days: 30 },
        { label: '90 Hari', days: 90 },
        { label: 'Tahun Ini', days: 365 },
    ];

    return (
        <div className="space-y-6">
            {/* Page header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {t('pos.analytics.title') || 'Analytics POS'}
                    </h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {t('pos.analytics.description') || 'Analisis performa penjualan, produk, jam sibuk, dan pelanggan'}
                    </p>
                </div>
                <button
                    onClick={handleRefresh}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                </button>
            </div>

            {/* Date range filter */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Rentang:</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {presets.map((preset) => {
                        const isActive = (() => {
                            const from = new Date(dateFrom);
                            const to = new Date(dateTo);
                            const diffDays = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
                            return Math.abs(diffDays - preset.days) < 1;
                        })();
                        return (
                            <button
                                key={preset.label}
                                onClick={() => {
                                    const to = new Date();
                                    const from = new Date();
                                    from.setDate(from.getDate() - preset.days);
                                    setDateFrom(from.toISOString().split('T')[0]);
                                    setDateTo(to.toISOString().split('T')[0]);
                                }}
                                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${isActive
                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                        : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                            >
                                {preset.label}
                            </button>
                        );
                    })}
                </div>
                <div className="flex items-center gap-2">
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                    />
                    <span className="text-xs text-gray-400">s/d</span>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                    />
                </div>
            </div>

            {/* Analytics grid */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2" key={refreshKey}>
                {/* Sales Chart — full width */}
                <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                    <PosSalesChart dateFrom={dateFrom} dateTo={dateTo} />
                </div>

                {/* Top Products */}
                <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                    <PosTopProducts dateFrom={dateFrom} dateTo={dateTo} limit={10} />
                </div>

                {/* Customer Insights */}
                <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                    <PosCustomerInsights dateFrom={dateFrom} dateTo={dateTo} />
                </div>

                {/* Hourly Heatmap — full width */}
                <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                    <PosHourlyHeatmap dateFrom={dateFrom} dateTo={dateTo} />
                </div>
            </div>
        </div>
    );
}
