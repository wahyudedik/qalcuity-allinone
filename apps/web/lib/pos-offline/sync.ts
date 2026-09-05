/**
 * POS Offline Mode — Sync Engine
 *
 * Queue-based sync engine dengan retry logic, mutex lock, dan conflict resolution.
 * Menggunakan exponential backoff untuk retry (1s, 2s, 4s, ... max 60s, max 10 retries).
 *
 * Ref: plans/pos-offline-mode-architecture.md Section 6
 */

import type { SyncOperation, PendingTransaction, OfflineMode } from './types';
import {
    openDB,
    getSyncQueue,
    addToSyncQueue,
    removeSyncOperation,
    getPendingTransactions,
    markTransactionSynced,
    setConfig,
    getConfig,
} from './db';

// =============================================================================
// Types
// =============================================================================

/** Result of a sync run */
export interface SyncResult {
    processed: number;
    succeeded: number;
    failed: number;
    skipped: number;
    errors: SyncError[];
}

/** Error detail for a single failed operation */
export interface SyncError {
    operationId: string;
    entityType: string;
    entityId: string;
    message: string;
}

/** Current sync status for UI consumption */
export interface SyncStatus {
    isOnline: boolean;
    mode: OfflineMode;
    pendingCount: number;
    syncingCount: number;
    failedCount: number;
    lastSyncAt: string | null;
    currentSyncItem: string | null;
}

/** Configuration keys used in the config store */
const CONFIG_KEYS = {
    LAST_SYNC_AT: 'lastSyncAt',
    LAST_MODE: 'lastMode',
} as const;

/** Maximum retry attempts before marking operation as FAILED */
const MAX_RETRIES = 10;

/** Base delay in milliseconds for exponential backoff */
const BASE_DELAY_MS = 1000;

/** Maximum delay cap in milliseconds (60 seconds) */
const MAX_DELAY_MS = 60_000;

/** Poll interval for checking sync-eligible operations (30 seconds) */
const SYNC_POLL_INTERVAL_MS = 30_000;

// =============================================================================
// SyncEngine Class
// =============================================================================

/**
 * Singleton sync engine that processes the IndexedDB sync queue.
 *
 * Usage:
 * ```typescript
 * const engine = SyncEngine.getInstance();
 * await engine.start();      // begin auto-sync on network events
 * await engine.processQueue(); // manual trigger
 * await engine.stop();        // cleanup
 * ```
 */
export class SyncEngine {
    private static instance: SyncEngine | null = null;

    /** Mutex — prevents concurrent processQueue runs */
    private isSyncing = false;

    /** Active retry timers keyed by operation ID */
    private retryTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

    /** Poll timer for periodic sync attempts */
    private pollTimer: ReturnType<typeof setTimeout> | null = null;

    /** Event listener references for cleanup */
    private boundHandleOnline: (() => void) | null = null;
    private boundHandleOffline: (() => void) | null = null;

    /** Current online status */
    private online = true;

    /** Currently processing operation ID (for status display) */
    private currentSyncItem: string | null = null;

    /** Listeners for status changes */
    private statusListeners: Array<(status: SyncStatus) => void> = [];

    private constructor() {
        // Detect initial online status gracefully
        this.online = typeof navigator !== 'undefined' ? navigator.onLine : true;
    }

    /** Get or create the singleton instance */
    static getInstance(): SyncEngine {
        if (!SyncEngine.instance) {
            SyncEngine.instance = new SyncEngine();
        }
        return SyncEngine.instance;
    }

    // -------------------------------------------------------------------------
    // Lifecycle
    // -------------------------------------------------------------------------

    /**
     * Start the sync engine:
     * - Register online/offline event listeners
     * - Begin periodic polling
     * - Trigger an immediate sync if online with pending items
     */
    async start(): Promise<void> {
        if (typeof window === 'undefined') {
            // SSR — skip browser-only setup
            return;
        }

        this.boundHandleOnline = this.handleOnline.bind(this);
        this.boundHandleOffline = this.handleOffline.bind(this);

        window.addEventListener('online', this.boundHandleOnline);
        window.addEventListener('offline', this.boundHandleOffline);

        // Set initial mode
        await setConfig(CONFIG_KEYS.LAST_MODE, this.online ? 'online' : 'offline');

        // Start periodic polling
        this.startPolling();

        // If already online, attempt an immediate sync
        if (this.online) {
            void this.processQueue();
        }

        console.log('[POS-Sync] Engine started');
    }

