/**
 * POS Offline Mode — API Client
 *
 * Fetch wrapper yang bekerja online dan offline.
 * Saat offline, mengembalikan data dari IndexedDB cache.
 * Saat online, mengambil data dari server dan update cache.
 *
 * Ref: plans/pos-offline-mode-architecture.md Section 6
 */

import type { Product, Session, PendingTransaction, SyncOperation } from './types';
import { STORES } from './types';
import {
    openDB,
    cacheProducts,
    getCachedProducts,
    cacheSession,
    getCachedSession,
    addToSyncQueue,
    savePendingTransaction,
} from './db';
import { SyncEngine } from './sync';

// =============================================================================
// Types
// =============================================================================

/** API response wrapper */
export interface ApiResponse<T> {
    success: boolean;
    data: T;
    error?: string;
}

/** Result of creating a transaction (online or queued for offline) */
export interface TransactionResult {
    /** Whether the transaction was sent to the server immediately */
    online: boolean;
    /** Server-assigned ID (if synced immediately) */
    serverId?: string;
    /** Server-assigned transaction number (if synced immediately) */
    serverTransactionNo?: string;
    /** Local ID of the pending transaction */
    localId: string;
    /** Error message if the operation failed */
    error?: string;
}

// =============================================================================
// Network Detection Helper
// =============================================================================

/**
 * Check if the browser is currently online.
 * Gracefully handles environments where navigator.onLine is not available.
 */
function isOnline(): boolean {
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
        return navigator.onLine;
    }
    return true;
}

// =============================================================================
// Core Fetch Wrapper
// =============================================================================

/**
 * Fetch wrapper yang menangani offline mode.
 *
 * - Online: mengirim request ke server dan mengembalikan response
 * - Offline: throw error yang bisa di-catch oleh caller
 *
 * @param url - URL endpoint
 * @param options - Fetch options (method, body, headers)
 * @returns Object dengan `data` dan `fromCache` flag
 * @throws Error jika request gagal (offline atau server error)
 */
export async function posFetch<T>(
    url: string,
    options?: RequestInit
): Promise<{ data: T; fromCache: boolean }> {
    if (!isOnline()) {
        throw new Error('OFFLINE: Network unavailable');
    }

    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(options?.headers as Record<string, string> | undefined),
        },
    });

    if (!response.ok) {
        let errorMsg = `HTTP ${response.status}`;
        try {
            const body = await response.json();
            if (body && typeof body === 'object' && 'error' in body) {
                errorMsg = String((body as { error: unknown }).error);
            }
        } catch {
            // Use default error message
        }
        throw new Error(errorMsg);
    }

    const json = (await response.json()) as ApiResponse<T>;

    if (!json.success) {
        throw new Error(json.error || 'Request failed');
    }

    return { data: json.data, fromCache: false };
}

// =============================================================================
// Product API
// =============================================================================

/**
 * Fetch products from server and cache to IndexedDB.
 * Returns cached products if offline.
 *
 * @param tenantId - Current tenant ID for cache filtering
 * @returns Array of products
 */
export async function fetchProducts(tenantId: string): Promise<Product[]> {
    try {
        const { data } = await posFetch<Product[]>('/api/pos/products');

        // Transform server response to include cache metadata
        const now = Date.now();
        const cachedProducts: Product[] = data.map((p) => ({
            ...p,
            tenantId: p.tenantId || tenantId,
            cachedAt: now,
        }));

        // Cache to IndexedDB for offline use
        await cacheProducts(cachedProducts);

        return cachedProducts;
    } catch (error) {
        // Offline or server error — fall back to cache
        console.warn('[POS-ApiClient] Failed to fetch products, using cache:', error);
        const cached = await getCachedProducts();

        // Filter by tenant if possible
        if (tenantId) {
            return cached.filter((p) => p.tenantId === tenantId);
        }

        return cached;
    }
}

// =============================================================================
// Session API
// =============================================================================

/**
 * Fetch a specific session from server and cache it.
 * Returns cached session if offline.
 *
 * @param id - Session ID
 * @returns Session object or null
 */
export async function fetchSession(id: string): Promise<Session | null> {
    try {
        const { data } = await posFetch<Session>(`/api/pos/sessions/${id}`);

        // Cache to IndexedDB
        await cacheSession(data);

        return data;
    } catch (error) {
        // Offline or server error — fall back to cache
        console.warn('[POS-ApiClient] Failed to fetch session, using cache:', error);
        return getCachedSession(id);
    }
}

/**
 * Fetch the active (OPEN) session for the current terminal.
 * Returns cached active session if offline.
 *
 * @param terminalId - Terminal ID to filter active session
 * @returns Session object or null
 */
