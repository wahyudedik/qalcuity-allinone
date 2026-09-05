'use client';

/**
 * POS Offline Mode — React Hook
 *
 * Hook untuk mengelola status online/offline, sync engine, dan pending transactions.
 * Mengintegrasikan SyncEngine dengan React state untuk UI consumption.
 *
 * Ref: plans/pos-offline-mode-architecture.md Section 3.2
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { SyncStatus } from '@/lib/pos-offline/sync';
import { SyncEngine } from '@/lib/pos-offline/sync';
import { getPendingTransactions, getCachedProducts, searchCachedProducts } from '@/lib/pos-offline/db';
import type { Product, PendingTransaction } from '@/lib/pos-offline/types';

// =============================================================================
// Types
// =============================================================================

/** Return type for the usePosOffline hook */
export interface UsePosOfflineReturn {
    /** Whether the browser is currently online */
    isOnline: boolean;
    /** Current sync status from the engine */
    syncStatus: SyncStatus;
    /** Number of pending transactions waiting for sync */
    pendingCount: number;
    /** Whether initial status has been loaded */
    initialized: boolean;
    /** Trigger an immediate sync of pending operations */
    syncNow: () => Promise<void>;
    /** Fetch all cached products from IndexedDB */
    getOfflineProducts: () => Promise<Product[]>;
    /** Search cached products by name or SKU */
    searchOfflineProducts: (query: string) => Promise<Product[]>;
    /** Create a transaction (auto-queues if offline) */
    createOfflineTransaction: (tx: PendingTransaction) => Promise<void>;
    /** Refresh the sync status from the engine */
    refreshSyncStatus: () => Promise<void>;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Main hook for POS offline mode.
 *
 * Responsibilities:
 * - Track browser online/offline status via `navigator.onLine`
 * - Start/stop the SyncEngine singleton on mount/unmount
 * - Subscribe to SyncEngine status changes and update React state
 * - Auto-sync when the browser comes back online
 * - Provide actions for manual sync, product fetching, and transaction creation
 *
 * @example
 * ```tsx
 * const { isOnline, syncStatus, pendingCount, syncNow } = usePosOffline();
 *
 * if (!isOnline) {
 *   return <div>Offline mode active</div>;
 * }
 * ```
 */
export function usePosOffline(): UsePosOfflineReturn {
    // ---------------------------------------------------------------------------
    // State
    // ---------------------------------------------------------------------------

    const [isOnline, setIsOnline] = useState<boolean>(() => {
        if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
            return navigator.onLine;
        }
        return true;
    });

    const [syncStatus, setSyncStatus] = useState<SyncStatus>({
        isOnline: true,
        mode: 'online',
        pendingCount: 0,
        syncingCount: 0,
        failedCount: 0,
        lastSyncAt: null,
        currentSyncItem: null,
    });

    const [pendingCount, setPendingCount] = useState<number>(0);
    const [initialized, setInitialized] = useState<boolean>(false);

    // Track engine start state to avoid double-start in StrictMode
    const engineStartedRef = useRef<boolean>(false);

    // ---------------------------------------------------------------------------
    // Online/Offline Detection
    // ---------------------------------------------------------------------------

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleOnline = () => {
            console.log('[POS-Offline Hook] Network restored');
            setIsOnline(true);
        };

        const handleOffline = () => {
            console.log('[POS-Offline Hook] Network lost');
            setIsOnline(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Sync initial state
        setIsOnline(navigator.onLine);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // ---------------------------------------------------------------------------
    // SyncEngine Lifecycle
    // ---------------------------------------------------------------------------

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const engine = SyncEngine.getInstance();

        // Prevent double-start in React StrictMode (dev only)
        if (engineStartedRef.current) return;
        engineStartedRef.current = true;

        // Start the engine (registers online/offline listeners, starts polling)
        void engine.start();

        // Subscribe to status changes
        const unsubscribe = engine.onStatusChange((status: SyncStatus) => {
            setSyncStatus(status);
            setIsOnline(status.isOnline);
            setPendingCount(status.pendingCount + status.syncingCount);
        });

        // Load initial status
        void engine.getSyncStatus().then((status) => {
            setSyncStatus(status);
            setIsOnline(status.isOnline);
            setPendingCount(status.pendingCount + status.syncingCount);
            setInitialized(true);
        });

        return () => {
            unsubscribe();
            void engine.stop();
            engineStartedRef.current = false;
        };
    }, []);