    /**
     * Stop the sync engine:
     * - Remove event listeners
     * - Clear all retry timers
     * - Stop polling
     */
    async stop(): Promise<void> {
        if (typeof window === 'undefined') return;

        if (this.boundHandleOnline) {
            window.removeEventListener('online', this.boundHandleOnline);
        }
        if (this.boundHandleOffline) {
            window.removeEventListener('offline', this.boundHandleOffline);
        }

        // Clear all retry timers
        for (const timer of this.retryTimers.values()) {
            clearTimeout(timer);
        }
        this.retryTimers.clear();

        // Stop polling
        this.stopPolling();

        console.log('[POS-Sync] Engine stopped');
    }

    // -------------------------------------------------------------------------
    // Queue Processing
    // -------------------------------------------------------------------------

    /**
     * Process all pending operations in the sync queue.
     * Uses a mutex lock to prevent concurrent runs.
     * Operations are processed sequentially in FIFO order.
     *
     * @returns Summary of what was processed
     */
    async processQueue(): Promise<SyncResult> {
        // Mutex lock — prevent concurrent sync
        if (this.isSyncing) {
            console.log('[POS-Sync] Already syncing, skipping');
            return { processed: 0, succeeded: 0, failed: 0, skipped: 1, errors: [] };
        }

        // Must be online to sync
        if (!this.isOnline()) {
            console.log('[POS-Sync] Offline, skipping sync');
            return { processed: 0, succeeded: 0, failed: 0, skipped: 1, errors: [] };
        }

        this.isSyncing = true;
        this.notifyListeners();

        const result: SyncResult = {
            processed: 0,
            succeeded: 0,
            failed: 0,
            skipped: 0,
            errors: [],
        };

        try {
            // Get operations eligible for processing (PENDING + nextRetryAt <= now)
            const queue = await this.getEligibleOperations();
            const now = Date.now();

            for (const op of queue) {
                // Re-check online status between operations
                if (!this.isOnline()) {
                    result.skipped++;
                    break;
                }

                // Check if this operation is ready for retry
                if (op.nextRetryAt > now) {
                    result.skipped++;
                    continue;
                }

                this.currentSyncItem = `${op.type}:${op.entityId}`;
                this.notifyListeners();

                const success = await this.processOperation(op);

                if (success) {
                    result.succeeded++;
                } else {
                    result.failed++;
                    result.errors.push({
                        operationId: op.id,
                        entityType: op.entityType,
                        entityId: op.entityId,
                        message: op.lastError || 'Unknown error',
                    });
                }

                result.processed++;
            }
        } catch (error) {
            console.error('[POS-Sync] Queue processing error:', error);
        } finally {
            this.isSyncing = false;
            this.currentSyncItem = null;
            this.notifyListeners();

            // Update last sync timestamp
            if (result.succeeded > 0) {
                await setConfig(CONFIG_KEYS.LAST_SYNC_AT, new Date().toISOString());
            }
        }

        return result;
    }

