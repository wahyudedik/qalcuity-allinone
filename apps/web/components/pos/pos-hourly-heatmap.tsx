'use client';

/**
 * POS Hourly Heatmap — Grid heatmap showing busiest hours
 *
 * 7 rows (days) × 24 columns (hours) with color intensity
 * based on transaction count. Shows peak hours summary.
 */

import { useState, useEffect } from 'react';
import { Clock, Flame } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

interface HourlyHeatmapData {
    heatmap: {
        transactions: number[][];
        revenue: number[][];
    };
    summary: {
        busiestDay: string;
        busiestDayTransactions: number;
        busiestHour: string;
        busiestHourTransactions: number;
        peakHour: string;
        peakTransactions: number;
    };
    totalsByDay: Array<{ day: string; transactions: number; revenue: number }>;
    totalsByHour: Array<{ hour: string; transactions: number }>;
}

interface PosHourlyHeatmapProps {
    dateFrom?: string;
    dateTo?: string;
}

const DAY_LABELS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function getHeatColor(value: number, maxValue: number): string {
    if (maxValue === 0 || value === 0) return 'bg-gray-50 dark:bg-gray-800';
    const ratio = value / maxValue;
    if (ratio > 0.8) return 'bg-red-500 dark:bg-red-600';
    if (ratio > 0.6) return 'bg-orange-400 dark:bg-orange-500';
    if (ratio > 0.4) return 'bg-yellow-400 dark:bg-yellow-500';
    if (ratio > 0.2) return 'bg-green-300 dark:bg-green-600';
    if (ratio > 0.05) return 'bg-green-200 dark:bg-green-700';
    return 'bg-gray-50 dark:bg-gray-800';
}

function getHeatTextColor(value: number, maxValue: number): string {
    if (maxValue === 0 || value === 0) return 'text-gray-400 dark:text-gray-600';
    const ratio = value / maxValue;
    if (ratio > 0.6) return 'text-white';
    return 'text-gray-600 dark:text-gray-400';
}

export function PosHourlyHeatmap({ dateFrom, dateTo }: PosHourlyHeatmapProps) {
    const [data, setData] = useState<HourlyHeatmapData | null>(null);
    const [loading, setLoading] = useState(true);
    const [dataType, setDataType] = useState<'transactions' | 'revenue'>('transactions');

    useEffect(() => {
        async function fetchHeatmap() {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                if (dateFrom) params.set('dateFrom', dateFrom);
                if (dateTo) params.set('dateTo', dateTo);

                const res = await fetch(`/api/pos/analytics/hours?${params.toString()}`);
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
        fetchHeatmap();
    }, [dateFrom, dateTo]);

    if (loading) {
        return (
            <div className="space-y-3">
                <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
                <div className="h-48 bg-gray-200 rounded-xl animate-pulse" />
            </div>
        );
    }

    if (!data) {
        return (
            <EmptyState
                icon={Clock}
                title="Belum ada data jam"
                description="Data heatmap jam sibuk akan muncul setelah ada transaksi"
            />
        );
    }

    const { heatmap, summary } = data;
    const matrix = dataType === 'transactions' ? heatmap.transactions : heatmap.revenue;

    // Find max value for color scaling
    let maxVal = 0;
    for (const day of matrix) {
        for (const val of day) {
            if (val > maxVal) maxVal = val;
        }
    }

    // Visible hours: 6 AM to 11 PM (18 columns)
    const visibleHours = HOURS.filter((h) => h >= 6 && h <= 23);

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Heatmap Jam Sibuk
                </h3>
                <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <button
                        onClick={() => setDataType('transactions')}
                        className={`px-2 py-1 text-xs font-medium transition-colors ${dataType === 'transactions'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                    >
                        Transaksi
                    </button>
                    <button
                        onClick={() => setDataType('revenue')}
                        className={`px-2 py-1 text-xs font-medium transition-colors ${dataType === 'revenue'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                    >
                        Revenue
                    </button>
                </div>
            </div>

            {/* Summary cards */}
            <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 rounded-lg bg-orange-50 px-3 py-2 dark:bg-orange-900/20">
                    <Flame className="h-4 w-4 text-orange-500" />
                    <div>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">Puncak</p>
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                            {summary.peakHour}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 dark:bg-blue-900/20">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <div>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">Hari Ter ramai</p>
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                            {summary.busiestDay} ({summary.busiestDayTransactions})
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 dark:bg-green-900/20">
                    <Clock className="h-4 w-4 text-green-500" />
                    <div>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">Jam Ter ramai</p>
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                            {summary.busiestHour} ({summary.busiestHourTransactions})
                        </p>
                    </div>
                </div>
            </div>

            {/* Heatmap grid */}
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
                <div className="min-w-[600px]">
                    {/* Hour labels */}
                    <div className="flex items-center mb-1">
                        <div className="w-8 shrink-0" />
                        {visibleHours.map((h) => (
                            <div
                                key={h}
                                className="flex-1 text-center text-[8px] sm:text-[9px] text-gray-400 dark:text-gray-500"
                            >
                                {h % 3 === 0 ? `${h.toString().padStart(2, '0')}` : ''}
                            </div>
                        ))}
                    </div>

                    {/* Day rows */}
                    {DAY_LABELS.map((day, dayIndex) => (
                        <div key={day} className="flex items-center gap-0.5 mb-0.5">
                            <span className="w-8 text-[10px] text-gray-500 dark:text-gray-400 shrink-0 text-right pr-1">
                                {day}
                            </span>
                            {visibleHours.map((h) => {
                                const value = matrix[dayIndex]?.[h] || 0;
                                return (
                                    <div
                                        key={`${dayIndex}-${h}`}
                                        className={`flex-1 aspect-square rounded-sm flex items-center justify-center ${getHeatColor(value, maxVal)} ${getHeatTextColor(value, maxVal)} transition-colors cursor-default`}
                                        title={`${day} ${h.toString().padStart(2, '0')}:00 — ${dataType === 'transactions'
                                                ? `${value} transaksi`
                                                : `Rp ${value.toLocaleString('id-ID')}`
                                            }`}
                                    >
                                        <span className="text-[7px] sm:text-[8px] font-medium">
                                            {value > 0 && maxVal <= 50 ? value : ''}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    ))}

                    {/* Legend */}
                    <div className="flex items-center justify-end gap-1 mt-2">
                        <span className="text-[9px] text-gray-400 dark:text-gray-500">Sedikit</span>
                        {['bg-gray-50 dark:bg-gray-800', 'bg-green-200 dark:bg-green-700', 'bg-green-300 dark:bg-green-600', 'bg-yellow-400 dark:bg-yellow-500', 'bg-orange-400 dark:bg-orange-500', 'bg-red-500 dark:bg-red-600'].map((cls, i) => (
                            <div key={i} className={`w-3 h-3 rounded-sm ${cls}`} />
                        ))}
                        <span className="text-[9px] text-gray-400 dark:text-gray-500">Banyak</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
