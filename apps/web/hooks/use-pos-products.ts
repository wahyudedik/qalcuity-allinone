'use client';

/**
 * POS Offline Mode — Products React Hook
 *
 * Hook untuk mengelola produk POS yang bekerja online dan offline.
 * Saat online: fetch dari server → cache ke IndexedDB → return.
 * Saat offline: langsung dari IndexedDB cache.
 *
 * Ref: plans/pos-offline-mode-architecture.md Section 3.2
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { Product } from '@/lib/pos-offline/types';

// =============================================================================
// Types
// =============================================================================

/** Return type for the usePosProducts hook */
export interface UsePosProductsReturn {
    /** List of products (from server or cache) */
    products: Product[];
    /** Whether products are currently being loaded */
    loading: boolean;
    /** Error message if loading failed */
    error: string | null;
    /** Whether the current products were loaded from IndexedDB cache */
    fromCache: boolean;
    /** Timestamp of the last successful cache update */
    lastCachedAt: number | null;
    /** Fetch products (online → cache → return, offline → cache → return) */
    fetchProducts: () => Promise<void>;
    /** Search products by name or SKU (works offline via IndexedDB) */
    searchProducts: (query: string) => Promise<Product[]>;
    /** Force refresh the product cache from server */
    refreshCache: () => Promise<void>;
}

// =============================================================================
// Constants
// =============================================================================

/** How often to auto-refresh products (5 minutes) */
const AUTO_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

// =============================================================================
// Hook
// =============================================================================

/**
 * Product hook that works online + offline.
 *
 * Behavior:
 * - On mount: attempts to fetch from server, falls back to cache if offline
 * - Auto-refreshes every 5 minutes when online
 * - Search is always available (uses IndexedDB cache)
 * - Shows `fromCache` flag so UI can indicate stale data
 *
 * @param terminalId - Optional terminal ID for session-scoped product loading
 * @example
 * ```tsx
 * const { products, loading, fromCache, searchProducts } = usePosProducts(terminalId);
 *
 * const results = await searchProducts('kopi');
 * ```
 */