export async function fetchActiveSession(terminalId?: string): Promise<Session | null> {
    try {
        const url = terminalId
            ? `/api/pos/sessions?terminalId=${terminalId}&status=OPEN`
            : '/api/pos/sessions?status=OPEN';

        const { data } = await posFetch<Session | Session[]>(url);
        const session = Array.isArray(data) ? data[0] : data;

        if (session) {
            await cacheSession(session);
        }

        return session ?? null;
    } catch (error) {
        console.warn('[POS-ApiClient] Failed to fetch active session, using cache:', error);

        // Try to get from IndexedDB cache
        const { getActiveSession } = await import('./db');
        return getActiveSession();
    }
}

// =============================================================================
// Transaction API
// =============================================================================

/**
 * Create a transaction. Works both online and offline.
 *
 * - Online: sends directly to server
 * - Offline: saves to pending-transactions and queues for sync
 *
 * @param tx - The transaction data to create
 * @returns TransactionResult with server or local IDs
 */
export async function createTransaction(
    tx: PendingTransaction
): Promise<TransactionResult> {
    // Always save to pending store first (for offline safety)
    await savePendingTransaction(tx);

    if (!isOnline()) {
        // Queue for sync when back online
        const syncOp: SyncOperation = {
            id: `sync-${tx.localId}-${Date.now()}`,
            type: 'CREATE_TRANSACTION',
            entityType: 'transaction',
            entityId: tx.localId,
            data: tx as unknown as Record<string, unknown>,
            payload: tx as unknown as Record<string, unknown>,
            endpoint: '/api/pos/transactions',
            method: 'POST',
            idempotencyKey: tx.idempotencyKey,
            createdAt: new Date().toISOString(),
            status: 'PENDING',
            retryCount: 0,
            maxRetries: 10,
            nextRetryAt: Date.now(),
        };

        await addToSyncQueue(syncOp);

        return {
            online: false,
            localId: tx.localId,
        };
    }

    // Online — send directly to server
    try {
        const response = await fetch('/api/pos/transactions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Idempotency-Key': tx.idempotencyKey,
            },
            body: JSON.stringify(tx),
        });

        if (!response.ok) {
            let errorMsg = `HTTP ${response.status}`;
            try {
                const body = await response.json();
                if (body && typeof body === 'object' && 'error' in body) {
                    errorMsg = String((body as { error: unknown }).error);
                }
            } catch {
                // Use default
            }

            // Server rejected — queue for retry
            const syncOp: SyncOperation = {
                id: `sync-${tx.localId}-${Date.now()}`,
                type: 'CREATE_TRANSACTION',
                entityType: 'transaction',
                entityId: tx.localId,
                data: tx as unknown as Record<string, unknown>,
                payload: tx as unknown as Record<string, unknown>,
                endpoint: '/api/pos/transactions',
                method: 'POST',
                idempotencyKey: tx.idempotencyKey,
                createdAt: new Date().toISOString(),
                status: 'PENDING',
                retryCount: 0,
                maxRetries: 10,
                nextRetryAt: Date.now(),
            };
            await addToSyncQueue(syncOp);

            return {
                online: false,
                localId: tx.localId,
                error: errorMsg,
            };
        }

        const json = (await response.json()) as ApiResponse<{ id: string; transactionNo: string }>;
        const serverData = json.data;

        // Mark as synced in local store
        const { markTransactionSynced } = await import('./db');
        await markTransactionSynced(tx.localId, serverData.id, serverData.transactionNo);

        return {
            online: true,
            serverId: serverData.id,
            serverTransactionNo: serverData.transactionNo,
            localId: tx.localId,
        };
    } catch (error) {
        // Network error — queue for sync
        const errorMsg = error instanceof Error ? error.message : 'Network error';

        const syncOp: SyncOperation = {
            id: `sync-${tx.localId}-${Date.now()}`,
            type: 'CREATE_TRANSACTION',
            entityType: 'transaction',
            entityId: tx.localId,
            data: tx as unknown as Record<string, unknown>,
            payload: tx as unknown as Record<string, unknown>,
            endpoint: '/api/pos/transactions',
            method: 'POST',
            idempotencyKey: tx.idempotencyKey,
            createdAt: new Date().toISOString(),
            status: 'PENDING',
            retryCount: 0,
            maxRetries: 10,
            nextRetryAt: Date.now(),
        };
        await addToSyncQueue(syncOp);

        return {
            online: false,
            localId: tx.localId,
            error: errorMsg,
        };
    }
}

// =============================================================================
// Session Close API
// =============================================================================

/**
 * Close a POS session. Works both online and offline.
 *
 * - Online: sends PUT to server
 * - Offline: queues for sync when back online
 *
 * @param sessionId - The session to close
 * @param closingData - Closing data (closing cash, notes, etc.)
 * @returns Updated session or null
 */
