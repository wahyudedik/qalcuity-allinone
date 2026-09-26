/**
 * POS Offline Mode — Barrel Export
 *
 * Public API untuk pos-offline module.
 * Import dari sini untuk akses ke semua types, classes, dan functions.
 *
 * Ref: plans/pos-offline-mode-architecture.md
 */

// ─── Types ──────────────────────────────────────────────────────────────────
export type {
    Product,
    Session,
    TransactionItem,
    PendingTransaction,
    SyncOperation,
    OfflineConfig,
    OfflineMode,
    DBStoreMap,
    StoreName,
    StorageUsage,
} from './types';

export { DB_NAME, DB_VERSION, STORES } from './types';

// ─── IndexedDB Core ─────────────────────────────────────────────────────────
export {
    openDB,
    cacheProducts,
    getCachedProducts,
    searchCachedProducts,
    cacheSession,
    getCachedSession,
    getActiveSession,
    savePendingTransaction,
    getPendingTransactions,
    markTransactionSynced,
    deletePendingTransaction,
    addToSyncQueue,
    getSyncQueue,
    removeSyncOperation,
    getConfig,
    setConfig,
    clearAllData,
    getStorageUsage,
} from './db';

// ─── Sync Engine ────────────────────────────────────────────────────────────
export { SyncEngine } from './sync';
export type { SyncResult, SyncStatus } from './sync';

// ─── API Client ─────────────────────────────────────────────────────────────
export {
    posFetch,
    fetchProducts,
    fetchSession,
    fetchActiveSession,
    createTransaction,
    closeSession,
    syncProductsToCache,
    syncSessionToCache,
    clearOfflineCache,
    getPendingSyncCount,
    triggerSyncNow,
} from './api-client';
export type { ApiResponse, TransactionResult } from './api-client';

// ─── Service Worker ─────────────────────────────────────────────────────────
export {
    registerServiceWorker,
    unregisterServiceWorker,
    getCacheUsage,
    clearAllCaches,
    clearCache,
    updateServiceWorker,
    isServiceWorkerActive,
    onSWStateChange,
} from './service-worker';
export type { CacheStats } from './service-worker';