    // ---------------------------------------------------------------------------
    // Auto-sync when coming back online
    // ---------------------------------------------------------------------------

    useEffect(() => {
        if (!initialized || !isOnline) return;

        // When coming back online, trigger a sync if there are pending items
        const engine = SyncEngine.getInstance();
        void engine.getQueueSize().then((size) => {
            if (size > 0) {
                console.log(`[POS-Offline Hook] Back online with ${size} pending items, triggering sync`);
                void engine.processQueue();
            }
        });
    }, [isOnline, initialized]);

    // ---------------------------------------------------------------------------
    // Actions
    // ---------------------------------------------------------------------------

    /**
     * Trigger an immediate sync of all pending operations.
     */
    const handleSyncNow = useCallback(async () => {
        try {
            const engine = SyncEngine.getInstance();
            await engine.processQueue();

            // Refresh status after sync
            const status = await engine.getSyncStatus();
            setSyncStatus(status);
            setIsOnline(status.isOnline);
            setPendingCount(status.pendingCount + status.syncingCount);
        } catch (error) {
            console.error('[POS-Offline Hook] Sync failed:', error);
        }
    }, []);

    /**
     * Get all cached products from IndexedDB.
     */
    const handleGetOfflineProducts = useCallback(async (): Promise<Product[]> => {
        try {
            return await getCachedProducts();
        } catch (error) {
            console.error('[POS-Offline Hook] Failed to get offline products:', error);
            return [];
        }
    }, []);

    /**
     * Search cached products by name or SKU (client-side filter).
     */
    const handleSearchOfflineProducts = useCallback(async (query: string): Promise<Product[]> => {
        try {
            return await searchCachedProducts(query);
        } catch (error) {
            console.error('[POS-Offline Hook] Failed to search offline products:', error);
            return [];
        }
    }, []);

    /**
     * Create a transaction and queue it for sync if offline.
     */
    const handleCreateOfflineTransaction = useCallback(async (tx: PendingTransaction): Promise<void> => {
        try {
            const { createTransaction } = await import('@/lib/pos-offline/api-client');
            await createTransaction(tx);

            // Refresh pending count
            const engine = SyncEngine.getInstance();
            const status = await engine.getSyncStatus();
            setSyncStatus(status);
            setPendingCount(status.pendingCount + status.syncingCount);
        } catch (error) {
            console.error('[POS-Offline Hook] Failed to create offline transaction:', error);
            throw error;
        }
    }, []);

    /**
     * Refresh sync status from the engine.
     */
    const handleRefreshSyncStatus = useCallback(async () => {
        try {
            const engine = SyncEngine.getInstance();
            const status = await engine.getSyncStatus();
            setSyncStatus(status);
            setIsOnline(status.isOnline);
            setPendingCount(status.pendingCount + status.syncingCount);
        } catch (error) {
            console.error('[POS-Offline Hook] Failed to refresh sync status:', error);
        }
    }, []);

    // ---------------------------------------------------------------------------
    // Return
    // ---------------------------------------------------------------------------

    return {
        isOnline,
        syncStatus,
        pendingCount,
        initialized,
        syncNow: handleSyncNow,
        getOfflineProducts: handleGetOfflineProducts,
        searchOfflineProducts: handleSearchOfflineProducts,
        createOfflineTransaction: handleCreateOfflineTransaction,
        refreshSyncStatus: handleRefreshSyncStatus,
    };
}
