'use client';

/**
 * POS Table Management — React Hook
 *
 * Hook untuk mengelola meja POS: fetch, update status, reservasi, dan statistik.
 * Auto-refresh setiap 15 detik untuk data real-time.
 */

import { useState, useCallback, useEffect, useRef } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface PosTableData {
    id: string;
    number: number;
    name: string | null;
    capacity: number;
    status: string;
    zone: string | null;
    floor: string | null;
    posX: number | null;
    posY: number | null;
    width: number | null;
    height: number | null;
    isActive: boolean;
    currentSessionId: string | null;
    notes: string | null;
    activeReservationCount: number;
    activeReservations: Array<{
        id: string;
        customerName: string;
        partySize: number;
        reservationTime: string;
        status: string;
    }>;
    createdAt: string;
    updatedAt: string;
}

export interface PosTableDetail extends PosTableData {
    totalReservations: number;
    activeReservations: Array<{
        id: string;
        customerName: string;
        customerPhone: string | null;
        partySize: number;
        reservationTime: string;
        duration: number;
        status: string;
        notes: string | null;
    }>;
}

export interface PosReservationData {
    id: string;
    customerName: string;
    customerPhone: string | null;
    partySize: number;
    reservationTime: string;
    duration: number;
    status: string;
    notes: string | null;
    table: {
        id: string;
        number: number;
        name: string | null;
        zone: string | null;
    } | null;
    createdAt: string;
    updatedAt: string;
}

export interface PosTableStats {
    tables: {
        total: number;
        active: number;
        available: number;
        occupied: number;
        reserved: number;
        cleaning: number;
        disabled: number;
    };
    capacity: {
        total: number;
    };
    utilization: {
        rate: number;
        occupiedOrReserved: number;
    };
    reservations: {
        activeToday: number;
        totalToday: number;
    };
    zones: Array<{
        name: string;
        count: number;
    }>;
}

export interface TableFilters {
    status?: string;
    zone?: string;
    floor?: string;
    activeOnly?: boolean;
}

export interface UsePosTablesReturn {
    tables: PosTableData[];
    stats: PosTableStats | null;
    loading: boolean;
    error: string | null;
    filters: TableFilters;
    setFilters: (filters: TableFilters) => void;
    fetchTables: () => Promise<void>;
    fetchStats: () => Promise<void>;
    createTable: (data: {
        number: number;
        name?: string;
        capacity?: number;
        zone?: string;
        floor?: string;
        posX?: number;
        posY?: number;
        width?: number;
        height?: number;
        notes?: string;
    }) => Promise<PosTableData | null>;
    updateTableStatus: (id: string, status: string) => Promise<boolean>;
    deleteTable: (id: string) => Promise<boolean>;
    createReservation: (data: {
        tableId?: string;
        customerName: string;
        customerPhone?: string;
        partySize: number;
        reservationTime: string;
        duration?: number;
        notes?: string;
    }) => Promise<PosReservationData | null>;
}

// =============================================================================
// Constants
// =============================================================================

/** Auto-refresh interval (15 seconds) */
const AUTO_REFRESH_INTERVAL_MS = 15 * 1000;

// =============================================================================
// Hook
// =============================================================================

export function usePosTables(): UsePosTablesReturn {
    const [tables, setTables] = useState<PosTableData[]>([]);
    const [stats, setStats] = useState<PosTableStats | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [filters, setFilters] = useState<TableFilters>({});

    const isMountedRef = useRef<boolean>(true);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // ---------------------------------------------------------------------------
    // Fetch tables
    // ---------------------------------------------------------------------------

    const fetchTables = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (filters.status) params.set('status', filters.status);
            if (filters.zone) params.set('zone', filters.zone);
            if (filters.floor) params.set('floor', filters.floor);
            if (filters.activeOnly) params.set('activeOnly', 'true');

            const queryString = params.toString();
            const url = `/api/pos/tables${queryString ? `?${queryString}` : ''}`;

            const response = await fetch(url);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Gagal memuat data meja');
            }

            if (isMountedRef.current) {
                setTables(result.data || []);
                setError(null);
            }
        } catch (err) {
            if (isMountedRef.current) {
                setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
            }
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
        }
    }, [filters]);

    // ---------------------------------------------------------------------------
    // Fetch stats
    // ---------------------------------------------------------------------------

    const fetchStats = useCallback(async () => {
        try {
            const response = await fetch('/api/pos/tables/stats');
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Gagal memuat statistik meja');
            }

            if (isMountedRef.current) {
                setStats(result.data || null);
            }
        } catch {
            // Silent fail for stats — not critical
        }
    }, []);

    // ---------------------------------------------------------------------------
    // Create table
    // ---------------------------------------------------------------------------

    const createTable = useCallback(async (data: {
        number: number;
        name?: string;
        capacity?: number;
        zone?: string;
        floor?: string;
        posX?: number;
        posY?: number;
        width?: number;
        height?: number;
        notes?: string;
    }): Promise<PosTableData | null> => {
        try {
            const response = await fetch('/api/pos/tables', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Gagal membuat meja');
            }

            // Refresh list
            await fetchTables();
            await fetchStats();

            return result.data;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
            return null;
        }
    }, [fetchTables, fetchStats]);

    // ---------------------------------------------------------------------------
    // Update table status
    // ---------------------------------------------------------------------------

    const updateTableStatus = useCallback(async (id: string, status: string): Promise<boolean> => {
        try {
            const response = await fetch(`/api/pos/tables/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Gagal mengubah status meja');
            }

            // Refresh list
            await fetchTables();
            await fetchStats();

            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
            return false;
        }
    }, [fetchTables, fetchStats]);

    // ---------------------------------------------------------------------------
    // Delete table
    // ---------------------------------------------------------------------------

    const deleteTable = useCallback(async (id: string): Promise<boolean> => {
        try {
            const response = await fetch(`/api/pos/tables/${id}`, {
                method: 'DELETE',
            });
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Gagal menghapus meja');
            }

            // Refresh list
            await fetchTables();
            await fetchStats();

            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
            return false;
        }
    }, [fetchTables, fetchStats]);

    // ---------------------------------------------------------------------------
    // Create reservation
    // ---------------------------------------------------------------------------

    const createReservation = useCallback(async (data: {
        tableId?: string;
        customerName: string;
        customerPhone?: string;
        partySize: number;
        reservationTime: string;
        duration?: number;
        notes?: string;
    }): Promise<PosReservationData | null> => {
        try {
            const response = await fetch('/api/pos/tables/reservations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Gagal membuat reservasi');
            }

            // Refresh list
            await fetchTables();
            await fetchStats();

            return result.data;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
            return null;
        }
    }, [fetchTables, fetchStats]);

    // ---------------------------------------------------------------------------
    // Effects
    // ---------------------------------------------------------------------------

    // Initial fetch
    useEffect(() => {
        isMountedRef.current = true;
        setLoading(true);
        Promise.all([fetchTables(), fetchStats()]);
        return () => { isMountedRef.current = false; };
    }, [fetchTables, fetchStats]);

    // Auto-refresh polling
    useEffect(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
        intervalRef.current = setInterval(() => {
            if (isMountedRef.current) {
                fetchTables();
                fetchStats();
            }
        }, AUTO_REFRESH_INTERVAL_MS);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [fetchTables, fetchStats]);

    return {
        tables,
        stats,
        loading,
        error,
        filters,
        setFilters,
        fetchTables,
        fetchStats,
        createTable,
        updateTableStatus,
        deleteTable,
        createReservation,
    };
}
