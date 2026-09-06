'use client';

/**
 * Budget Tracker Component — Visualisasi budget vs actual spending
 *
 * Features:
 * - Budget overview cards (total, spent, remaining)
 * - Category breakdown dengan progress bars
 * - Visual comparison (planned vs actual)
 * - Responsive: mobile ke card view
 */

import { DollarSign, TrendingDown, TrendingUp, AlertTriangle, CheckCircle2, Package } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export interface BudgetLineItem {
    id: string;
    category: string;
    name: string;
    description: string | null;
    planned: number;
    actual: number;
    notes: string | null;
}

export interface BudgetSummary {
    totalPlanned: number;
    totalActual: number;
    totalRemaining: number;
    percentUsed: number;
}

export interface BudgetCategory {
    planned: number;
    actual: number;
    count: number;
}

export interface BudgetData {
    data: BudgetLineItem[];
    summary: BudgetSummary;
    byCategory: Record<string, BudgetCategory>;
}

// =============================================================================
// Constants
// =============================================================================

const CATEGORY_LABELS: Record<string, string> = {
    LABOR: 'Tenaga Kerja',
    MATERIAL: 'Material',
    EQUIPMENT: 'Peralatan',
    TRAVEL: 'Perjalanan',
    SOFTWARE: 'Perangkat Lunak',
    OTHER: 'Lainnya',
};

const CATEGORY_COLORS: Record<string, string> = {
    LABOR: 'bg-blue-500',
    MATERIAL: 'bg-green-500',
    EQUIPMENT: 'bg-purple-500',
    TRAVEL: 'bg-orange-500',
    SOFTWARE: 'bg-cyan-500',
    OTHER: 'bg-gray-500',
};

const CATEGORY_ICONS: Record<string, string> = {
    LABOR: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    MATERIAL: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    EQUIPMENT: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    TRAVEL: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    SOFTWARE: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
    OTHER: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

// =============================================================================
// Sub-components
// =============================================================================

function BudgetCard({ icon: Icon, label, value, color, bgColor }: {
    icon: typeof DollarSign;
    label: string;
    value: string;
    color: string;
    bgColor: string;
}) {
    return (
        <div className={`rounded-lg p-4 ${bgColor}`}>
            <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${color}`} />
                <span className={`text-xs font-medium ${color}`}>{label}</span>
            </div>
            <p className={`mt-1 text-xl font-bold ${color}`}>{value}</p>
        </div>
    );
}

function ProgressBar({ planned, actual, color }: { planned: number; actual: number; color: string }) {
    const percent = planned > 0 ? Math.min((actual / planned) * 100, 100) : 0;
    const isOverBudget = actual > planned;

    return (
        <div className="w-full">
            <div className="h-2.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                    className={`h-2.5 rounded-full transition-all ${isOverBudget ? 'bg-red-500' : color}`}
                    style={{ width: `${percent}%` }}
                />
            </div>
            {isOverBudget && (
                <p className="mt-1 text-[10px] font-medium text-red-500">
                    Melebihi anggaran {formatCurrency(actual - planned)}
                </p>
            )}
        </div>
    );
}

// =============================================================================
// Main Component
// =============================================================================

interface BudgetTrackerProps {
    data: BudgetData | null;
    loading?: boolean;
}

export function BudgetTracker({ data, loading }: BudgetTrackerProps) {
    if (loading) {
        return (
            <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-24 bg-gray-200 rounded animate-pulse dark:bg-gray-700" />
                    ))}
                </div>
                <div className="h-48 bg-gray-200 rounded animate-pulse dark:bg-gray-700" />
            </div>
        );
    }

    if (!data) return null;

    const { summary, byCategory } = data;
    const isOverBudget = summary.totalActual > summary.totalPlanned;

    return (
        <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <BudgetCard
                    icon={DollarSign}
                    label="Total Anggaran"
                    value={summary.totalPlanned > 0 ? formatCurrency(summary.totalPlanned) : '-'}
                    color="text-blue-700 dark:text-blue-300"
                    bgColor="bg-blue-50 dark:bg-blue-900/20"
                />
                <BudgetCard
                    icon={TrendingDown}
                    label="Terpakai"
                    value={formatCurrency(summary.totalActual)}
                    color="text-orange-700 dark:text-orange-300"
                    bgColor="bg-orange-50 dark:bg-orange-900/20"
                />
                <BudgetCard
                    icon={isOverBudget ? AlertTriangle : CheckCircle2}
                    label={isOverBudget ? 'Melebihi Anggaran' : 'Sisa'}
                    value={isOverBudget ? formatCurrency(summary.totalActual - summary.totalPlanned) : formatCurrency(summary.totalRemaining)}
                    color={isOverBudget ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'}
                    bgColor={isOverBudget ? 'bg-red-50 dark:bg-red-900/20' : 'bg-green-50 dark:bg-green-900/20'}
                />
            </div>

            {/* Overall Progress */}
            {summary.totalPlanned > 0 && (
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Persentase Penggunaan</span>
                        <span className={`text-sm font-bold ${isOverBudget ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>
                            {summary.percentUsed}%
                        </span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                        <div
                            className={`h-3 rounded-full transition-all ${isOverBudget ? 'bg-red-500' : 'bg-blue-500'}`}
                            style={{ width: `${Math.min(summary.percentUsed, 100)}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Category Breakdown */}
            {Object.keys(byCategory).length > 0 && (
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Breakdown per Kategori</h3>
                    <div className="space-y-4">
                        {Object.entries(byCategory).map(([category, stats]) => {
                            const catLabel = CATEGORY_LABELS[category] || category;
                            const catColor = CATEGORY_COLORS[category] || 'bg-gray-500';
                            const catIcon = CATEGORY_ICONS[category] || 'bg-gray-100 text-gray-600';
                            const isOver = stats.actual > stats.planned;

                            return (
                                <div key={category} className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className={`flex h-6 w-6 items-center justify-center rounded text-xs font-medium ${catIcon}`}>
                                                <Package className="h-3 w-3" />
                                            </div>
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{catLabel}</span>
                                            <span className="text-[10px] text-gray-400 dark:text-gray-500">({stats.count} item)</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                {formatCurrency(stats.actual)} / {formatCurrency(stats.planned)}
                                            </span>
                                            {isOver && (
                                                <span className="ml-2 text-[10px] font-medium text-red-500">
                                                    +{formatCurrency(stats.actual - stats.planned)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <ProgressBar planned={stats.planned} actual={stats.actual} color={catColor} />
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Line Items */}
            {data.data.length > 0 && (
                <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                    <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Detail Anggaran</h3>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {data.data.map((item) => {
                            const isOver = item.actual > item.planned;
                            return (
                                <div key={item.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.name}</p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500">
                                            {CATEGORY_LABELS[item.category] || item.category}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4 shrink-0">
                                        <div className="text-right">
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Rencana</p>
                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{formatCurrency(item.planned)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Aktual</p>
                                            <p className={`text-sm font-bold ${isOver ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                                                {formatCurrency(item.actual)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