    /**
     * Process a single sync operation.
     * Updates the operation status in IndexedDB and handles retry scheduling.
     *
     * @returns true if the operation succeeded, false otherwise
     */
    private async processOperation(op: SyncOperation): Promise<boolean> {
        try {
            // Mark as processing
            await this.updateOperationStatus(op.id, 'PROCESSING');

            // Build the request
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'X-Idempotency-Key': op.idempotencyKey,
            };

            const response = await fetch(op.endpoint, {
                method: op.method,
                headers,
                body: JSON.stringify(op.payload),
            });

            if (response.ok) {
                // Success — handle post-sync actions
                await this.handleSyncSuccess(op, response);
                await this.updateOperationStatus(op.id, 'COMPLETED');
                await removeSyncOperation(op.id);

                // Clear any pending retry timer
                this.clearRetryTimer(op.id);

                console.log(`[POS-Sync] Operation ${op.type} completed: ${op.entityId}`);
                return true;
            }

            // Handle specific error codes
            if (response.status === 409) {
                // Conflict — resolve based on entity type
                console.warn(`[POS-Sync] Conflict for ${op.type}:${op.entityId}`);
                await this.handleConflict(op, response);
                await removeSyncOperation(op.id);
                return true;
            }

            if (response.status >= 400 && response.status < 500) {
                // Client error (non-conflict) — don't retry, mark as failed
                const errorBody = await response.json().catch(() => ({ error: 'Client error' }));
                const errorMsg = typeof errorBody === 'object' && errorBody !== null && 'error' in errorBody
                    ? String((errorBody as { error: unknown }).error)
                    : `HTTP ${response.status}`;

                await this.markOperationFailed(op, errorMsg);
                console.error(`[POS-Sync] Client error for ${op.type}: ${errorMsg}`);
                return false;
            }

            // Server error (5xx) — schedule retry
            const errorBody = await response.json().catch(() => ({ error: 'Server error' }));
            const errorMsg = typeof errorBody === 'object' && errorBody !== null && 'error' in errorBody
                ? String((errorBody as { error: unknown }).error)
                : `HTTP ${response.status}`;

            await this.scheduleRetry(op, errorMsg);
            return false;
        } catch (error) {
            // Network error — schedule retry
            const errorMsg = error instanceof Error ? error.message : 'Network error';
            console.warn(`[POS-Sync] Network error for ${op.type}: ${errorMsg}`);
            await this.scheduleRetry(op, errorMsg);
            return false;
        }
    }

    // -------------------------------------------------------------------------
    // Success Handling
    // -------------------------------------------------------------------------

    /**
     * Handle post-sync actions after a successful operation.
     * For CREATE_TRANSACTION: mark the pending transaction as synced.
     */
    private async handleSyncSuccess(op: SyncOperation, response: Response): Promise<void> {
        if (op.type === 'CREATE_TRANSACTION') {
            try {
                const body = await response.json();
                const data = (body && typeof body === 'object' && 'data' in body)
                    ? body.data as Record<string, unknown>
                    : body as Record<string, unknown>;

                const serverId = typeof data.id === 'string' ? data.id : undefined;
                const serverTransactionNo = typeof data.transactionNo === 'string'
                    ? data.transactionNo
                    : undefined;

                await markTransactionSynced(op.entityId, serverId, serverTransactionNo);
            } catch {
                // Response parsing failed — transaction was still accepted
                // Mark synced without server metadata
                await markTransactionSynced(op.entityId);
            }
        }
    }

    // -------------------------------------------------------------------------
    // Conflict Resolution
    // -------------------------------------------------------------------------

    /**
     * Handle a 409 Conflict response.
     *
     * Resolution strategy:
     * - Products / Sessions: Server-wins → fetch fresh data from server
     * - Transactions: Client-wins → server should accept the offline transaction
     */
    private async handleConflict(op: SyncOperation, _response: Response): Promise<void> {
        switch (op.type) {
            case 'CREATE_TRANSACTION':
                // Client-wins: Transactions created offline are always accepted
                // The server should have accepted it via idempotency key
                // Mark as synced — server will handle dedup
                if (op.entityType === 'transaction') {
                    await markTransactionSynced(op.entityId);
                }
                break;

            case 'UPDATE_SESSION':
            case 'CLOSE_SESSION':
                // Server-wins: Fetch fresh session from server
                // The local cache will be updated on next data fetch
                console.log(`[POS-Sync] Session conflict resolved (server-wins): ${op.entityId}`);
                break;

            default:
                console.warn(`[POS-Sync] Unknown conflict type: ${op.type}`);
                break;
        }
    }

    // -------------------------------------------------------------------------
    // Retry Logic
    // -------------------------------------------------------------------------

    /**
     * Schedule a retry for a failed operation with exponential backoff.
     * Backoff: 1s → 2s → 4s → 8s → 16s → 32s → 60s (capped)
     * Max retries: 10
     */
    private async scheduleRetry(op: SyncOperation, errorMsg: string): Promise<void> {
        const newRetryCount = op.retryCount + 1;

        if (newRetryCount > op.maxRetries || newRetryCount > MAX_RETRIES) {
            // Max retries exceeded — mark as FAILED
            await this.markOperationFailed(op, `Max retries exceeded: ${errorMsg}`);
            return;
        }

        const delay = this.calculateRetryDelay(newRetryCount);
        const nextRetryAt = Date.now() + delay;

        // Update operation in IndexedDB
        const db = await openDB();
        const tx = db.transaction('sync-queue', 'readwrite');
        const store = tx.objectStore('sync-queue');
        const updatedOp: SyncOperation = {
            ...op,
            status: 'PENDING',
            retryCount: newRetryCount,
            lastError: errorMsg,
            nextRetryAt,
        };
        store.put(updatedOp);

        await new Promise<void>((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error);
        });

        // Schedule the timer
        this.scheduleRetryTimer(op.id, delay);

        console.log(
            `[POS-Sync] Retry #${newRetryCount} scheduled for ${op.type}:${op.entityId} in ${delay}ms`
        );
    }

    /**
     * Calculate retry delay using exponential backoff.
     * Formula: min(BASE_DELAY_MS * 2^(retryCount-1), MAX_DELAY_MS)
     */
    calculateRetryDelay(retryCount: number): number {
        const delay = BASE_DELAY_MS * Math.pow(2, retryCount - 1);
        return Math.min(delay, MAX_DELAY_MS);
    }

    /**
     * Set a timer to trigger processQueue after the delay.
     */
    private scheduleRetryTimer(operationId: string, delay: number): void {
        this.clearRetryTimer(operationId);

        const timer = setTimeout(() => {
            this.retryTimers.delete(operationId);
            void this.processQueue();
        }, delay);

        this.retryTimers.set(operationId, timer);
    }

    /**
     * Clear a retry timer for a specific operation.
     */
    private clearRetryTimer(operationId: string): void {
        const timer = this.retryTimers.get(operationId);
        if (timer) {
            clearTimeout(timer);
            this.retryTimers.delete(operationId);
        }
    }

    /**
     * Mark an operation as FAILED when max retries are exceeded.
     */
    private async markOperationFailed(op: SyncOperation, errorMsg: string): Promise<void> {
        const db = await openDB();
        const tx = db.transaction('sync-queue', 'readwrite');
        const store = tx.objectStore('sync-queue');
        const updatedOp: SyncOperation = {
            ...op,
            status: 'FAILED',
            retryCount: op.retryCount + 1,
            lastError: errorMsg,
        };
        store.put(updatedOp);

        await new Promise<void>((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error);
        });

        // Also mark the pending transaction as FAILED if applicable
        if (op.type === 'CREATE_TRANSACTION') {
            try {
                const db2 = await openDB();
                const tx2 = db2.transaction('pending-transactions', 'readwrite');
                const store2 = tx2.objectStore('pending-transactions');
                const existing = await new Promise<PendingTransaction | undefined>((resolve, reject) => {
                    const req = store2.get(op.entityId);
                    req.onsuccess = () => resolve(req.result);
                    req.onerror = () => reject(req.error);
                });

                if (existing) {
                    store2.put({
                        ...existing,
                        status: 'FAILED',
                        syncError: errorMsg,
                    });
                }

                await new Promise<void>((resolve, reject) => {
                    tx2.oncomplete = () => resolve();
                    tx2.onerror = () => reject(tx2.error);
                    tx2.onabort = () => reject(tx2.error);
                });
            } catch {
                // Best effort — don't fail the sync engine
            }
        }

        this.clearRetryTimer(op.id);
    }

    // -------------------------------------------------------------------------
    // Network Detection
    // -------------------------------------------------------------------------

    /**
     * Check if the browser is online.
     * Gracefully handles environments where navigator.onLine is not available.
     */
    private isOnline(): boolean {
        if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
            return navigator.onLine;
        }
        // Default to online if navigator API not available (SSR, etc.)
        return true;
    }

    /**
     * Handle browser online event.
     * Triggers immediate sync of pending operations.
     */
    private handleOnline(): void {
        console.log('[POS-Sync] Network restored');
        this.online = true;
        void setConfig(CONFIG_KEYS.LAST_MODE, 'online');
        this.notifyListeners();
        void this.processQueue();
    }

    /**
     * Handle browser offline event.
     * Pauses sync and updates status.
     */
    private handleOffline(): void {
        console.log('[POS-Sync] Network lost');
        this.online = false;
        void setConfig(CONFIG_KEYS.LAST_MODE, 'offline');
        this.notifyListeners();
    }

    // -------------------------------------------------------------------------
    // Polling
    // -------------------------------------------------------------------------

    /** Start periodic sync polling */
    private startPolling(): void {
        this.stopPolling();
        this.pollTimer = setInterval(() => {
            if (this.isOnline() && !this.isSyncing) {
                void this.processQueue();
            }
        }, SYNC_POLL_INTERVAL_MS);
    }

    /** Stop periodic sync polling */
    private stopPolling(): void {
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
    }

    // -------------------------------------------------------------------------
    // Query Helpers
    // -------------------------------------------------------------------------

    /**
     * Get operations eligible for processing:
     * - Status is PENDING
     * - nextRetryAt <= now
     */
    private async getEligibleOperations(): Promise<SyncOperation[]> {
        const allOps = await getSyncQueue();
        const now = Date.now();

        return allOps
            .filter((op) => op.status === 'PENDING' && op.nextRetryAt <= now)
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    }

    /**
     * Update the status of an operation in the sync queue.
     */
    private async updateOperationStatus(
        operationId: string,
        status: SyncOperation['status']
    ): Promise<void> {
        try {
            const db = await openDB();
            const tx = db.transaction('sync-queue', 'readwrite');
            const store = tx.objectStore('sync-queue');
            const existing = await new Promise<SyncOperation | undefined>((resolve, reject) => {
                const req = store.get(operationId);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });

            if (existing) {
                store.put({ ...existing, status });
            }

            await new Promise<void>((resolve, reject) => {
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
                tx.onabort = () => reject(tx.error);
            });
        } catch (error) {
            console.error(`[POS-Sync] Failed to update operation status: ${error}`);
        }
    }

    // -------------------------------------------------------------------------
    // Public Status Methods
    // -------------------------------------------------------------------------

    /**
     * Get the number of pending operations in the sync queue.
     */
    async getQueueSize(): Promise<number> {
        try {
            const queue = await getSyncQueue();
            return queue.filter((op) => op.status === 'PENDING').length;
        } catch {
            return 0;
        }
    }

    /**
     * Get the current sync status for UI consumption.
     */
    async getSyncStatus(): Promise<SyncStatus> {
        try {
            const queue = await getSyncQueue();
            const pending = queue.filter((op) => op.status === 'PENDING');
            const processing = queue.filter((op) => op.status === 'PROCESSING');
            const failed = queue.filter((op) => op.status === 'FAILED');

            const lastSyncAt = await getConfig(CONFIG_KEYS.LAST_SYNC_AT);

            return {
                isOnline: this.isOnline(),
                mode: this.isSyncing ? 'syncing' : (this.isOnline() ? 'online' : 'offline'),
                pendingCount: pending.length,
                syncingCount: processing.length,
                failedCount: failed.length,
                lastSyncAt: lastSyncAt,
                currentSyncItem: this.currentSyncItem,
            };
        } catch {
            return {
                isOnline: this.isOnline(),
                mode: 'offline',
                pendingCount: 0,
                syncingCount: 0,
                failedCount: 0,
                lastSyncAt: null,
                currentSyncItem: null,
            };
        }
    }

    // -------------------------------------------------------------------------
    // Status Listeners
    // -------------------------------------------------------------------------

    /**
     * Subscribe to sync status changes.
     * @returns Unsubscribe function
     */
    onStatusChange(listener: (status: SyncStatus) => void): () => void {
        this.statusListeners.push(listener);
        return () => {
            this.statusListeners = this.statusListeners.filter((l) => l !== listener);
        };
    }

    /** Notify all listeners of current status */
    private notifyListeners(): void {
        void this.getSyncStatus().then((status) => {
            for (const listener of this.statusListeners) {
                try {
                    listener(status);
                } catch {
                    // Don't let listener errors break the engine
                }
            }
        });
    }
}

// =============================================================================
// Standalone Functions (Public API)
// =============================================================================

/**
 * Trigger an immediate sync of all pending operations.
 * Returns the result of the sync run.
 */
export async function syncNow(): Promise<SyncResult> {
    const engine = SyncEngine.getInstance();
    return engine.processQueue();
}

/**
 * Get the current sync status.
 */
export async function getSyncStatus(): Promise<SyncStatus> {
    const engine = SyncEngine.getInstance();
    return engine.getSyncStatus();
}

/**
 * Start automatic sync (listens to online/offline events + periodic polling).
 */
export function startAutoSync(): void {
    const engine = SyncEngine.getInstance();
    void engine.start();
}

/**
 * Stop automatic sync and clean up all timers.
 */
export function stopAutoSync(): void {
    const engine = SyncEngine.getInstance();
    void engine.stop();
}
