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
    LayoutList,
    Clock,
    Flame,
    CheckCircle,
    MapPin,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { useKitchenOrders, type KitchenOrderStatus, type KitchenFilter } from '@/hooks/use-kitchen-orders';
import { KitchenOrderCard } from '@/components/pos/kitchen-order-card';
import { KitchenStatsBar } from '@/components/pos/kitchen-stats-bar';
import { KitchenStationFilter } from '@/components/pos/kitchen-station-filter';
import { EmptyState } from '@/components/ui/empty-state';

// =============================================================================
// Component
// =============================================================================

export default function KitchenDisplayPage() {
    const { t } = useTranslation();
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

    // STATUS_TABS must be inside component to use t()
    const STATUS_TABS: { key: KitchenOrderStatus | 'ALL'; label: string; icon: typeof LayoutGrid }[] = [
        { key: 'ALL', label: t('pos.kitchen.all') || 'Semua', icon: LayoutGrid },
        { key: 'PENDING', label: t('pos.kitchen.new') || 'Baru', icon: Clock },
        { key: 'PREPARING', label: t('pos.kitchen.preparing') || 'Disiapkan', icon: Flame },
        { key: 'READY', label: t('pos.kitchen.ready') || 'Siap', icon: CheckCircle },
    ];

    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'by-table'>('grid');

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
                PREPARING: t('pos.kitchen.statusPreparing') || 'sedang disiapkan',
                READY: t('pos.kitchen.statusReady') || 'siap diambil',
                SERVED: t('pos.kitchen.statusServed') || 'sudah diambil',
                CANCELLED: t('pos.kitchen.statusCancelled') || 'dibatalkan',
            };
            setToast({
                message: `${t('pos.kitchen.successStatus')?.replace('{status}', statusLabels[newStatus] || newStatus) || `Pesanan berhasil ${statusLabels[newStatus] || newStatus}`}`,
                type: 'success',
            });
        } else {
            setToast({
                message: t('pos.kitchen.errorStatus') || 'Gagal mengubah status pesanan',
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
        if (diff < 5) return t('pos.kitchen.justNow') || 'baru saja';
        if (diff < 60) return `${diff}${t('pos.kitchen.secondsAgo') || 'd lalu'}`;
        return `${Math.floor(diff / 60)}${t('pos.kitchen.minutesAgo') || 'm lalu'}`;
    }, [lastUpdated, t]);

    // Unique table numbers for filter dropdown
    const uniqueTables = useMemo(() => {
        const tableMap = new Map<string, string>(); // tableNumber → tableName
        orders.forEach((order) => {
            if (order.tableNumber && !tableMap.has(order.tableNumber)) {
                tableMap.set(order.tableNumber, order.tableName || '');
            }
        });
        return Array.from(tableMap.entries()).sort((a, b) => Number(a[0]) - Number(b[0]));
    }, [orders]);

    // Orders grouped by table number (for "by-table" view)
    const ordersByTable = useMemo(() => {
        const groups = new Map<string, { tableName: string | null; zone: string | null; orders: typeof orders }>();
        orders.forEach((order) => {
            const key = order.tableNumber || 'NO_TABLE';
            if (!groups.has(key)) {
                groups.set(key, { tableName: order.tableName ?? null, zone: order.tableZone ?? null, orders: [] });
            }
            groups.get(key)!.orders.push(order);
        });
        return Array.from(groups.entries()).sort((a, b) => {
            if (a[0] === 'NO_TABLE') return 1;
            if (b[0] === 'NO_TABLE') return -1;
            return Number(a[0]) - Number(b[0]);
        });
    }, [orders]);

    return (
        <div className="space-y-4">
            {/* Toast notification */}
            {toast && (
                <div
                    className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
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
                            {t('pos.kitchen.title') || 'Kitchen Display'}
                        </h1>
                        <p className="text-sm text-gray-500">
                            {t('pos.kitchen.description') || 'Tampilan pesanan dapur secara real-time'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Auto-refresh indicator */}
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                        <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                        <span>{t('pos.kitchen.autoRefresh') || 'Auto-refresh'}</span>
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
                        {t('pos.kitchen.refresh') || 'Refresh'}
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
                                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${isActive
                                    ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                    }`}
                            >
                                <TabIcon className="h-4 w-4" />
                                <span>{tab.label}</span>
                                {count > 0 && (
                                    <span
                                        className={`inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-bold ${isActive
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

                <div className="flex items-center gap-2">
                    {/* Station filter */}
                    <KitchenStationFilter
                        stations={stations}
                        selectedStationId={filter.stationId}
                        onChange={(stationId) => setFilter({ stationId })}
                    />

                    {/* Table filter */}
                    {uniqueTables.length > 0 && (
                        <div className="relative">
                            <MapPin className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                            <select
                                value={filter.tableNumber}
                                onChange={(e) => setFilter({ tableNumber: e.target.value })}
                                className="appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-8 pr-8 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                            >
                                <option value="ALL">{t('pos.kitchen.allTables')}</option>
                                {uniqueTables.map(([num, name]) => (
                                    <option key={num} value={num}>
                                        {t('pos.kitchen.tablePrefix')} {num}{name ? ` (${name})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* View mode toggle */}
                    <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${viewMode === 'grid'
                                    ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                }`}
                            title={t('pos.kitchen.gridView')}
                        >
                            <LayoutGrid className="h-3.5 w-3.5" />
                        </button>
                        <button
                            onClick={() => setViewMode('by-table')}
                            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${viewMode === 'by-table'
                                    ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                }`}
                            title={t('pos.kitchen.byTable')}
                        >
                            <LayoutList className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>
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
                    title={t('pos.kitchen.noOrders') || 'Tidak ada pesanan'}
                    description={
                        filter.status === 'ALL'
                            ? (t('pos.kitchen.noOrdersDesc') || 'Belum ada pesanan dapur saat ini. Pesanan baru akan muncul secara otomatis.')
                            : (t('pos.kitchen.noOrdersWithStatus')?.replace('{status}', STATUS_TABS.find((tab) => tab.key === filter.status)?.label || filter.status) || `Tidak ada pesanan dengan status ${STATUS_TABS.find((tab) => tab.key === filter.status)?.label || filter.status}`)
                    }
                />
            )}

            {/* Orders display — Grid or By-Table view */}
            {orders.length > 0 && viewMode === 'grid' && (
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

            {/* By-Table view: orders grouped by table number */}
            {orders.length > 0 && viewMode === 'by-table' && (
                <div className="space-y-6">
                    {ordersByTable.map(([tableNum, group]) => (
                        <div key={tableNum} className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 overflow-hidden">
                            {/* Table section header */}
                            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                                    <MapPin className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                                        {tableNum === 'NO_TABLE'
                                            ? (t('pos.kitchen.noTable') || 'Tanpa Meja')
                                            : `${t('pos.kitchen.tablePrefix')} ${tableNum}${group.tableName ? ` — ${group.tableName}` : ''}`
                                        }
                                    </h3>
                                    {group.zone && (
                                        <span className="text-xs text-gray-500">{group.zone}</span>
                                    )}
                                </div>
                                <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
                                    {group.orders.length} {t('pos.kitchen.ordersCount')}
                                </span>
                            </div>
                            {/* Orders in this table */}
                            <div className="p-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {group.orders.map((order) => (
                                    <KitchenOrderCard
                                        key={order.id}
                                        order={order}
                                        onStatusChange={handleStatusChange}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
