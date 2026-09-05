'use client';

/**
 * Kitchen Display System — Orders React Hook
 *
 * Hook untuk mengelola kitchen orders dengan auto-refresh polling.
 * Polling setiap 10 detik + refresh on window focus.
 *
 * Ref: plans/pos-kitchen-display-architecture.md Section 7
 */

import { useState, useCallback, useEffect, useRef } from 'react';

// =============================================================================
// Types
// =============================================================================

export type KitchenOrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED';

export type KitchenOrderPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface KitchenOrderItem {
    id: string;
    productName: string;
    quantity: number;
    notes: string | null;
    status: string;
}

export interface KitchenOrderStation {
    id: string;
    name: string;
}

export interface KitchenOrder {
    id: string;
    transactionId: string | null;
    orderNumber: number;
    orderType?: string;
    tableNumber?: string | null;
    status: KitchenOrderStatus;
    priority: KitchenOrderPriority;
    notes: string | null;
    estimatedMinutes: number | null;
    startedAt: string | null;
    completedAt: string | null;
    servedAt: string | null;
    station: KitchenOrderStation | null;
    items: KitchenOrderItem[];
    createdAt: string;
}

export interface KitchenStation {
    id: string;
    name: string;
    description: string | null;
    isActive: boolean;
    sortOrder: number;
    activeOrderCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface KitchenStats {
    today: {
        total: number;
        pending: number;
        preparing: number;
        ready: number;
        served: number;
        cancelled: number;
    };
    avgEstimatedMinutes: number | null;
    avgActualMinutes: number | null;
    stations: {
        id: string;
        name: string;
        activeOrderCount: number;
    }[];
}

export interface KitchenFilter {
    status: KitchenOrderStatus | 'ALL';
    stationId: string | 'ALL';
}

export interface UseKitchenOrdersReturn {
    orders: KitchenOrder[];
    stations: KitchenStation[];
    stats: KitchenStats | null;
    loading: boolean;
    error: string | null;
    filter: KitchenFilter;
    setFilter: (filter: Partial<KitchenFilter>) => void;
    updateStatus: (orderId: string, newStatus: KitchenOrderStatus) => Promise<boolean>;
    refresh: () => Promise<void>;
    lastUpdated: Date | null;
}

// =============================================================================
// Constants
// =============================================================================

/** Polling interval in milliseconds (10 seconds) */
const POLL_INTERVAL_MS = 10_000;

/** Stats refresh interval (60 seconds) */
const STATS_INTERVAL_MS = 60_000;

// =============================================================================
// Hook
// =============================================================================

/**
 * Kitchen orders hook with auto-refresh polling.
 *
 * Behavior:
 * - Fetches orders based on current filter (status, stationId)
 * - Auto-refreshes every 10 seconds
 * - Refreshes on window focus
 * - Fetches stations on mount
 * - Fetches stats every 60 seconds
 *
 * @example
 * ```tsx
 * const { orders, stats, filter, setFilter, updateStatus, refresh } = useKitchenOrders();
 * ```
 */
export function useKitchenOrders(): UseKitchenOrdersReturn {
    // ---------------------------------------------------------------------------
    // State
    // ---------------------------------------------------------------------------
    const [orders, setOrders] = useState<KitchenOrder[]>([]);
    const [stations, setStations] = useState<KitchenStation[]>([]);
    const [stats, setStats] = useState<KitchenStats | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilterState] = useState<KitchenFilter>({
        status: 'ALL',
        stationId: 'ALL',
    });
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    // Refs for cleanup
    const isMountedRef = useRef<boolean>(true);
    const fetchInProgressRef = useRef<boolean>(false);
    const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const statsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const filterRef = useRef<KitchenFilter>(filter);

    // Keep filterRef in sync
    useEffect(() => {
        filterRef.current = filter;
    }, [filter]);

