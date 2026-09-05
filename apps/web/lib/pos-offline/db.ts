/**
 * POS Offline Mode — IndexedDB Core Layer
 *
 * Native IndexedDB wrapper untuk offline POS operations.
 * Tanpa library dependency — menggunakan browser IndexedDB API langsung.
 *
 * Ref: plans/pos-offline-mode-architecture.md Section 4
 */

import type {
    Product,
    Session,
    PendingTransaction,
    SyncOperation,
    OfflineConfig,
    StorageUsage,
} from './types';

import { DB_NAME, DB_VERSION, STORES } from './types';

// =============================================================================
// Database Connection
// =============================================================================

/** Singleton database instance */
let dbInstance: IDBDatabase | null = null;

/**
 * Open (or return existing) IndexedDB connection.
 * Creates object stores and indexes on version upgrade.
 */
export async function openDB(): Promise<IDBDatabase> {
    if (dbInstance) {
        return dbInstance;
    }

    return new Promise<IDBDatabase>((resolve, reject) => {
        // Guard: IndexedDB not available (SSR, old browser)
        if (typeof indexedDB === 'undefined') {
            reject(new Error('IndexedDB is not supported in this environment'));
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            reject(new Error(`Failed to open IndexedDB: ${request.error?.message ?? 'Unknown error'}`));
        };

        request.onsuccess = () => {
            dbInstance = request.result;

            // Handle connection loss (browser cleanup, storage pressure)
            dbInstance.onclose = () => {
                dbInstance = null;
            };

            resolve(dbInstance);
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;

            // ── Store: products ──────────────────────────────────────────────────
            if (!db.objectStoreNames.contains(STORES.PRODUCTS)) {
                const productStore = db.createObjectStore(STORES.PRODUCTS, { keyPath: 'id' });
                productStore.createIndex('categoryId', 'categoryId', { unique: false });
                productStore.createIndex('name', 'name', { unique: false });
                productStore.createIndex('sku', 'sku', { unique: false });
                productStore.createIndex('tenantId', 'tenantId', { unique: false });
            }

            // ── Store: sessions ──────────────────────────────────────────────────
            if (!db.objectStoreNames.contains(STORES.SESSIONS)) {
                const sessionStore = db.createObjectStore(STORES.SESSIONS, { keyPath: 'id' });
                sessionStore.createIndex('terminalId', 'terminalId', { unique: false });
                sessionStore.createIndex('status', 'status', { unique: false });
                sessionStore.createIndex('tenantId', 'tenantId', { unique: false });
            }

            // ── Store: pending-transactions ──────────────────────────────────────
            if (!db.objectStoreNames.contains(STORES.PENDING_TRANSACTIONS)) {
                const txStore = db.createObjectStore(STORES.PENDING_TRANSACTIONS, { keyPath: 'localId' });
                txStore.createIndex('sessionId', 'sessionId', { unique: false });
                txStore.createIndex('status', 'status', { unique: false });
                txStore.createIndex('tenantId', 'tenantId', { unique: false });
                txStore.createIndex('createdAt', 'createdAt', { unique: false });
            }

            // ── Store: sync-queue ────────────────────────────────────────────────
            if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
                const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' });
                syncStore.createIndex('status', 'status', { unique: false });
                syncStore.createIndex('operation', 'operation', { unique: false });
                syncStore.createIndex('createdAt', 'createdAt', { unique: false });
                syncStore.createIndex('nextRetryAt', 'nextRetryAt', { unique: false });
            }

            // ── Store: config ────────────────────────────────────────────────────
            if (!db.objectStoreNames.contains(STORES.CONFIG)) {
                db.createObjectStore(STORES.CONFIG, { keyPath: 'key' });
            }
        };
    });
}

/**
 * Close the IndexedDB connection and clear the singleton.
 */
export async function closeDB(): Promise<void> {
    if (dbInstance) {
        dbInstance.close();
        dbInstance = null;
    }
}

// =============================================================================
// Generic Helpers
// =============================================================================

/**
 * Get an object store in the current transaction.
 * Uses 'readonly' mode by default.
 */
function getStore(
    db: IDBDatabase,
    storeName: string,
    mode: IDBTransactionMode = 'readonly'
): IDBObjectStore {
    const tx = db.transaction(storeName, mode);
    return tx.objectStore(storeName);
}

/**
 * Wrap an IDBRequest into a Promise.
 */
function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Wrap an IDBRequest for void operations (put, delete, clear).
 */
function voidRequest(request: IDBRequest): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

/**
 * Collect all results from an IDBCursorWithValue request.
 */
