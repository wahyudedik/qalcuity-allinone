'use client';

/**
 * Resource Heatmap Component — Visualisasi utilization karyawan
 *
 * Features:
 * - Heatmap grid (employee x week)
 * - Color coding berdasarkan allocation percentage
 * - Summary stats per employee
 * - Responsive: mobile ke card view
 */

import { useMemo } from 'react';
import { Users, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export interface ResourceAllocationItem {
    id: string;
    projectId: string;
    employeeId: string;
    role: string;
    allocationPct: number;
    startDate: string;
    endDate: string;
    hourlyRate: number | null;
}

export interface ResourceAllocationSummary {
    totalAllocations: number;
    totalAllocationPct: number;
    uniqueEmployees: number;
}

export interface EmployeeAllocation {
    employeeId: string;
    totalAllocation: number;
    allocations: number;
    roles: string[];
}

export interface ResourceData {
    data: ResourceAllocationItem[];
    summary: ResourceAllocationSummary;
    byEmployee: EmployeeAllocation[];
}

// =============================================================================
// Constants
// =============================================================================

const HEATMAP_LEVELS = [
    { max: 0, color: 'bg-gray-100 dark:bg-gray-800', label: 'Tidak ada' },
    { max: 50, color: 'bg-green-200 dark:bg-green-900/40', label: 'Tersedia' },
    { max: 75, color: 'bg-yellow-200 dark:bg-yellow-900/40', label: 'Moderat' },
    { max: 100, color: 'bg-orange-200 dark:bg-orange-900/40', label: 'Tinggi' },
    { max: Infinity, color: 'bg-red-200 dark:bg-red-900/40', label: 'Over-capacity' },
];

// =============================================================================
// Helper Functions
// =============================================================================

function getHeatmapColor(allocation: number): string {
    for (const level of HEATMAP_LEVELS) {
        if (allocation <= level.max) return level.color;
    }
    return HEATMAP_LEVELS[0].color;
}

function getHeatmapLabel(allocation: number): string {
    for (const level of HEATMAP_LEVELS) {
        if (allocation <= level.max) return level.label;
    }
    return HEATMAP_LEVELS[0].label;
}

function formatWeekLabel(date: Date): string {
    return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(date);
}

// =============================================================================
// Sub-components
// =============================================================================

function StatCard({ icon: Icon, label, value, color }: {
    icon: typeof Users;
    label: string;
    value: string | number;
    color: string;
}) {
    return (
        <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800/50">
            <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${color}`} />
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</span>
            </div>
            <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
    );
}

// =============================================================================
// Main Component
// =============================================================================

interface ResourceHeatmapProps {
    data: ResourceData | null;
    loading?: boolean;
}

export function ResourceHeatmap({ data, loading }: ResourceHeatmapProps) {
    // Generate weeks for the heatmap (current month)
    const weeks = useMemo(() => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const weeksList: Date[] = [];

        const current = new Date(startOfMonth);
        while (current.getMonth() === now.getMonth() || weeksList.length < 5) {
            weeksList.push(new Date(current));
            current.setDate(current.getDate() + 7);
            if (weeksList.length > 8) break; // Safety
        }

        return weeksList;
    }, []);

    // Calculate utilization per employee per week
    const employeeWeekData = useMemo(() => {
        if (!data) return [];

        return data.byEmployee.map((emp) => {
            const weekUtilization = weeks.map((weekStart) => {
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekEnd.getDate() + 7);

                // Sum allocations that overlap with this week
                const overlapping = data.data.filter((a) => {
                    const aStart = new Date(a.startDate);
                    const aEnd = new Date(a.endDate);
                    return a.employeeId === emp.employeeId && aStart < weekEnd && aEnd > weekStart;
                });

                return overlapping.reduce((sum, a) => sum + a.allocationPct, 0);
            });

            return {
                ...emp,
                weekUtilization,
                maxUtilization: Math.max(...weekUtilization, 0),
                avgUtilization: weekUtilization.length > 0
                    ? Math.round(weekUtilization.reduce((s, v) => s + v, 0) / weekUtilization.length)
                    : 0,
            };
        });
    }, [data, weeks]);

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-20 bg-gray-200 rounded animate-pulse dark:bg-gray-700" />
                    ))}
                </div>
                <div className="h-64 bg-gray-200 rounded animate-pulse dark:bg-gray-700" />
            </div>
        );
    }

    if (!data || data.data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-8 dark:border-gray-700 dark:bg-gray-800">
                <Users className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Belum ada alokasi sumber daya</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Tambahkan alokasi karyawan untuk melihat heatmap</p>
            </div>
        );
    }

    // Count overloaded employees
    const overloaded = employeeWeekData.filter((e) => e.maxUtilization > 100).length;
    const totalCapacity = data.summary.uniqueEmployees * 100;

    return (
        <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard icon={Users} label="Karyawan" value={data.summary.uniqueEmployees} color="text-blue-500" />
                <StatCard icon={TrendingUp} label="Total Alokasi" value={`${data.summary.totalAllocationPct}%`} color="text-green-500" />
                <StatCard
                    icon={AlertTriangle}
                    label="Over-capacity"
                    value={overloaded}
                    color={overloaded > 0 ? 'text-red-500' : 'text-gray-400'}
                />
                <StatCard
                    icon={CheckCircle2}
                    label="Utilisasi"
                    value={totalCapacity > 0 ? `${Math.round((data.summary.totalAllocationPct / totalCapacity) * 100)}%` : '0%'}
                    color="text-purple-500"
                />
            </div>

            {/* Heatmap Table (Desktop) */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">
                                Karyawan
                            </th>
                            {weeks.map((week, i) => (
                                <th key={i} className="px-3 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400">
                                    {formatWeekLabel(week)}
                                </th>
                            ))}
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400">
                                Rata-rata
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {employeeWeekData.map((emp) => (
                            <tr key={emp.employeeId} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                            {emp.employeeId.slice(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-gray-900 dark:text-white">{emp.employeeId}</p>
                                            <p className="text-[10px] text-gray-400 dark:text-gray-500">{emp.roles.join(', ')}</p>
                                        </div>
                                    </div>
                                </td>
                                {emp.weekUtilization.map((util, i) => (
                                    <td key={i} className="px-3 py-3 text-center">
                                        <div className={`inline-flex h-8 w-12 items-center justify-center rounded text-xs font-medium ${getHeatmapColor(util)}`}>
                                            {util > 0 ? `${util}%` : '-'}
                                        </div>
                                    </td>
                                ))}
                                <td className="px-4 py-3 text-center">
                                    <span className={`text-xs font-semibold ${emp.avgUtilization > 100 ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                        {emp.avgUtilization}%
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
                {employeeWeekData.map((emp) => (
                    <div key={emp.employeeId} className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                    {emp.employeeId.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{emp.employeeId}</p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500">{emp.roles.join(', ')}</p>
                                </div>
                            </div>
                            <span className={`text-sm font-bold ${emp.maxUtilization > 100 ? 'text-red-600' : 'text-gray-700 dark:text-gray-300'}`}>
                                {emp.avgUtilization}%
                            </span>
                        </div>
                        <div className="flex gap-1">
                            {emp.weekUtilization.map((util, i) => (
                                <div key={i} className={`flex-1 h-6 rounded text-[9px] flex items-center justify-center ${getHeatmapColor(util)}`}>
                                    {util > 0 ? `${util}` : ''}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                <span className="font-medium">Legenda:</span>
                {HEATMAP_LEVELS.slice(0, -1).map((level, i) => (
                    <div key={i} className="flex items-center gap-1">
                        <div className={`h-3 w-3 rounded ${level.color}`} />
                        <span>{level.label}</span>
                    </div>
                ))}
                <div className="flex items-center gap-1">
                    <div className={`h-3 w-3 rounded ${HEATMAP_LEVELS[4].color}`} />
                    <span>{HEATMAP_LEVELS[4].label}</span>
                </div>
            </div>
        </div>
    );
}