export async function closeSession(
    sessionId: string,
    closingData?: { closingCash?: number; notes?: string }
): Promise<Session | null> {
    if (!isOnline()) {
        // Queue for sync
        const syncOp: SyncOperation = {
            id: `sync-close-${sessionId}-${Date.now()}`,
            type: 'CLOSE_SESSION',
            entityType: 'session',
            entityId: sessionId,
            data: closingData ?? {},
            payload: {
                id: sessionId,
                status: 'CLOSED',
                ...closingData,
            },
            endpoint: `/api/pos/sessions/${sessionId}`,
            method: 'PUT',
            idempotencyKey: `close-${sessionId}-${Date.now()}`,
            createdAt: new Date().toISOString(),
            status: 'PENDING',
            retryCount: 0,
            maxRetries: 10,
            nextRetryAt: Date.now(),
        };

        await addToSyncQueue(syncOp);

        // Update local cache
        const cached = await getCachedSession(sessionId);
        if (cached) {
            const updatedSession: Session = {
                ...cached,
                status: 'CLOSED',
                closedAt: new Date().toISOString(),
            };
            await cacheSession(updatedSession);
            return updatedSession;
        }

        return null;
    }

    // Online — send directly
    try {
        const { data } = await posFetch<Session>(`/api/pos/sessions/${sessionId}`, {
            method: 'PUT',
            body: JSON.stringify({
                status: 'CLOSED',
                ...closingData,
            }),
        });

        // Update local cache
        await cacheSession(data);
        return data;
    } catch (error) {
        console.warn('[POS-ApiClient] Failed to close session on server, queuing:', error);

        // Queue for sync
        const syncOp: SyncOperation = {
            id: `sync-close-${sessionId}-${Date.now()}`,
            type: 'CLOSE_SESSION',
            entityType: 'session',
            entityId: sessionId,
            data: closingData ?? {},
            payload: {
                id: sessionId,
                status: 'CLOSED',
                ...closingData,
            },
            endpoint: `/api/pos/sessions/${sessionId}`,
            method: 'PUT',
            idempotencyKey: `close-${sessionId}-${Date.now()}`,
            createdAt: new Date().toISOString(),
            status: 'PENDING',
            retryCount: 0,
            maxRetries: 10,
            nextRetryAt: Date.now(),
        };
        await addToSyncQueue(syncOp);

        // Update local cache
        const cached = await getCachedSession(sessionId);
        if (cached) {
            const updatedSession: Session = {
                ...cached,
                status: 'CLOSED',
                closedAt: new Date().toISOString(),
            };
            await cacheSession(updatedSession);
            return updatedSession;
        }

        return null;
    }
}

// =============================================================================
// Cache Management
// =============================================================================

/**
 * Sync products from server to IndexedDB cache.
 * Called on startup and periodically when online.
 *
 * @param tenantId - Current tenant ID
 */
export async function syncProductsToCache(tenantId: string): Promise<void> {
    try {
        const { data } = await posFetch<Product[]>('/api/pos/products');

        const now = Date.now();
        const products: Product[] = data.map((p) => ({
            ...p,
            tenantId: p.tenantId || tenantId,
            cachedAt: now,
        }));

        await cacheProducts(products);
        console.log(`[POS-ApiClient] Synced ${products.length} products to cache`);
    } catch (error) {
        console.warn('[POS-ApiClient] Failed to sync products to cache:', error);
    }
}

/**
 * Sync a specific session from server to IndexedDB cache.
 *
 * @param sessionId - The session ID to cache
 */
export async function syncSessionToCache(sessionId: string): Promise<void> {
    try {
        const { data } = await posFetch<Session>(`/api/pos/sessions/${sessionId}`);
        await cacheSession(data);
        console.log(`[POS-ApiClient] Synced session ${sessionId} to cache`);
    } catch (error) {
        console.warn(`[POS-ApiClient] Failed to sync session ${sessionId} to cache:`, error);
    }
}

/**
 * Clear all cached data from IndexedDB.
 * Use with caution — this wipes the entire offline cache.
 */
export async function clearOfflineCache(): Promise<void> {
    try {
        const { clearAllData } = await import('./db');
        await clearAllData();
        console.log('[POS-ApiClient] Offline cache cleared');
    } catch (error) {
        console.error('[POS-ApiClient] Failed to clear offline cache:', error);
    }
}

/**
 * Get the number of pending items in the sync queue.
 */
export async function getPendingSyncCount(): Promise<number> {
    try {
        const engine = SyncEngine.getInstance();
        return engine.getQueueSize();
    } catch {
        return 0;
    }
}

/**
 * Trigger an immediate sync of all pending operations.
 */
export async function triggerSyncNow(): Promise<import('./sync').SyncResult> {
    const engine = SyncEngine.getInstance();
    return engine.processQueue();
}