function getAllFromCursor<T>(store: IDBObjectStore): Promise<T[]> {
    return new Promise<T[]>((resolve, reject) => {
        const results: T[] = [];
        const request = store.openCursor();

        request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
            if (cursor) {
                results.push(cursor.value as T);
                cursor.continue();
            } else {
                resolve(results);
            }
        };

        request.onerror = () => reject(request.error);
    });
}

/**
 * Collect all results from an IDBIndex cursor.
 */
function getAllFromIndex<T>(index: IDBIndex): Promise<T[]> {
    return new Promise<T[]>((resolve, reject) => {
        const results: T[] = [];
        const request = index.openCursor();

        request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
            if (cursor) {
                results.push(cursor.value as T);
                cursor.continue();
            } else {
                resolve(results);
            }
        };

        request.onerror = () => reject(request.error);
    });
}

// =============================================================================
// Products
// =============================================================================

/**
 * Cache products to IndexedDB (batch upsert).
 * Replaces all existing products for the tenant.
 */
export async function cacheProducts(products: Product[]): Promise<void> {
    try {
        const db = await openDB();
        const tx = db.transaction(STORES.PRODUCTS, 'readwrite');
        const store = tx.objectStore(STORES.PRODUCTS);

        for (const product of products) {
            store.put(product);
        }

        return new Promise<void>((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error);
        });
    } catch (error) {
        console.error('[POS-Offline] Failed to cache products:', error);
        throw error;
    }
}

/**
 * Get all cached products from IndexedDB.
 */
export async function getCachedProducts(): Promise<Product[]> {
    try {
        const db = await openDB();
        const store = getStore(db, STORES.PRODUCTS, 'readonly');
        return getAllFromCursor<Product>(store);
    } catch (error) {
        console.error('[POS-Offline] Failed to get cached products:', error);
        throw error;
    }
}

/**
 * Search cached products by name or SKU (client-side filter).
 * Uses case-insensitive substring matching.
 */
export async function searchCachedProducts(query: string): Promise<Product[]> {
    try {
        const allProducts = await getCachedProducts();
        const lowerQuery = query.toLowerCase().trim();

        if (!lowerQuery) {
            return allProducts;
        }

        return allProducts.filter(
            (p) =>
                p.name.toLowerCase().includes(lowerQuery) ||
                p.sku.toLowerCase().includes(lowerQuery)
        );
    } catch (error) {
        console.error('[POS-Offline] Failed to search cached products:', error);
        throw error;
    }
}

// =============================================================================
// Sessions
// =============================================================================

/**
 * Cache a POS session to IndexedDB.
 */
export async function cacheSession(session: Session): Promise<void> {
    try {
        const db = await openDB();
        const store = getStore(db, STORES.SESSIONS, 'readwrite');
        await voidRequest(store.put(session));
    } catch (error) {
        console.error('[POS-Offline] Failed to cache session:', error);
        throw error;
    }
}

/**
 * Get a cached session by ID.
 */
export async function getCachedSession(id: string): Promise<Session | null> {
    try {
        const db = await openDB();
        const store = getStore(db, STORES.SESSIONS, 'readonly');
        const result = await requestToPromise<Session | undefined>(store.get(id));
        return result ?? null;
    } catch (error) {
        console.error('[POS-Offline] Failed to get cached session:', error);
        throw error;
    }
}

/**
 * Get the active (OPEN) session from cache.
 * Uses the 'status' index to find OPEN sessions.
 */
