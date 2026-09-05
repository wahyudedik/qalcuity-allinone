'use client';

/**
 * Kitchen Display System — Main Page
 *
 * Halaman utama KDS yang ditampilkan di layar dapur (monitor/TV).
 * Grid card-based layout dengan auto-refresh polling.
 *
 * Ref: plans/pos-kitchen-display-architecture.md Section 5.1
 */

import { useState, useEffect, useMemo } from 'react';
import {
    ChefHat,
    RefreshCw,
    AlertCircle,
    Check,
    LayoutGrid,
    Clock,
    Flame,
    CheckCircle,
} from 'lucide-react';
import { useKitchenOrders, type KitchenOrderStatus, type KitchenFilter } from '@/hooks/use-kitchen-orders';
import { KitchenOrderCard } from '@/components/pos/kitchen-order-card';
import { KitchenStatsBar } from '@/components/pos/kitchen-stats-bar';
import { KitchenStationFilter } from '@/components/pos/kitchen-station-filter';
import { EmptyState } from '@/components/ui/empty-state';

// =============================================================================
// Constants
// =============================================================================

const STATUS_TABS: { key: KitchenOrderStatus | 'ALL'; label: string; icon: typeof LayoutGrid }[] = [
    { key: 'ALL', label: 'Semua', icon: LayoutGrid },
    { key: 'PENDING', label: 'Baru', icon: Clock },
    { key: 'PREPARING', label: 'Disiapkan', icon: Flame },
    { key: 'READY', label: 'Siap', icon: CheckCircle },
];

// =============================================================================
// Component
// =============================================================================

export default function KitchenDisplayPage() {
    const {
        orders,
        stations,
        stats,
        loading,
        error,
        filter,
        setFilter,
        updateStatus,
        refresh,
        lastUpdated,
    } = useKitchenOrders();

    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Auto-dismiss toast
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    // Handle status change with toast feedback
    const handleStatusChange = async (orderId: string, newStatus: KitchenOrderStatus): Promise<boolean> => {
        const success = await updateStatus(orderId, newStatus);
        if (success) {
            const statusLabels: Record<string, string> = {
                PREPARING: 'sedang disiapkan',
                READY: 'siap diambil',
                SERVED: 'sudah diambil',
                CANCELLED: 'dibatalkan',
            };
            setToast({
                message: `Pesanan berhasil ${statusLabels[newStatus] || newStatus}`,
                type: 'success',
            });
        } else {
            setToast({
                message: 'Gagal mengubah status pesanan',
                type: 'error',
            });
        }
        return success;
    };

    // Get count for each status tab
    const statusCounts = useMemo(() => {
        const counts: Record<string, number> = {
            ALL: 0,
            PENDING: 0,
            PREPARING: 0,
            READY: 0,
        };
        orders.forEach((order) => {
            if (order.status === 'PENDING' || order.status === 'PREPARING' || order.status === 'READY') {
                counts[order.status]++;
                counts.ALL++;
            }
        });
        return counts;
    }, [orders]);

    // Last updated text
    const lastUpdatedText = useMemo(() => {
        if (!lastUpdated) return '';
        const diff = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
        if (diff < 5) return 'baru saja';
        if (diff < 60) return `${diff}d lalu`;
        return `${Math.floor(diff / 60)}m lalu`;
    }, [lastUpdated]);

    return (
        <div className="space-y-4">
            {/* Toast notification */}
            {toast && (
                <div
                    className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${
                        toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
                    }`}
                >
                    {toast.type === 'success' ? (
                        <Check className="h-4 w-4" />
                    ) : (
                        <AlertCircle className="h-4 w-4" />
                    )}
                    {toast.message}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
                        <ChefHat className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Kitchen Display
                        </h1>
                        <p className="text-sm text-gray-500">
                            Tampilan pesanan dapur secara real-time
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Auto-refresh indicator */}
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                        <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                        <span>Auto-refresh</span>
                        {lastUpdatedText && (
                            <span className="text-gray-300">• {lastUpdatedText}</span>
                        )}
                    </div>

                    {/* Manual refresh */}
                    <button
                        onClick={() => void refresh()}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Stats bar */}
            <KitchenStatsBar stats={stats} />

            {/* Filter bar: Status tabs + Station filter */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {/* Status tabs */}
                <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
                    {STATUS_TABS.map((tab) => {
                        const isActive = filter.status === tab.key;
                        const TabIcon = tab.icon;
                        const count = statusCounts[tab.key] ?? 0;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setFilter({ status: tab.key })}
                                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                                    isActive
                                        ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                }`}
                            >
                                <TabIcon className="h-4 w-4" />
                                <span>{tab.label}</span>
                                {count > 0 && (
                                    <span
                                        className={`inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-bold ${
                                            isActive
                                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                                                : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                        }`}
                                    >
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Station filter */}
                <KitchenStationFilter
                    stations={stations}
                    selectedStationId={filter.stationId}
                    onChange={(stationId) => setFilter({ stationId })}
                />
            </div>

            {/* Error state */}
            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        {error}
                    </div>
                </div>
            )}

            {/* Loading state */}
            {loading && orders.length === 0 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div
                            key={i}
                            className="rounded-xl border-2 border-gray-200 bg-white p-4 animate-pulse"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="space-y-2">
                                    <div className="h-6 w-24 bg-gray-200 rounded" />
                                    <div className="h-3 w-32 bg-gray-200 rounded" />
                                </div>
                                <div className="h-6 w-20 bg-gray-200 rounded-full" />
                            </div>
                            <div className="space-y-2 mb-3">
                                <div className="h-4 w-full bg-gray-200 rounded" />
                                <div className="h-4 w-3/4 bg-gray-200 rounded" />
                            </div>
                            <div className="h-8 w-20 bg-gray-200 rounded mb-3" />
                            <div className="h-10 w-full bg-gray-200 rounded" />
                        </div>
                    ))}
                </div>
            )}

            {/* Empty state */}
            {!loading && orders.length === 0 && !error && (
                <EmptyState
                    icon={ChefHat}
                    title="Tidak ada pesanan"
                    description={
                        filter.status === 'ALL'
                            ? 'Belum ada pesanan dapur saat ini. Pesanan baru akan muncul secara otomatis.'
                            : `Tidak ada pesanan dengan status ${
                                STATUS_TABS.find((t) => t.key === filter.status)?.label || filter.status
                              }`
                    }
                />
            )}

            {/* Orders grid */}
            {orders.length > 0 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {orders.map((order) => (
                        <KitchenOrderCard
                            key={order.id}
                            order={order}
                            onStatusChange={handleStatusChange}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