    // ---------------------------------------------------------------------------
    // Fetch Orders
    // ---------------------------------------------------------------------------
    const fetchOrders = useCallback(async (currentFilter?: KitchenFilter): Promise<void> => {
        if (fetchInProgressRef.current) return;
        fetchInProgressRef.current = true;

        const activeFilter = currentFilter || filterRef.current;

        try {
            const params = new URLSearchParams();
            if (activeFilter.status !== 'ALL') {
                params.set('status', activeFilter.status);
            }
            if (activeFilter.stationId !== 'ALL') {
                params.set('stationId', activeFilter.stationId);
            }
            params.set('limit', '100');

            const response = await fetch(`/api/pos/kitchen/orders?${params.toString()}`);
            const data = await response.json();

            if (!isMountedRef.current) return;

            if (data.success) {
                setOrders(data.data);
                setLastUpdated(new Date());
                setError(null);
            } else {
                setError(data.error || 'Gagal memuat data pesanan dapur');
            }
        } catch {
            if (isMountedRef.current) {
                setError('Gagal memuat data pesanan dapur. Periksa koneksi jaringan.');
            }
        } finally {
            fetchInProgressRef.current = false;
            if (isMountedRef.current) {
                setLoading(false);
            }
        }
    }, []);

    // ---------------------------------------------------------------------------
    // Fetch Stations
    // ---------------------------------------------------------------------------
    const fetchStations = useCallback(async (): Promise<void> => {
        try {
            const response = await fetch('/api/pos/kitchen/stations?activeOnly=true');
            const data = await response.json();

            if (!isMountedRef.current) return;

            if (data.success) {
                setStations(data.data);
            }
        } catch {
            // Silent fail — stations are non-critical
        }
    }, []);

    // ---------------------------------------------------------------------------
    // Fetch Stats
    // ---------------------------------------------------------------------------
    const fetchStats = useCallback(async (): Promise<void> => {
        try {
            const response = await fetch('/api/pos/kitchen/stats');
            const data = await response.json();

            if (!isMountedRef.current) return;

            if (data.success) {
                setStats(data.data);
            }
        } catch {
            // Silent fail — stats are non-critical
        }
    }, []);

    // ---------------------------------------------------------------------------
    // Refresh (manual)
    // ---------------------------------------------------------------------------
    const refresh = useCallback(async (): Promise<void> => {
        setLoading(true);
        await Promise.all([
            fetchOrders(filterRef.current),
            fetchStations(),
            fetchStats(),
        ]);
    }, [fetchOrders, fetchStations, fetchStats]);

    // ---------------------------------------------------------------------------
    // Update Status
    // ---------------------------------------------------------------------------
    const updateStatus = useCallback(async (
        orderId: string,
        newStatus: KitchenOrderStatus
    ): Promise<boolean> => {
        try {
            const response = await fetch(`/api/pos/kitchen/orders/${orderId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });

            const data = await response.json();

            if (data.success) {
                // Update local state optimistically
                setOrders((prev) =>
                    prev.map((order) =>
                        order.id === orderId
                            ? {
                                ...order,
                                status: newStatus,
                                startedAt: data.data.startedAt || order.startedAt,
                                completedAt: data.data.completedAt || order.completedAt,
                                servedAt: data.data.servedAt || order.servedAt,
                            }
                            : order
                    )
                );
                return true;
            }
            return false;
        } catch {
            return false;
        }
    }, []);

    // ---------------------------------------------------------------------------
    // Set Filter
    // ---------------------------------------------------------------------------
    const setFilter = useCallback((partial: Partial<KitchenFilter>) => {
        setFilterState((prev) => {
            const next = { ...prev, ...partial };
            filterRef.current = next;
            // Reset loading and fetch immediately with new filter
            setLoading(true);
            fetchOrders(next);
            return next;
        });
    }, [fetchOrders]);

    // ---------------------------------------------------------------------------
    // Initial fetch + polling setup
    // ---------------------------------------------------------------------------
    useEffect(() => {
        isMountedRef.current = true;

        // Initial fetch
        fetchOrders();
        fetchStations();
        fetchStats();

        // Polling for orders (every 10s)
        pollTimerRef.current = setInterval(() => {
            fetchOrders(filterRef.current);
        }, POLL_INTERVAL_MS);

        // Polling for stats (every 60s)
        statsTimerRef.current = setInterval(() => {
            fetchStats();
        }, STATS_INTERVAL_MS);

        // Refresh on window focus
        const handleFocus = () => {
            fetchOrders(filterRef.current);
            fetchStats();
        };
        window.addEventListener('focus', handleFocus);

        return () => {
            isMountedRef.current = false;
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            if (statsTimerRef.current) clearInterval(statsTimerRef.current);
            window.removeEventListener('focus', handleFocus);
        };
    }, [fetchOrders, fetchStations, fetchStats]);

    // ---------------------------------------------------------------------------
    // Return
    // ---------------------------------------------------------------------------
    return {
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
    };
}