export async function getActiveSession(): Promise<Session | null> {
    try {
        const db = await openDB();
        const tx = db.transaction(STORES.SESSIONS, 'readonly');
        const store = tx.objectStore(STORES.SESSIONS);
        const index = store.index('status');
        const results = await new Promise<Session[]>((resolve, reject) => {
            const req = index.getAll('OPEN');
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
        return results.length > 0 ? results[0] : null;
    } catch (error) {
        console.error('[POS-Offline] Failed to get active session:', error);
        throw error;
    }
}

// =============================================================================
// Pending Transactions
// =============================================================================

/**
 * Save a pending transaction (created offline).
 */
export async function savePendingTransaction(tx: PendingTransaction): Promise<void> {
    try {
        const db = await openDB();
        const store = getStore(db, STORES.PENDING_TRANSACTIONS, 'readwrite');
        await voidRequest(store.put(tx));
    } catch (error) {
        console.error('[POS-Offline] Failed to save pending transaction:', error);
        throw error;
    }
}

/**
 * Get all pending transactions from cache.
 */
export async function getPendingTransactions(): Promise<PendingTransaction[]> {
    try {
        const db = await openDB();
        const store = getStore(db, STORES.PENDING_TRANSACTIONS, 'readonly');
        return getAllFromCursor<PendingTransaction>(store);
    } catch (error) {
        console.error('[POS-Offline] Failed to get pending transactions:', error);
        throw error;
    }
}

/**
 * Mark a transaction as synced and store server metadata.
 */
export async function markTransactionSynced(
    id: string,
    serverId?: string,
    serverTransactionNo?: string
): Promise<void> {
    try {
        const db = await openDB();
        const store = getStore(db, STORES.PENDING_TRANSACTIONS, 'readwrite');
        const existing = await requestToPromise<PendingTransaction | undefined>(store.get(id));

        if (!existing) {
            throw new Error(`Transaction not found: ${id}`);
        }

        const updated: PendingTransaction = {
            ...existing,
            status: 'SYNCED',
            syncedAt: new Date().toISOString(),
            serverId: serverId ?? null,
            serverTransactionNo: serverTransactionNo ?? null,
        };

        await voidRequest(store.put(updated));
    } catch (error) {
        console.error('[POS-Offline] Failed to mark transaction synced:', error);
        throw error;
    }
}

/**
 * Delete a pending transaction by ID.
 */
export async function deletePendingTransaction(id: string): Promise<void> {
    try {
        const db = await openDB();
        const store = getStore(db, STORES.PENDING_TRANSACTIONS, 'readwrite');
        await voidRequest(store.delete(id));
    } catch (error) {
        console.error('[POS-Offline] Failed to delete pending transaction:', error);
        throw error;
    }
}

// =============================================================================
// Sync Queue
// =============================================================================

/**
 * Add an operation to the sync queue.
 */
export async function addToSyncQueue(operation: SyncOperation): Promise<void> {
    try {
        const db = await openDB();
        const store = getStore(db, STORES.SYNC_QUEUE, 'readwrite');
        await voidRequest(store.put(operation));
    } catch (error) {
        console.error('[POS-Offline] Failed to add to sync queue:', error);
        throw error;
    }
}

/**
 * Get all operations in the sync queue.
 */
export async function getSyncQueue(): Promise<SyncOperation[]> {
    try {
        const db = await openDB();
        const store = getStore(db, STORES.SYNC_QUEUE, 'readonly');
        return getAllFromCursor<SyncOperation>(store);
    } catch (error) {
        console.error('[POS-Offline] Failed to get sync queue:', error);
        throw error;
    }
}

/**
 * Remove a completed/failed operation from the sync queue.
 */
export async function removeSyncOperation(id: string): Promise<void> {
    try {
        const db = await openDB();
        const store = getStore(db, STORES.SYNC_QUEUE, 'readwrite');
        await voidRequest(store.delete(id));
    } catch (error) {
        console.error('[POS-Offline] Failed to remove sync operation:', error);
        throw error;
    }
}

// =============================================================================
// Config
// =============================================================================

/**
 * Get a configuration value by key.
 */
export async function getConfig(key: string): Promise<string | null> {
    try {
        const db = await openDB();
        const store = getStore(db, STORES.CONFIG, 'readonly');
        const result = await requestToPromise<OfflineConfig | undefined>(store.get(key));
        return result?.value ?? null;
    } catch (error) {
        console.error('[POS-Offline] Failed to get config:', error);
        throw error;
    }
}

/**
 * Set a configuration value.
 */
export async function setConfig(key: string, value: string): Promise<void> {
    try {
        const db = await openDB();
        const store = getStore(db, STORES.CONFIG, 'readwrite');
        const entry: OfflineConfig = {
            key,
            value,
            updatedAt: Date.now(),
        };
        await voidRequest(store.put(entry));
    } catch (error) {
        console.error('[POS-Offline] Failed to set config:', error);
        throw error;
    }
}

// =============================================================================
// Utility
// =============================================================================

/**
 * Clear all data from all stores.
 * Use with caution — this wipes the entire offline cache.
 */
export async function clearAllData(): Promise<void> {
    try {
        const db = await openDB();
        const storeNames = Array.from(db.objectStoreNames);

        const tx = db.transaction(storeNames, 'readwrite');
        for (const name of storeNames) {
            tx.objectStore(name).clear();
        }

        return new Promise<void>((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error);
        });
    } catch (error) {
        console.error('[POS-Offline] Failed to clear all data:', error);
        throw error;
    }
}

/**
 * Get storage usage information (used vs quota).
 * Only available in secure contexts (HTTPS).
 */
export async function getStorageUsage(): Promise<StorageUsage> {
    try {
        if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
            const estimate = await navigator.storage.estimate();
            return {
                used: estimate.usage ?? 0,
                quota: estimate.quota ?? 0,
            };
        }

        // Fallback: storage API not available
        return { used: 0, quota: 0 };
    } catch (error) {
        console.error('[POS-Offline] Failed to get storage usage:', error);
        return { used: 0, quota: 0 };
    }
}
