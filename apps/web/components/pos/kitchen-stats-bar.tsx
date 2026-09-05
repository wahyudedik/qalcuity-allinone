'use client';

/**
 * Kitchen Display System — Stats Bar Component
 *
 * Stats bar di bagian atas halaman kitchen display.
 * Menampilkan: total orders, avg prep time, orders by status.
 *
 * Ref: plans/pos-kitchen-display-architecture.md Section 5.1.2
 */

import {
    ClipboardList,
    Clock,
    TrendingUp,
} from 'lucide-react';
import type { KitchenStats } from '@/hooks/use-kitchen-orders';

// =============================================================================
// Types
// =============================================================================

interface KitchenStatsBarProps {
    stats: KitchenStats | null;
}

// =============================================================================
// Helpers
// =============================================================================

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
    pending: { label: 'Baru', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
    preparing: { label: 'Disiapkan', color: 'text-orange-700', bgColor: 'bg-orange-100' },
    ready: { label: 'Siap', color: 'text-green-700', bgColor: 'bg-green-100' },
    served: { label: 'Selesai', color: 'text-gray-600', bgColor: 'bg-gray-100' },
    cancelled: { label: 'Batal', color: 'text-red-600', bgColor: 'bg-red-100' },
};

// =============================================================================
// Component
// =============================================================================

/**
 * Stats bar showing kitchen performance metrics.
 * Displays total orders, average prep time, and status breakdown.
 */
export function KitchenStatsBar({ stats }: KitchenStatsBarProps) {
    if (!stats) {
        return (
            <div className="flex items-center gap-4">
                <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
                <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
                <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
            </div>
        );
    }

    const { today } = stats;

    return (
        <div className="flex flex-wrap items-center gap-3">
            {/* Total orders today */}
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-sm text-blue-700">
                <ClipboardList className="h-4 w-4" />
                <span className="font-semibold">{today.total}</span>
                <span className="hidden sm:inline">pesanan hari ini</span>
            </div>

            {/* Average prep time */}
            {stats.avgActualMinutes !== null && (
                <div className="inline-flex items-center gap-1.5 rounded-lg bg-purple-50 px-3 py-1.5 text-sm text-purple-700">
                    <Clock className="h-4 w-4" />
                    <span className="font-semibold">{stats.avgActualMinutes}m</span>
                    <span className="hidden sm:inline">rata-rata</span>
                </div>
            )}

            {/* Status breakdown */}
            {(['pending', 'preparing', 'ready', 'served', 'cancelled'] as const).map((status) => {
                const count = today[status];
                const config = STATUS_CONFIG[status];
                if (count === 0) return null;
                return (
                    <div
                        key={status}
                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium ${config.bgColor} ${config.color}`}
                    >
                        <span>{count}</span>
                        <span className="hidden sm:inline">{config.label}</span>
                    </div>
                );
            })}

            {/* On-time rate indicator */}
            {today.total > 0 && (
                <div className="inline-flex items-center gap-1.5 text-sm text-gray-500">
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span>
                        {today.total - today.cancelled > 0
                            ? `${Math.round(((today.served) / Math.max(today.total - today.cancelled, 1)) * 100)}% selesai`
                            : '—'}
                    </span>
                </div>
            )}
        </div>
    );
}