export function usePosProducts(terminalId?: string): UsePosProductsReturn {
    // ---------------------------------------------------------------------------
    // State
    // ---------------------------------------------------------------------------

    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [fromCache, setFromCache] = useState<boolean>(false);
    const [lastCachedAt, setLastCachedAt] = useState<number | null>(null);

    // Track mount state to avoid setting state on unmounted component
    const isMountedRef = useRef<boolean>(true);

    // Track fetch calls to avoid redundant requests
    const fetchInProgressRef = useRef<boolean>(false);

    // Auto-refresh timer
    const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ---------------------------------------------------------------------------
    // Fetch Products
    // ---------------------------------------------------------------------------

    const handleFetchProducts = useCallback(async (): Promise<void> => {
        // Prevent concurrent fetches
        if (fetchInProgressRef.current) return;
        fetchInProgressRef.current = true;

        try {
            setLoading(true);
            setError(null);

            const { fetchProducts: apiFetchProducts } = await import('@/lib/pos-offline/api-client');

            // apiFetchProducts handles online/offline internally:
            // - Online: fetch from server → cache to IndexedDB → return
            // - Offline: return from IndexedDB cache
            const result = await apiFetchProducts(terminalId || '');

            if (!isMountedRef.current) return;

            setProducts(result);

            // Determine if from cache by checking network status
            const isOnline = typeof navigator !== 'undefined' && navigator.onLine;
            setFromCache(!isOnline);

            // Update last cached timestamp
            if (result.length > 0) {
                const latestCachedAt = Math.max(...result.map((p) => p.cachedAt));
                setLastCachedAt(latestCachedAt);
            }
        } catch (err) {
            if (!isMountedRef.current) return;

            const message = err instanceof Error ? err.message : 'Failed to load products';
            setError(message);
            console.error('[POS-Products Hook] Fetch failed:', err);
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
            fetchInProgressRef.current = false;
        }
    }, [terminalId]);

    // ---------------------------------------------------------------------------
    // Search Products
    // ---------------------------------------------------------------------------

    /**
     * Search products by name or SKU.
     * Uses IndexedDB searchCachedProducts for offline search.
     * Falls back to client-side filtering on the currently loaded products.
     */
    const handleSearchProducts = useCallback(async (query: string): Promise<Product[]> => {
        try {
            const trimmedQuery = query.toLowerCase().trim();

            if (!trimmedQuery) {
                // Empty query → return all loaded products
                return products;
            }

            // Try IndexedDB search first (works offline)
            const { searchCachedProducts } = await import('@/lib/pos-offline/db');
            const cachedResults = await searchCachedProducts(query);

            if (cachedResults.length > 0) {
                return cachedResults;
            }

            // Fallback: filter the currently loaded products
            return products.filter(
                (p) =>
                    p.name.toLowerCase().includes(trimmedQuery) ||
                    p.sku.toLowerCase().includes(trimmedQuery)
            );
        } catch (err) {
            console.error('[POS-Products Hook] Search failed:', err);

            // Fallback: filter the currently loaded products
            const trimmedQuery = query.toLowerCase().trim();
            return products.filter(
                (p) =>
                    p.name.toLowerCase().includes(trimmedQuery) ||
                    p.sku.toLowerCase().includes(trimmedQuery)
            );
        }
    }, [products]);

    // ---------------------------------------------------------------------------
    // Refresh Cache
    // ---------------------------------------------------------------------------

    /**
     * Force refresh the product cache from server.
     * Only works when online.
     */
    const handleRefreshCache = useCallback(async (): Promise<void> => {
        try {
            const isOnline = typeof navigator !== 'undefined' && navigator.onLine;
            if (!isOnline) {
                console.warn('[POS-Products Hook] Cannot refresh cache while offline');
                return;
            }

            setLoading(true);
            setError(null);

            const { syncProductsToCache } = await import('@/lib/pos-offline/api-client');
            const tenantId = terminalId || '';
            await syncProductsToCache(tenantId);

            // Re-fetch from cache to get updated products
            const { getCachedProducts } = await import('@/lib/pos-offline/db');
            const cachedProducts = await getCachedProducts();

            if (!isMountedRef.current) return;

            setProducts(cachedProducts);
            setFromCache(false);

            if (cachedProducts.length > 0) {
                const latestCachedAt = Math.max(...cachedProducts.map((p) => p.cachedAt));
                setLastCachedAt(latestCachedAt);
            }
        } catch (err) {
            if (!isMountedRef.current) return;

            const message = err instanceof Error ? err.message : 'Failed to refresh cache';
            setError(message);
            console.error('[POS-Products Hook] Cache refresh failed:', err);
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
        }
    }, [terminalId]);

    // ---------------------------------------------------------------------------
    // Effects
    // ---------------------------------------------------------------------------

    // Initial fetch on mount
    useEffect(() => {
        isMountedRef.current = true;
        void handleFetchProducts();

        return () => {
            isMountedRef.current = false;
        };
    }, [handleFetchProducts]);

    // Auto-refresh when online (every 5 minutes)
    useEffect(() => {
        if (typeof window === 'undefined') return;

        refreshTimerRef.current = setInterval(() => {
            const isOnline = navigator.onLine;
            if (isOnline && isMountedRef.current) {
                void handleFetchProducts();
            }
        }, AUTO_REFRESH_INTERVAL_MS);

        return () => {
            if (refreshTimerRef.current) {
                clearInterval(refreshTimerRef.current);
                refreshTimerRef.current = null;
            }
        };
    }, [handleFetchProducts]);

    // Listen to online event → refresh products
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleOnline = () => {
            if (isMountedRef.current) {
                console.log('[POS-Products Hook] Back online, refreshing products');
                void handleFetchProducts();
            }
        };

        window.addEventListener('online', handleOnline);

        return () => {
            window.removeEventListener('online', handleOnline);
        };
    }, [handleFetchProducts]);

    // ---------------------------------------------------------------------------
    // Return
    // ---------------------------------------------------------------------------

    return {
        products,
        loading,
        error,
        fromCache,
        lastCachedAt,
        fetchProducts: handleFetchProducts,
        searchProducts: handleSearchProducts,
        refreshCache: handleRefreshCache,
    };
}
